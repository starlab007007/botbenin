
## Audit Sécurité & Hardening Production WAOUH

Objectif : passer la plateforme en production en corrigeant les failles critiques détectées par le scanner, fiabiliser le module chat (cœur business) et améliorer la performance/observabilité.

## 1. Constat du scan sécurité

**🔴 ERREURS critiques (à corriger avant prod — 8 failles)**

| # | Faille | Risque |
|---|---|---|
| 1 | `waouh_users` lisible publiquement via `web_session_id IS NOT NULL` | Tous les téléphones, villes, GPS exposés à l'anonyme |
| 2 | `waouh_messages` idem | Tous les messages de chat exposés (1974 lignes) |
| 3 | `waouh_notifications` idem | 619 notifications utilisateurs exposées |
| 4 | `waouh_notifications` UPDATE `USING true` | N'importe qui peut marquer lu/non lu |
| 5 | `waouh_outbound_queue` SELECT `USING true` | 1126 messages sortants + n° téléphones exposés |
| 6 | `payment_transactions` lisible si `user_id IS NULL` | Paiements invités exposés (téléphones, montants) |
| 7 | `ia_creator_user_usage` UPDATE `USING true` | Reset des compteurs d'un autre user → contournement quotas |
| 8 | `public-media` bucket DELETE public | N'importe qui peut supprimer les fichiers |

**🟡 WARNINGS importants**
- `anonymous_visitor_sessions` UPDATE `USING true` (lead_info PII)
- `ia_creator_user_usage` INSERT sans check `user_id = auth.uid()`
- Realtime channels sans auth → tout user authentifié écoute toutes les notifs
- `LEAKED_PASSWORD_PROTECTION` désactivé (config Supabase)
- OTP expiry trop long (config Supabase)
- Postgres patches sécurité dispo (upgrade)
- Plusieurs fonctions SQL sans `search_path` immutable

## 2. Plan d'action — 4 phases

### Phase 1 — Corrections RLS critiques (1 migration)

Politiques à réécrire avec validation par header `x-waouh-session-token` (pattern déjà en place sur `waouh_outbound_queue` côté token) ou `auth.uid()` :

- `waouh_users` : SELECT scope = `auth_user_id = auth.uid()` OU header session validé
- `waouh_messages` : SELECT scope = appartenance à la conversation du user authentifié OU header session
- `waouh_notifications` : SELECT + UPDATE scope = `user_id IN (SELECT id FROM waouh_users WHERE auth_user_id = auth.uid())`
- `waouh_outbound_queue` : SELECT scope = `to_user_id` du user OU header session validé
- `payment_transactions` : retirer la branche `auth.uid() IS NULL AND user_id IS NULL` — guest reads via edge function service_role uniquement
- `ia_creator_user_usage` : INSERT/UPDATE scope = `auth.role() = 'service_role'`
- `anonymous_visitor_sessions` : UPDATE scope = match token visiteur
- Storage `public-media` DELETE : `auth.uid()::text = (storage.foldername(name))[1]`

### Phase 2 — Hardening config & fonctions

- `ALTER FUNCTION ... SET search_path = public` sur toutes les fonctions SECURITY DEFINER existantes
- `REVOKE EXECUTE ... FROM anon` sur les fonctions DEFINER non-publiques
- Activer **Leaked Password Protection** + raccourcir OTP à 600s via mention au user (config Supabase Auth UI)
- Annoncer l'upgrade Postgres recommandé

### Phase 3 — Robustesse module chat (cœur business)

État actuel vérifié : `WAOUH Chat Sync Flow v1` est **verrouillé** (memory note `waouh-chat-sync-flow-locked-v1`). On ne touche PAS à la logique sync — on ajoute uniquement :

- **Retry queue** pour `waouh_outbound_queue` : exponentiel (5s, 30s, 5min, 1h) avec `max_attempts=5`, status `dead_letter` au-delà — déjà colonnes en place, créer un cron 30s qui drain
- **Dedup messages entrants** : index unique `(channel_message_id, channel)` sur `waouh_messages` pour éviter doublons WhatsApp/Telegram
- **Backpressure WAHA** : circuit breaker dans `waouh-whatsapp-send` (3 erreurs 500 consécutives → pause 60s)
- **Healthcheck étendu** : `/admin/waouh/health` affiche taux d'échec outbound 24h, latence webhook moyenne, signaux radar en attente, derniers `dead_letter`
- **Logs structurés** : remplacer `console.log` libres par `console.log(JSON.stringify({lvl,fn,evt,...}))` dans `waouh-webhook`, `waouh-radar-process`, `waouh-whatsapp-send`
- **Rate limit** côté edge : 10 messages/min/numéro entrant pour bloquer abus

### Phase 4 — Performance

- **Indexes manquants** (vérifiés via `slow_queries`) sur :
  - `waouh_messages(conversation_id, created_at DESC)`
  - `waouh_outbound_queue(status, next_attempt_at)` partiel `WHERE status IN ('queued','retry')`
  - `waouh_radar_signals(status, created_at)` partiel
  - `waouh_deals(status, created_at DESC)`
- **Realtime** : restreindre les channels publiés (notifications + whatsapp_messages) — ajout RLS sur `realtime.messages` scope par user
- **Frontend** : audit lazy-loading des routes admin lourdes (`/admin/waouh/*`) via React.lazy si pas déjà fait
- **Caches edge** : TTL 6h sur les analyses prix (déjà fait), 24h sur les FX rates

## 3. Validations de fin de chantier

- Re-run `security--run_security_scan` → 0 erreur, warnings résiduels documentés dans `security-memory`
- Test e2e chat : envoi WhatsApp → réception webhook → réponse IA → enregistrement (déjà couvert par `docs/waouh-e2e-test-2026-06-09.md`, à rejouer)
- Vérification `waouh-chat-sync-flow` health-check vert
- Sanity check : `curl` anonyme sur les tables ex-exposées → 0 ligne retournée

## 4. Hors scope de cette itération

- Réécriture de l'auth (Supabase auth déjà en place)
- Refonte UI (l'utilisateur veut prod, pas redesign)
- Migration Postgres (action manuelle Supabase dashboard — sera signalée)

## Question avant build

Ce chantier représente ~3-4 migrations SQL + édits dans 6-8 edge functions + 1-2 composants admin. Confirme :

**A) Tout en un seul gros chantier maintenant**, je migre toutes les Phases 1→4 dans ce build.

**B) Phase 1 (RLS critiques) en priorité absolue d'abord**, on valide ensemble puis on enchaîne 2-3-4.

Recommandation : **B** — la Phase 1 supprime les fuites de PII, on valide rapidement (le scanner doit retomber à 0 erreur), puis on enchaîne sans risquer de casser le chat.
