# Plan — Chats par produit + nomenclature + anti self-notification

## 1. Nouvelle nomenclature des conversations (remplacer « Web #XXXXXX »)

Format proposé, basé sur l'article concerné par la discussion :

- Côté acheteur : `WAOUH·ACH-{ART4}-{USR3}` ex. `WAOUH·ACH-IPH7-AB1`
- Côté vendeur : `WAOUH·VEN-{ART4}-{USR3}` ex. `WAOUH·VEN-IPH7-AB1`
- Conversation générale (sans article) : `WAOUH·CHAT-{USR4}` (fallback actuel)

Où :
- `{ART4}` = 4 derniers caractères alphanum du `article.id` (uppercase)
- `{USR3}` = 3 derniers caractères du `waouh_user_id`/`web_session_id`

Implémentation dans `src/app-mobile/utils/chatLabel.ts` :
- Nouvelle fonction `formatMatchLabel({ articleId, userKey, role })` qui renvoie le code ci-dessus.
- `shortWebId` conservé mais renommé pour le fallback (`WAOUH·CHAT-…`).
- `convInitials` étendu pour gérer les nouveaux préfixes.
- `channelBadge` : remplacer le badge `Web` par `WAOUH` (couleur teal/emerald cohérente avec l'en-tête).

Tous les composants qui rendaient « Web #… » consommeront ces helpers (aucun littéral ailleurs).

## 2. Une fenêtre de chat par notification de match (acheteur trouvé / annonce trouvée)

Comportement attendu : à chaque notification `new_buyer` (côté vendeur) ou `match` (côté acheteur), ouvrir/raviver une fenêtre de chat sous la fenêtre WAOUH, persistée par produit et par rôle, avec tout l'historique des messages liés à ce produit.

Mécanique :
- `useWaouhMatchNotifications.ts` émet déjà `waouh:open-match-chat` avec `{ article_id, kind, title, price, city, photo }`. Étendre la détection pour inclure `match`, `match_buyer`, `match_seller`, `new_buyer` (déjà fait), et garantir l'émission systématique à l'arrivée d'une notif temps réel — pas seulement au clic.
- `WaouhMatchChats.tsx` ouvre la fenêtre, déjà en place. Améliorations :
  - Calculer la `key` comme `${role}:${article_id}:${counterpart_user_id ?? buyer_profile_id}` pour qu'un même article entre vendeur↔acheteur1 et vendeur↔acheteur2 produise deux fenêtres distinctes.
  - Titre de la fenêtre = `formatMatchLabel(...)` + 1 ligne contexte (titre annonce + prix).
  - Persistance déjà en `localStorage` ; ajouter un purge max 10 + ordre récent en tête.
- `WaouhMatchChatWindow.tsx` :
  - Charger l'historique via la fonction `waouh-history` filtré par `meta.article_id = article_id` ET par `counterpart` (vendeur ↔ acheteur précis), pour ne pas mélanger les fils.
  - Realtime : abonnement filtré par `web_session_id` ou `user_id`, puis filtre client `meta.article_id === article_id && meta.buyer_profile_id === ...`.
  - À chaque envoi, propager `meta: { article_id, buyer_profile_id, role }` dans `waouh-channel-in` pour que les messages restent rattachés au bon fil.

## 3. Anti self-notification (l'utilisateur ne voit plus ses propres notifs)

Cause racine : dans `waouh-notify-buyers`, quand un `waouh_buyer_profiles.user_id` est identique à `article.seller_id` (même personne est vendeur ET a un profil d'achat), le matcher dispatch les deux notifs sur la même personne.

Correctifs :
- `supabase/functions/waouh-notify-buyers/index.ts` : ignorer `p` si `p.user_id === article.seller_id` OU si `p.contact_phone` correspond au téléphone du vendeur (`waouh_users` du seller).
- `supabase/functions/waouh-notify-dispatch/index.ts` : garde-fou final — si `notifTargetUserId === article.seller_id` et `recipient === 'buyer'`, abandonner (et inversement). Empêche aussi les régressions futures.
- Filtre côté client en lecture seule dans `useWaouhMatchNotifications.ts` et `useWaouhInbox.ts` : masquer toute notif dont le `payload.recipient === 'seller'` quand l'utilisateur courant n'est pas le seller, et symétriquement pour `'buyer'`. Sert de garde-fou UI.

## 4. Fichiers touchés

- `src/app-mobile/utils/chatLabel.ts` (nouvelle nomenclature WAOUH)
- `src/components/waouh/WaouhMatchChats.tsx` (key par produit + counterpart, titre WAOUH·…)
- `src/components/waouh/WaouhMatchChatWindow.tsx` (filtre historique par counterpart, meta envoyée)
- `src/components/waouh/WaouhUnifiedInbox.tsx` (labels via helper)
- `src/hooks/useWaouhMatchNotifications.ts` (ouverture systématique + filtre self)
- `src/hooks/useWaouhInbox.ts` (filtre self)
- `supabase/functions/waouh-notify-buyers/index.ts` (skip self)
- `supabase/functions/waouh-notify-dispatch/index.ts` (garde-fou self)

Aucune migration SQL nécessaire ; tout est traitable au niveau dispatch + UI.

## 5. Validation

- Publier une annonce avec un compte qui a aussi un profil d'achat correspondant → aucune notification reçue par soi-même.
- Recevoir une notif `new_buyer` → ouvre `WAOUH·VEN-…` sous WAOUH avec historique du produit.
- Recevoir une notif `match` → ouvre `WAOUH·ACH-…` sous WAOUH avec historique du produit.
- Deux acheteurs distincts sur la même annonce → deux fenêtres séparées côté vendeur.
