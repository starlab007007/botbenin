---
name: WAOUH Correlation ID (traçabilité bout en bout)
description: correlation_id déterministe reliant notification, ouverture de fenêtre, messages envoyés/reçus et article, par acheteur et vendeur
type: feature
---
- Format déterministe : `corr_<article8>_<role>_<counterpart8|any>` — généré côté client par `correlationIdFor()` dans `src/components/waouh/waouhCorrelation.ts`, reconstructible côté serveur.
- Colonne `public.waouh_trace_events.correlation_id` (text, indexée avec created_at).
- Stages UI : `ui_notification_click`, `ui_window_open`, `ui_message_sent`, `ui_message_received` — envoyés en fire-and-forget via l'edge function `waouh-trace-ui` (service role, verify_jwt=false, whitelist de stages `ui_*`, fonctionne pour sessions anonymes).
- Propagation : `notificationActions` ajoute `correlation_id` au détail `waouh:open-match-chat` → `useWaouhMatchChats` → `WaouhMatchChatWindow` (meta de `waouh-channel-in`) → meta des messages sortants + réponse JSON → `_shared/waouh-sync.ts` et `_shared/waouh-trace.ts` (champ `correlation_id`).
- Jamais bloquant : toute erreur de trace est silencieuse.
