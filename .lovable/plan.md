## Diagnostic du module Radar

### État réel (DB + fonctions)

| Indicateur | Valeur | Constat |
|---|---|---|
| Dernier signal capté | 2026-06-10 | **Aucun signal depuis ~20 jours** |
| Dernier scan source | 2026-05-15 | **Apify ne moissonne plus** |
| Signaux totaux | 87 | OK |
| Matches | **119** (> signaux) | **Anomalie : signaux re-traités en boucle** |
| Cron `radar-process-tick` | actif (*/5min) | OK |
| Cron `apify-tick` | actif (*/30min) | OK mais 0 résultat |
| SerpAPI config | `active=false` | Désactivé — scout dort |
| Apify config | `active=true`, quota 50 | OK mais acteurs invalides |
| Sources `site` (martistore, coinafrique) | actives | **Aucun scraper ne lit ce type** |
| `increment_radar_usage` RPC | absent | fallback manuel OK |

### Bugs identifiés

1. **Re-traitement infini des signaux** (`waouh-radar-process` l.272). Le filtre `status.eq.extracted OR promoted_article_id.is.null OR promoted_buyer_profile_id.is.null` re-sélectionne tout signal BUY déjà notifié (son `promoted_article_id` reste NULL) → duplication des matches/notifications. Fix : filtrer uniquement sur `status='extracted'`.

2. **Acteurs Apify incorrects** (`waouh-radar-apify` l.18). `apify~facebook-marketplace-scraper` n'existe pas sur Apify ; les vrais slugs sont `apify/facebook-groups-scraper` et `apify/facebook-marketplace-scraper`. Le `~` doit être `/`. → 0 signal depuis le déploiement.

3. **Sources de type `site` jamais scrapées.** Coinafrique, Martistore sont enregistrés mais aucun scraper ne traite `type='site'`. Soit on supprime ces sources, soit on ajoute un mini-scraper Firecrawl (préférable).

4. **SerpAPI désactivé en BDD** alors que la clé existe. Si on veut une vraie veille publique, il faut réactiver + tronquer l'ancien quota.

5. **`has_role(_user_id, _role_name text)`** : OK côté code, mais la convention projet veut `app_role` enum. Pas bloquant en prod, à harmoniser plus tard.

6. **Profils dupliqués possible** : `waouh_radar_profiles` upsert via SELECT puis INSERT sans contrainte unique sur `contact_phone` → race condition possible. Ajouter `UNIQUE(contact_phone)` + `ON CONFLICT`.

7. **Pas de garde-fou sur `waouh-radar-wa-webhook`** : aucune vérification de signature WAHA → n'importe qui peut injecter des signaux. Ajouter un secret partagé `WAHA_WEBHOOK_TOKEN`.

8. **`waouh_radar_signals.intent` UNKNOWN/NEGOTIATE** : capturés mais jamais mis à `status='notified'` → grossissent indéfiniment. Marquer `status='ignored'` quand intent non gérable.

9. **Outreach automatique** (`enqueueRadarOutreach`) : la dédup utilise `to_phone + template + 24h`. OK mais aucun lien avec `waouh_radar_contacts.id` lors du dédup → si le contact change de numéro, double envoi possible. Mineur.

10. **Téléphones bénin** : `normalizeBeninPhone` accepte 10 chiffres commençant par `01` (ancien format). Bon, mais ne gère pas le `+229 01 XXXXXXXX` (11 chiffres avec préfixe pays + 01). Edge-case.

### Améliorations recommandées avant prod

- **Observabilité** : panneau admin "Radar Health" affichant dernier scan, taux d'extraction (signals/scan), erreurs récentes (déjà tracées dans `waouh_trace_events`).
- **Backoff source en panne** : si `last_signal_count=0` pendant 5 ticks consécutifs, désactiver auto la source + alerte admin.
- **Scraper Firecrawl générique** pour les sources `type='site'` (Coinafrique, Jumia, Martistore) avec extraction structurée via Gemini (réutilise `_shared/waouh-keywords.ts` et le pattern de `waouh-price`).
- **Idempotence stricte** : ajouter contrainte UNIQUE `(source_type, raw_url)` sur `waouh_radar_signals` (le check actuel se fait via SELECT, race-condition possible sur scans parallèles).
- **Réactivation SerpAPI** si clé valide (sinon laisser off).
- **Rate-limit auto-outreach par campagne** : déjà 1/jour/contact, ajouter 3/semaine/contact global.

## Plan de correction (4 étapes)

### 1) Migration SQL
- `UNIQUE(source_type, raw_url) WHERE raw_url IS NOT NULL` sur `waouh_radar_signals`.
- `UNIQUE(contact_phone) WHERE contact_phone IS NOT NULL` sur `waouh_radar_profiles`.
- Activer SerpAPI (`UPDATE waouh_radar_api_configs SET active=true, usage_today=0 WHERE provider='serpapi'`).
- Désactiver les sources `type='site'` orphelines (ou les déplacer vers le nouveau scraper).
- Marquer les vieux signaux UNKNOWN comme `status='ignored'`.

### 2) `supabase/functions/waouh-radar-process/index.ts`
- Filtre signaux : `.eq('status','extracted')` uniquement.
- Mettre `status='ignored'` pour intents non SELL/BUY au lieu de les ignorer.
- Upsert `waouh_radar_profiles` avec `onConflict:'contact_phone'`.

### 3) `supabase/functions/waouh-radar-apify/index.ts`
- Corriger les slugs : `apify/facebook-groups-scraper` et `apify/facebook-marketplace-scraper`.
- Logger explicitement `[apify] actor=… input=… items=…` pour debug.
- Skip propre si `items` vide + update `last_signal_count=0`.

### 4) `supabase/functions/waouh-radar-wa-webhook/index.ts`
- Vérifier header `x-waouh-webhook-token` contre secret `WAHA_WEBHOOK_TOKEN` (à créer avec `generate_secret`).
- Renvoyer 401 si absent/incorrect.

### 5) Nouveau `supabase/functions/waouh-radar-site-scraper/index.ts`
- Lit toutes les sources `type='site' AND active=true`.
- Pour chaque URL : `firecrawl scrape` (markdown), extraction Gemini → insère dans `waouh_radar_signals` comme les autres scrapers.
- Cron `*/30 * * * *` (nouveau job pg_cron).

### 6) Vérification finale
- Appel manuel : `POST /functions/v1/waouh-radar-apify` puis `…/waouh-radar-process` puis check `waouh_radar_signals.status`.
- Vérifier qu'un signal SELL crée bien 1 seul `waouh_radar_matches` par buyer profile et 1 seule `waouh_notifications`.
- Confirmer absence de duplication après 2 ticks consécutifs.

## Détails techniques

- Aucun changement aux invariants verrouillés `waouh-chat-sync-flow-locked-v12` — le radar ne touche pas le miroir chat.
- Secret nouveau à provisionner : `WAHA_WEBHOOK_TOKEN` (32 chars random).
- Le nouveau scraper site utilise la clé `FIRECRAWL_API_KEY` déjà présente.
- Tests : ajouter `supabase/functions/waouh-radar-process/dedup.test.ts` qui simule 2 passes successives et vérifie `matches.length` stable.

Confirme-moi que je peux exécuter ce plan ; je ferai en plus une vérif live (curl edge function) à la fin.
