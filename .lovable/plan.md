
# 🟢 WhatsApp Diffusion v2 — WAHA natif, IA anti-spam, anti-ban

Objectif : transformer l'actuel formulaire qui pousse un webhook externe (`ia.bot.bj/form-campagne-wa-v2`) en **moteur de diffusion intégré**, propre à chaque utilisateur, qui pilote directement WAHA tout en respectant les règles WhatsApp officielles.

---

## 1. Architecture cible

```text
UI (/whatsapp-diffusion)
 ├─ Contacts       ──► Supabase: wa_contacts (par user_id)
 ├─ Listes/segments──► Supabase: wa_contact_lists
 ├─ Campagnes      ──► Supabase: wa_campaigns + wa_campaign_messages
 │                       │
 │                       ▼
 │              Edge fn  whatsapp-diffusion-enqueue
 │                       │ (création + jobs)
 │                       ▼
 │              Table   wa_send_jobs (queue, status, scheduled_at)
 │                       ▲
 │   pg_cron (30s) ─► Edge fn whatsapp-diffusion-worker
 │                       │  - lit N jobs "due"
 │                       │  - génère variante IA (Lovable AI)
 │                       │  - délai humain + heures actives
 │                       │  - appelle WAHA via waha-send-message
 │                       │  - met à jour statut + journal
 │                       ▼
 │              WAHA (texte / image / vidéo / audio / fichier)
 │                       │
 │   Webhook WAHA  ─►  waha-webhook  ─► maj delivered/read/replied
 └─ Historique / Conversations  ◄────── wa_send_jobs + whatsapp_messages
```

Tout passe par les edge functions internes (déjà : `waha-send-message`, `waha-webhook`, `waha-session-manager`). Le webhook externe `ia.bot.bj` devient **optionnel** (mode "legacy / n8n").

---

## 2. Base de données (nouvelle migration)

Tables, toutes scopées par `user_id` (RLS strict + GRANTs) :

| Table | Champs clés | Rôle |
|---|---|---|
| `wa_contacts` | `user_id`, `phone_e164` (unique par user), `phone_8` (legacy 8 chiffres), `phone_10` (post‑réforme `01…`), `display_name`, `tags text[]`, `is_whatsapp boolean`, `opt_out boolean`, `source` (manual/import/csv/vcard/wa_sync), `last_validated_at` | Carnet de contacts utilisateur |
| `wa_contact_lists` | `user_id`, `name`, `description`, `color` | Listes / segments |
| `wa_contact_list_members` | `list_id`, `contact_id` | N‑N |
| `wa_campaigns` | `user_id`, `name`, `type` (text/photo/video/audio/file), `body`, `media_url`, `media_mime`, `session_id` (FK whatsapp_accounts), `list_ids uuid[]`, `status` (draft/scheduled/running/paused/done/failed), `scheduled_at`, `throttle_per_hour int`, `min_delay_s`, `max_delay_s`, `active_hours_start time`, `active_hours_end time`, `ai_variation boolean`, `ai_prompt`, `stats jsonb` | Campagne |
| `wa_campaign_messages` | `campaign_id`, `variant_index`, `body`, `media_url` | Bibliothèque de variantes (spinning) |
| `wa_send_jobs` | `campaign_id`, `contact_id`, `to_phone`, `scheduled_at`, `status` (queued/sending/sent/failed/skipped/replied), `attempt int`, `last_error`, `waha_message_id`, `sent_at`, `delivered_at`, `read_at`, `replied_at` | File d'envoi + suivi unitaire |
| `wa_conversations` (vue) | dernier message par contact via `whatsapp_messages` | Onglet "Discussions" |

Index : `wa_send_jobs(status, scheduled_at)`, `wa_contacts(user_id, phone_e164)`.

Politique RLS : `auth.uid() = user_id` partout. Le worker tourne en service_role.

---

## 3. Normalisation Bénin (réforme 2021)

Helper unique côté client + edge (`src/lib/phone.ts` + `supabase/functions/_shared/waouh-phone.ts` déjà partiel) :

- Accepte `+229XXXXXXXX` (8) ou `+22901XXXXXXXX` (10).
- Stocke les **trois formes** : `phone_e164` canonique (`+22901XXXXXXXX` si dispo, sinon `+229XXXXXXXX`), `phone_8`, `phone_10`.
- Avant envoi WAHA : appel `POST /api/contacts/check-exists` (WAHA) → si la forme 10 chiffres n'est pas WhatsApp, retomber sur 8, sinon marquer `is_whatsapp=false` + `skipped`.
- Déduplication import = comparaison sur les 8 derniers chiffres.

---

## 4. Gestion des contacts (UI)

Onglet **Contacts** (composant `<DiffusionContactsTab/>`) :

1. **Ajout manuel** : champ `🇧🇯 +229` figé, validation live, tags, nom optionnel.
2. **Import intelligent** (réutilise `ImportWhatsAppContactsDialog` déjà créé) :
   - Coller texte (auto‑détection nom + numéro)
   - CSV / Excel (mapping colonnes)
   - vCard (.vcf export téléphone)
   - Pipeline : parse → normaliser → dédupliquer (contre Supabase) → preview (valides / invalides / doublons / déjà opt‑out) → insertion batch.
3. **Synchro WAHA "Mes contacts WhatsApp"** : edge fn `waouh-waha-sync-contacts` déjà existante → bouton "Importer depuis WhatsApp" qui appelle `/api/{session}/contacts` puis insère dans `wa_contacts` avec `source='wa_sync'`.
4. **Archivage / opt‑out / blacklist** : toggle par ligne, filtre dédié.
5. **Listes** : drag‑select multiple → bouton "Créer une liste".

---

## 5. Création de campagne (wizard 4 étapes)

| Étape | Contenu |
|---|---|
| 1 — Type & média | Choix Texte / Photo / Vidéo / Audio / Document. Upload vers `storage://wa-campaign-media/{user}/{uuid}`. Limites WAHA : photo 16 Mo, vidéo 64 Mo, audio 16 Mo. |
| 2 — Message | Éditeur avec variables `{nom}`, `{prenom}`, `{tag}`. Compteur 1024 car. Toggle **"Variantes IA anti‑spam"** : génère 3 à 5 reformulations via Lovable AI (`google/gemini-2.5-flash`) — stockées dans `wa_campaign_messages`. Aperçu WhatsApp live. |
| 3 — Audience | Sélection listes + contacts ad hoc. Affiche : total, déjà contactés <30j, opt‑out, "non WhatsApp" exclus. |
| 4 — Planification & anti‑ban | Session WAHA, date d'envoi, **plage horaire** (ex. 08h–20h Africa/Porto‑Novo), **débit max/h** (def. 30, max 100), **délai aléatoire** entre messages (def. 25‑75 s), **mode warm‑up** (10/h le 1er jour, +10/jour). Bouton "Visualiser" → estime durée totale. |

---

## 6. Anti‑ban & respect politique WhatsApp

Règles encodées dans le worker :

- **Throttle** : `throttle_per_hour` strict (token bucket par session_id).
- **Délai humain** : `sleep = random(min_delay_s, max_delay_s)` + jitter ±15 %.
- **Heures actives** : si hors plage, re‑schedule `scheduled_at = next_window_start`.
- **Variation IA** : sélection aléatoire d'une variante + insertion variable nominale → empêche le filtre Meta "même contenu N fois".
- **Stop sur réponse** : si `waha-webhook` reçoit un message entrant du `to`, on marque `replied` et on annule les jobs en attente pour ce contact (anti harcèlement).
- **Stop sur erreur globale** : >5 % échecs ou status WAHA `FAILED` → campagne `paused` + alerte toast/email.
- **Pre‑flight check** : vérif `wa_contacts.is_whatsapp` via `POST /api/{session}/contacts/check-exists` une seule fois (cache 30j).
- **Quiet retry** : 2 retries à 5 et 30 min puis `failed`.
- **Opt‑out automatique** : détection mots‑clés FR/Fon ("STOP", "ARRETE", "désabonne") dans webhook entrant → `opt_out=true`.

---

## 7. Edge functions à créer / adapter

1. `whatsapp-diffusion-enqueue` (nouveau) — POST `{campaignId}` : insère un `wa_send_job` par contact, calcule `scheduled_at` initiaux respectant throttle et heures.
2. `whatsapp-diffusion-worker` (nouveau, cron 30 s via `pg_cron` + `pg_net`) — claim de N jobs `for update skip locked`, choisit la variante, appelle `waha-send-message` interne, met à jour le job.
3. `whatsapp-diffusion-ai-variants` (nouveau) — POST `{body, count}` → Lovable AI (`google/gemini-2.5-flash`), renvoie variantes naturelles, même intention, ton inchangé.
4. `waha-send-message` (existante) — étendre `messageType` : `video`, `audio`, `voice`, `document`. Endpoints WAHA : `/api/sendVideo`, `/api/sendVoice`, `/api/sendFile`.
5. `waha-webhook` (existante) — router events `message`, `message.ack` (sent/delivered/read), `message.any` (réponses) → maj `wa_send_jobs`.

Cron :
```sql
select cron.schedule('wa-diffusion-worker','*/30 * * * * *', $$
 select net.http_post(url:='https://…/functions/v1/whatsapp-diffusion-worker',
  headers:='{"Content-Type":"application/json","apikey":"…"}'::jsonb, body:='{}');
$$);
```

---

## 8. UI/UX (page `/whatsapp-diffusion`)

Layout 3 onglets, design vert WhatsApp existant, responsive, mobile‑first :

- **📇 Contacts** — table + recherche, filtres (liste, tag, opt‑out, source), import, export CSV, archive.
- **📣 Campagnes** — cards par campagne avec stats live (barre progression, envoyés/lus/répondus/échecs), actions : Pause / Reprendre / Dupliquer / Relancer les échecs / Voir détail.
- **💬 Discussions** — vue inbox style WhatsApp : liste de threads (issus de `whatsapp_messages`), ouverture → composer pour répondre en 1‑1 (réutilise `waha-send-message`).

Détail campagne : timeline d'envoi, courbe livraison vs lecture, tableau par contact (status, heure, message envoyé, lien WhatsApp `wa.me/`). Bouton **"Relancer les non‑lus dans 48h"** (clone campagne sur audience filtrée).

Pour les libellés/CTA, vert `#075E54`, accents `#25D366`, badges status colorés. Tous les dialogs en `max-h-[100dvh]` mobile.

---

## 9. Détails techniques (section technique)

- **AI** : Lovable AI Gateway, modèle `google/gemini-2.5-flash`, prompt système : *"Reformule en français du Bénin, garde l'intention et les variables {nom}/{tag}, max 900 caractères, ton naturel, pas d'emoji ajouté hors source"*.
- **Variables** : remplacement côté worker via regex `\{(\w+)\}`.
- **Storage** : bucket privé `wa-campaign-media`, URL signée 24 h passée à WAHA (`file.url`).
- **Token bucket** : table `wa_rate_buckets(session_id, window_start, count)` + lock advisory `pg_try_advisory_xact_lock(hashtext(session_id))`.
- **Sécurité** : RLS `auth.uid()=user_id`, edge `waha-send-message` revérifie ownership session (déjà OK). Worker en service_role mais filtre toujours par `user_id` du job.
- **Observabilité** : table `wa_campaign_events(campaign_id, level, message, payload)` + log streaming dans le détail.
- **Tests** : Deno test sur worker (mock WAHA), unit test `normalizeBeninPhone` (8↔10 + edge cases `00229`, espaces, `.`).

---

## 10. Livraison par phases

1. **Phase A — Fondations (1 sprint)** : migration tables, normalisation Bénin, onglet Contacts complet (manuel + import + WAHA sync), RLS.
2. **Phase B — Moteur d'envoi (1 sprint)** : `enqueue` + `worker` + cron + extension `waha-send-message` (vidéo/audio), UI campagne basique texte/photo, suivi temps réel.
3. **Phase C — Anti‑spam IA & anti‑ban (1 sprint)** : variantes IA, throttle/heures/warm‑up, opt‑out auto, stop‑on‑reply.
4. **Phase D — Discussions & relances (1 sprint)** : inbox 1‑1, relances ciblées, exports/analytics, alertes.

Le webhook `ia.bot.bj` est conservé en option (toggle "Mode legacy n8n") pour ne rien casser pendant la transition.

---

✅ Résultat : chaque utilisateur dispose de **son carnet de contacts WhatsApp normalisé Bénin**, peut lancer des campagnes **texte / photo / vidéo / audio** depuis sa propre session WAHA, avec **variation IA + délais humains + heures actives** pour rester conforme à WhatsApp, suivre l'historique, relancer et **discuter** directement avec les répondants.
