---
name: WAOUH Chat Sync Flow — Snapshot Locked v13
description: Isolation stricte 1 fenêtre = 1 article × 1 interlocuteur des DEUX côtés (buyer + seller). Le fil principal WaouhWebChat ne contient plus de négociation ; le moteur renvoie counterpart_user_id.
type: feature
---
## v13 (2026-07-30)

Règle verrouillée : **1 fenêtre WaouhMatchChatWindow = 1 article × 1 interlocuteur**, symétrique acheteur/vendeur.

Changements :
- `matchKey` symétrique : `art_<A>_buyer_<sellerId|any>` et `art_<A>_seller_<buyerId|any>`. Migration `waouh_keys_migrated_v4_`.
- `waouh-webhook` : nouvelle variable `returnedCounterpartId` (CONFIRM → seller.id, NEGOTIATE/DECIDE_* → otherId), renvoyée dans la réponse.
- `waouh-channel-in` : propage `counterpart_user_id` dans la réponse ET dans `waouh_messages.meta`.
- `WaouhWebChat` : `DEDICATED_INTENTS` (CONFIRM, NEGOTIATE, DECIDE_YES/NO, negotiation_open, match_*, deal_*, contact_exchange) → dispatch `waouh:open-match-chat` pour basculer la négo hors du fil principal.
- `WaouhMatchChatList` : clé pending-open scopée par counterpart pour les deux rôles.
- `WaouhMatchChatWindow` : filtre realtime counterpart pour les deux rôles + en-tête affichant l'interlocuteur et la réf. article.

Lock `v13` : 4 nouveaux invariants (webhookReturnsCounterpart, channelInForwardsCounterpart, webChatRedirectsNegotiation, matchHistoryBuyerCounterpart). 87/87 tests passent.
