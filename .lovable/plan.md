# Radar IA — Normalisation & Exploitation Programmée

## Objectif

Transformer l'onglet **Contacts Radar** d'un simple annuaire de notification one-shot en un véritable moteur d'engagement programmé :
1. **Normaliser** tous les numéros WhatsApp Bénin (avec/sans `01`, avec/sans `+`, ancien 8 chiffres) vers un format E.164 canonique unique.
2. **Dédupliquer** les contacts existants après normalisation.
3. **Exploiter** la donnée par segments (catégorie, ville, intention BUY/SELL, fraîcheur) avec **campagnes programmées récurrentes** : avis, annonces, recherches.
4. **Suivre** les performances (envois, réponses, opt-out, conversions) directement dans l'interface.

---

## Diagnostic actuel

État BDD constaté sur `waouh_radar_contacts` :
- `22900221128` (10 chiffres post-01) ✅ format moderne
- `22924152555` (10 chiffres mais sans `01` — ancien numéro 8 chiffres `24152555` préfixé brut) ❌ devrait être `22901241525` ? À arbitrer (voir question)
- `22900025000`, `22900000022` (10 chiffres avec `01`) ✅
- Aucun `+` initial → non strictement E.164
- Doublons potentiels entre variantes (ex. `22912345678` vs `2290112345678` vs `+22901XXXXXXXX`)

Conséquences :
- Les jointures avec `waouh_users`, `waouh_messages`, `waouh_outbound_queue` ratent certains contacts.
- Le bouton **Notifier** peut envoyer 2x au même humain.
- Aucune planification possible : seul envoi manuel one-shot existe.

---

## Plan — 4 chantiers

### 1. Normalisation E.164 Bénin (backend)

**Helper unique** `normalizeBeninPhoneStrict(raw)` (étend l'existant `normalizeBeninPhone`) :
- Retire espaces, tirets, parenthèses, `+`.
- Si 8 chiffres → préfixe `22901` (réforme ARCEP 2024).
- Si 10 chiffres commençant par `01` → préfixe `229`.
- Si 11 chiffres commençant par `229` + 8 chiffres → insère `01` après `229`.
- Si 13 chiffres `229XXXXXXXXXX` → garde tel quel.
- Sortie : `+229XXXXXXXXXXX` (toujours avec `+`, 14 caractères).
- Renvoie `null` si invalide (longueur ou préfixe non Bénin).

**Migration SQL** :
- Colonne `phone_e164_normalized text` (générée via trigger) + index unique.
- Backfill : recalcule pour chaque ligne existante.
- Fonction `merge_radar_contacts(target_phone)` : fusionne doublons (somme `signal_count`, union `categories`/`cities`, garde le plus ancien `first_seen_at`, le plus récent `last_seen_at`, conserve `status` le plus restrictif `opted_out > blocked > opted_in > new`).
- Trigger `BEFORE INSERT/UPDATE` sur `waouh_radar_contacts` qui normalise automatiquement.

Mise à jour de toutes les edge functions qui écrivent dans cette table (`waouh-radar-api-config` action `contacts_sync`, `waouh-radar-process`, `waouh-serpapi-scout`) pour utiliser le helper strict.

### 2. Schéma de campagnes programmées

Nouvelles tables :

```text
waouh_radar_campaigns
  id, name, mode (announcement|search|notice|reminder),
  message_template (texte avec {{display_name}}, {{ville}}, etc.),
  article_id (nullable), media_url (nullable),
  segment jsonb (filtres : categories[], cities[], intent, status, min_signals, last_seen_within_days),
  schedule jsonb (type: one_shot|daily|weekly|cron, hour, days_of_week, timezone),
  rate_limit_per_hour int, max_per_contact_per_week int,
  next_run_at, last_run_at, status (draft|active|paused|done),
  created_by, created_at, updated_at

waouh_radar_campaign_runs
  id, campaign_id, started_at, finished_at,
  contacts_targeted, contacts_sent, contacts_skipped, errors jsonb

waouh_radar_campaign_sends
  id, campaign_id, run_id, contact_id, phone_e164,
  status (queued|sent|delivered|read|replied|failed|opted_out),
  outbound_queue_id, sent_at, response_at, error
```

Indexes sur `(campaign_id, contact_id, sent_at)` pour respecter `max_per_contact_per_week`.

### 3. Edge functions

- `waouh-radar-campaign-manager` (admin only) — CRUD campagnes : `list / create / update / pause / resume / duplicate / preview_segment` (renvoie le nombre de contacts matchés sans envoyer).
- `waouh-radar-campaign-tick` (cron toutes les 5 min via `pg_cron`) — sélectionne campagnes `active` dont `next_run_at <= now()`, résout le segment, applique rate limit & cap hebdo par contact, enfile dans `waouh_outbound_queue` (template `radar_broadcast`), crée la run, planifie `next_run_at` selon `schedule`.
- `waouh-radar-campaign-stats` — agrégats par campagne (taux envoi/réponse/opt-out) pour dashboard.
- Hook côté `waouh-webhook` : quand un opt-out ("STOP") arrive d'un numéro listé dans `waouh_radar_contacts`, marque `status=opted_out` et annule les sends `queued` liés.

### 4. UI — onglet Contacts Radar enrichi

Sur la page actuelle (`/admin/waouh?tab=radar`) :
- **Bandeau diagnostic normalisation** : "X numéros invalides, Y doublons fusionnables" + bouton **Lancer la normalisation**.
- Nouveau sous-onglet **Campagnes programmées** :
  - Tableau campagnes (nom, mode, segment résumé, fréquence, prochaine exécution, sends total, taux réponse, statut).
  - Bouton **Nouvelle campagne** → drawer avec :
    1. Type : Avis / Annonce / Recherche / Relance
    2. Sélecteur segment (catégories multi, villes multi, intention, min signaux, vu il y a < N jours) + compteur live.
    3. Composer message (variables disponibles + aperçu rendu).
    4. Planification : Une fois maintenant / Programmé à date / Récurrent (quotidien/hebdo + heure + jours).
    5. Garde-fous : envois/h max, max envois/contact/semaine.
  - Détail campagne : timeline des runs, échantillon de sends, bouton Pause / Dupliquer.
- Sur la liste contacts existante : ajout colonne **Dernier broadcast** + filtre "jamais contacté par campagne X".

---

## Détails techniques

- **Cron** : `select cron.schedule('radar-campaign-tick', '*/5 * * * *', $$select net.http_post(...)$$);`
- **Variables template** : `{{display_name}}`, `{{ville}}`, `{{categorie_top}}`, `{{article_title}}`, `{{article_price}}`, `{{lien}}`.
- **Anti-spam** : check unique `(campaign_id, contact_id, week_iso)` pour respecter cap hebdo ; respect global `status IN ('opted_in','new')` (jamais `opted_out`/`blocked`).
- **Rate limit global** : réutilise `wa_rate_buckets` existant.
- **Sécurité** : toutes les edge functions vérifient `has_role(auth.uid(), 'admin')` via le helper corrigé précédemment.
- **GRANTs** : `authenticated` SELECT/INSERT/UPDATE sur campaigns (via policy admin) ; `service_role` ALL.

---

## Questions avant implémentation

1. **Numéros 8 chiffres legacy** (ex. `22924152555`) : faut-il les considérer comme déjà `01XXXXXXXX` post-réforme (donc `22924152555` reste tel quel) **ou** les réécrire en `22901XXXXXXXX` (insérer `01`) ? Ceci dépend de la date du scrape.
2. **Plafond par défaut** par contact : ok pour **1 message max / 7 jours / campagne** et **3 messages max / 7 jours toutes campagnes confondues** ?
3. **Templates de campagne pré-fournis** : je crée 3 templates seed (Avis vendeurs, Nouvelle annonce, Recherche acheteur) ou laisse vierge ?
4. **Programmation** : besoin de récurrence cron avancée (ex. "tous les lundi et jeudi à 10h") ou daily/weekly suffit pour la v1 ?
