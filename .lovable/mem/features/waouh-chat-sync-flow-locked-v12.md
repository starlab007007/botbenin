---
name: WAOUH Chat Sync Flow — Snapshot Locked v12
description: Multi-fenêtres WaouhMatchChatWindow par (article, acheteur) côté vendeur App + propagation counterpart_user_id end-to-end (notify-dispatch dedup, match-history filter, realtime filter, pushToOther meta). Couvre A/B/C.
type: feature
---
## v12 (2026-06-10)

Verrouillé : 1 WaouhMatchChatWindow par (article, acheteur) côté vendeur App. Côté acheteur App : 1 fenêtre par article (inchangé). Vrai pour les 3 scénarios A/B/C.

Changements :
- `matchKey(articleId, role, counterpartId?)` : seller → `art_<A>_seller_<cp|any>`, buyer → `art_<A>_buyer`. Migration v3 conserve l'historique.
- `waouh-notify-dispatch` : `counterpart_user_id` propagé dans dedupe (queue WA + waouh_notifications) + payload + payloadExtra pushSyncedEvent. 2 acheteurs distincts sur le même article le même jour → 2 notifications.
- `waouh-match-history` : nouveau param `counterpartUserId`. Seller history filtré sur `meta.counterpart_user_id || meta.buyer_user_id || user_id` du buyer.
- `WaouhMatchChatWindow` : realtime drop si `match.kind==="seller" && counterpart mismatch`. Envoie `counterpartUserId` à waouh-match-history.
- `pushToOther` (webhook + router) : injecte automatiquement `counterpart_user_id` (originator) dans `waouh_messages.meta`.

Lock `v12` : 6 nouveaux invariants (matchKeyPerCounterpart, notifyDispatchCounterpart, matchHistoryCounterpart, chatWindowCounterpartFilter, webhookPushToOtherCounterpart, routerPushToOtherCounterpart). 78/78 tests passent.
