# Audit — isolation des fenêtres de chat WAOUH

## Ce qui est déjà correct (vérifié dans le code)

- `useWaouhMatchChats.matchKey()` : côté vendeur la clé est `art_<article>_seller_<acheteur>`, côté acheteur `art_<article>_buyer`. Une fenêtre par (article, acheteur) côté vendeur existe donc déjà.
- `waouh-match-history` : filtre strict par propriété du message (session/`user_id`) + par article, et, pour le rôle vendeur, par `counterpartUserId` (`meta.counterpart_user_id || meta.buyer_user_id || user_id`).
- `WaouhMatchChatWindow` : le realtime rejette les inserts d'un autre article et, côté vendeur, ceux d'un autre acheteur. Les accusés « self-ack » de l'autre partie sont filtrés.
- Les notifications ouvrent bien une fenêtre : `notificationActions.openNotificationTarget`, `WaouhNotificationsBell`, `NotificationsScreen` et `WaouhMatchChatList` émettent tous `waouh:open-match-chat` avec `article_id` + `counterpart_user_id`.

## Les trous réels identifiés

1. **Le chat principal reste le lieu de la négociation acheteur.** `WaouhWebChat.tsx` ne contient aucun `dispatchEvent("waouh:open-match-chat")` ni traitement de `article_id`. Quand l'acheteur clique « intéressé 2 », la réponse du vendeur, les contre-offres et les accusés reviennent dans le fil principal — plusieurs articles se mélangent visuellement dans la même fenêtre. C'est la cause principale du ressenti « ça mélange les produits ».
2. **Clé acheteur non scoppée par contrepartie.** `art_<id>_buyer` suppose un seul vendeur par article ; pour les articles issus du catalogue partenaire / radar (même `article_id` mirroré), deux interlocuteurs peuvent retomber dans la même fenêtre.
3. **Bucket `_any` côté vendeur.** Si une notification arrive sans `counterpart_user_id` (anciens enregistrements, certains chemins WhatsApp), la fenêtre créée est `art_<id>_seller_any` : tous les acheteurs sans identifiant s'y agrègent.
4. **Aucun repère visuel d'isolation.** L'en-tête de la fenêtre n'affiche pas l'interlocuteur ni l'identifiant d'article, donc rien ne rassure l'utilisateur sur le périmètre de la conversation.

# Plan de correction

## Étape 1 — Ouvrir automatiquement une fenêtre dédiée dès l'intérêt acheteur
Dans `WaouhWebChat.tsx`, à la réception d'une réponse dont `meta.intent` vaut intérêt/négociation/match et qui porte un `article_id`, émettre `waouh:open-match-chat` (article, titre, prix, ville, photo, `counterpart_user_id` = vendeur, `kind: "buyer"`) et laisser dans le fil principal une carte « Discussion ouverte → » cliquable au lieu du fil de négociation. Le chat principal redevient recherche + orientation ; toute négociation vit dans sa fenêtre.

## Étape 2 — Scoper la clé acheteur par contrepartie
Passer `matchKey` à `art_<article>_buyer_<vendeur|any>` avec migration des clés `art_<id>_buyer` existantes vers le bucket `_any` (même mécanique que la migration v3 déjà en place), pour ne perdre aucun historique.

## Étape 3 — Garantir `counterpart_user_id` de bout en bout
- `waouh-buyer-interest`, `waouh-webhook` et `waouh-negotiation-router` : toujours écrire `meta.counterpart_user_id` (vendeur pour un message reçu par l'acheteur, acheteur pour un message reçu par le vendeur).
- `waouh-notify-dispatch` : refuser d'émettre une notification de match sans `counterpart_user_id` résolu (fallback = `seller_id` de l'article ou `buyer_user_id`).
- `waouh-match-history` : appliquer le filtre par contrepartie aussi au rôle acheteur.

## Étape 4 — Rendre l'isolation visible
En-tête de `WaouhMatchChatWindow` : photo + titre article, prix, et une ligne « avec <interlocuteur> · réf. <8 premiers car. de l'article> », plus un badge d'état (ouvert / négociation / conclu). La liste `WaouhMatchChatList` affiche un item distinct par (article, interlocuteur) avec le même libellé.

## Étape 5 — Vérification de bout en bout
Étendre `waouh-e2e-test` (parcours A/B/C) avec un scénario « 1 article, 2 acheteurs, + 1 second article » et des assertions : aucun message d'un article n'apparaît dans l'historique d'un autre, aucun message d'un acheteur dans la fenêtre d'un autre, et une notification par couple (article, acheteur). Ajouter ces invariants au verrou de synchronisation (`waouhChatSyncLock`) en v13.

## Détails techniques
- Fichiers front : `src/components/waouh/WaouhWebChat.tsx`, `useWaouhMatchChats.ts`, `WaouhMatchChatWindow.tsx`, `WaouhMatchChatList.tsx`, `notificationActions.ts`.
- Fonctions edge : `waouh-match-history`, `waouh-notify-dispatch`, `waouh-buyer-interest`, `waouh-webhook`, `waouh-negotiation-router`, `waouh-e2e-test`.
- Aucune migration SQL nécessaire : tout passe par `waouh_messages.meta` et les clés locales, avec migration des clés côté client.
