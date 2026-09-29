# Audit d'harmonisation — 29/09/2026

Référence : `prod` @ f9b240e4aca3046e4210a62ee41fd6bc96b95418 — Supabase `mvynepqulhflxtyymtzs`.
Constats en lecture seule ; aucune modification de production.

## Chaîne canonique à préserver
`catalog_id → article_id → thread_id → negotiation_id → deal_id`.
Une Deal Room n'est active qu'après résolution du thread canonique
(Flutter : `liveCanPromoteInterestedMatch`, bandeau « Connexion sécurisée » tant que le thread est vide ;
base : trigger `trg_waouh_resolve_message_thread`).
Pas de moteur métier parallèle côté Flutter : client de `waouh-commerce-action`.

## Interrupteurs Chat V3 en production (waouh_admin_module_controls)
| module_key | enabled | automation_enabled | updated_at (UTC) |
|---|---|---|---|
| chat_interest_fastpath | true | true | 2026-09-28 09:22 |
| chat_catalog_v3 | true | true | 2026-09-28 10:59 |
| commerce_action_v3 | true | true | 2026-09-28 12:45 |
| chat_router_v2 | true | true | 2026-09-28 11:00 |
| chat_writer_v2 | true | true | 2026-09-28 11:00 |
| chat_reconcile | true | false | 2026-09-27 16:31 |

## Migrations
- Base : 286 ; dépôt : 263 (+2 ajoutées par cette branche).
- Les migrations récentes ont des horodatages différents entre base et dépôt
  (ex. base 20260924125131 / dépôt 20260924004133) : historique à réconcilier avec
  `supabase migration repair`, jamais en rejouant du SQL sur la production.

## Edge Functions (135 déployées / 127 dans le dépôt)
Déployées, absentes du dépôt (24) : a, chat-webhook, setup-test-accounts, waha-agent-bridge,
waha-session-mobile, waouh-apresbac-chat, waouh-bots-backend-health-v1, waouh-chat-health,
waouh-diffusion-suggest, waouh-e2e-v3-relay, waouh-presence-checkin, waouh-presence-event-notify,
waouh-presence-public-page, waouh-presence-qr-create, waouh-presence-qr-preview, waouh-radar-nearby,
waouh-stock-alert-send, waouh-stock-ingest, waouh-stock-query, waouh-studio-agent-webhook-v2146,
waouh-studio-e2e-v21465, waouh-studio-pair-code-v2145, waouh-studio-pair-code-v21462, waouh-studio-user-api.

Appelées par Flutter alors qu'absentes du dépôt : waouh-apresbac-chat, waouh-diffusion-suggest,
waouh-presence-checkin, waouh-presence-qr-create, waouh-presence-qr-preview, waouh-radar-nearby,
waouh-stock-ingest, waouh-stock-query, waouh-studio-e2e-v21465, waouh-studio-pair-code-v21462,
waouh-studio-user-api.

Dans le dépôt, non déployées (16) : qosic-check-status, qosic-payment, qosic-webhook,
send-qualification-email-resend, waouh-agentic-core, waouh-chat-reconcile,
waouh-native-messaging-settings, waouh-native-simulator, waouh-payment-handler, waouh-tel-command,
waouh-tel-dispatch, waouh-tel-ingress, waouh-tel-invite, waouh-tel-open-messages,
waouh-tel-receipts, waouh-tel-room.
Point prioritaire : `chat_reconcile` est activé alors que `waouh-chat-reconcile` n'est pas déployée.

## Dépôt
- 103 branches distantes (38 feat, 29 fix, 12 backup, 5 edit, 3 release, tmp, test, local, main, prod…), aucun tag.
- 3 lockfiles Web : bun.lock, bun.lockb, package-lock.json.
- Fichiers à retirer après validation : dist-mobile/, flutter_waouh_app/lib/main.dart.bak_finalisation_waouh,
  __noop__, flutter_waouh_app/supabase/.
- 83 blocs `verify_jwt = false` dans supabase/config.toml : à auditer.
