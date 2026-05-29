
## Problèmes constatés

1. **Spam de notifications "acheteur intéressé"** dès qu'une annonce est publiée, sans qu'un acheteur ait réellement manifesté d'intérêt.
   - `waouh-notify-buyers` traite `keywords = []` comme « match tout » (`!p.keywords?.length` ⇒ true). Plusieurs profils vides en BDD déclenchent une notif sur chaque publication.
   - Des profils dupliqués (même user_id + même mot-clé) multiplient les notifs.
   - L'étiquette `new_buyer` (« acheteur trouvé ! ») est envoyée au vendeur dès qu'un mot-clé **enregistré** matche, ce qui n'est PAS un intérêt réel — l'acheteur n'a encore rien ouvert ni écrit.

2. **Les fenêtres de chat produit** (capture 1, `WAOUH·ACH-…`) n'apparaissent qu'à l'intérieur de l'écran WAOUH. Sur la liste des conversations (capture 2), il n'y a rien sous la carte WAOUH alors que l'utilisateur s'attend à voir chaque produit matché comme une **nouvelle conversation** ouvrable.

## Corrections proposées

### 1. Arrêter le spam (backend)

`supabase/functions/waouh-notify-buyers/index.ts` :
- **Exiger des keywords non vides** : `if (!p.keywords?.length) continue;` (un profil sans mot-clé ne reçoit plus rien).
- **Dédoublonner** par `(user_id, lower(keyword))` : ne dispatcher qu'une fois par utilisateur destinataire et par annonce.
- **Ne plus notifier le vendeur à la publication.** Supprimer le dispatch `kind: 'new_buyer'`. Le vendeur n'est notifié comme « acheteur intéressé » **que** lorsqu'un acheteur ouvre/écrit dans le chat produit (déclenché côté `waouh-channel-in` quand un inbound porte `meta.article_id` + role `buyer`, à condition que ce soit la première interaction sur ce couple article/acheteur).
- Garder la dispatch acheteur (`kind: 'match'`, recipient `buyer`) — c'est l'alerte légitime « ton mot-clé matche cette annonce ».
- Garde-fou existant `p.user_id === article.seller_id` reste en place.

Migration ponctuelle (one-shot) :
- Désactiver (`is_active = false`) les `waouh_buyer_profiles` où `keywords` est vide ou NULL.
- Dédupliquer les profils strictement identiques (même `user_id` + même set de keywords).

### 2. Notification d'intérêt réel (vendeur)

`supabase/functions/waouh-channel-in/index.ts` :
- Quand un message entrant porte `meta.article_id` et que l'expéditeur n'est pas le `seller_id`, déclencher `waouh-notify-dispatch` avec `kind: 'new_buyer'`, `recipient: 'seller'`, `buyer_profile_id` ou `counterpart_user_id`. Idempotent via un `dedupe_key = new_buyer:<article_id>:<buyer_key>` pour ne notifier qu'une seule fois par couple.

### 3. Chats produit visibles dans la liste (capture 2)

Nouveau composant `WaouhMatchChatList` injecté dans `ChatListScreen.tsx` **juste sous la carte WAOUH épinglée** :
- Source : même mécanisme que `WaouhMatchChats` (lecture `waouh_notifications` kind ∈ {`match`, `match_buyer`, `match_seller`, `new_buyer`} + persistance localStorage `waouh_open_matches_<sid>`).
- Affichage : une ligne par produit matché avec :
  - mini-photo article,
  - label `WAOUH·ACH-{ART4}-{USR3}` ou `WAOUH·VEN-…` (via `formatMatchLabel`),
  - titre + prix + ville,
  - badge « Nouveau » si non lu,
  - tap → navigation vers un écran dédié `/app/chat/match/:role/:articleId/:counterpart` (route nouvelle) qui réutilise `WaouhMatchChatWindow` en plein écran pour garder l'historique par produit.
- Côté vendeur : même liste, items générés à partir des notifs `new_buyer` reçues (un item par couple article+acheteur).

Conserver également `WaouhMatchChats` à l'intérieur de l'écran WAOUH (comportement actuel) pour les ouvertures immédiates depuis une notif push pendant qu'on chatte avec WAOUH.

### 4. UI nettoyage

- Ne plus afficher dans l'inbox unifiée (`useWaouhInbox`) les notifs `match` côté soi-même quand `payload.recipient` ne correspond pas au rôle de l'utilisateur (filtre déjà partiel — verrouiller).
- Sur l'écran vendeur : badge spécifique `WAOUH·VEN-…` (vert teal foncé) pour distinguer des chats acheteur.

## Fichiers touchés

- `supabase/functions/waouh-notify-buyers/index.ts` (skip empty keywords, dedupe, retirer dispatch seller)
- `supabase/functions/waouh-channel-in/index.ts` (dispatch `new_buyer` au premier inbound acheteur)
- 1 migration SQL (désactivation profils vides + déduplication)
- `src/components/waouh/WaouhMatchChatList.tsx` (nouveau, version "ligne" pour la liste)
- `src/app-mobile/screens/ChatListScreen.tsx` (montage sous la carte WAOUH)
- `src/app-mobile/screens/WaouhMatchChatScreen.tsx` (nouvel écran plein écran, réutilise `WaouhMatchChatWindow`)
- `src/AppMobile.tsx` (route `/app/chat/match/:role/:articleId/:counterpart`)
- `src/hooks/useWaouhInbox.ts` (filtre strict du recipient)

## Vérifications après build

- Publier une annonce avec un titre qui ne matche aucun keyword existant ⇒ 0 notif vendeur, 0 notif acheteur.
- Publier une annonce qui matche un keyword d'un autre utilisateur ⇒ 1 notif acheteur uniquement, vendeur silencieux.
- Quand l'acheteur ouvre la fenêtre produit et envoie un message ⇒ 1 et une seule notif `new_buyer` côté vendeur, ligne `WAOUH·VEN-…` apparaît dans sa liste.
- La carte produit (capture 1) apparaît bien comme ligne de conversation juste sous WAOUH (capture 2).
