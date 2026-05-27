## Objectif

Unifier l'expérience chat de l'app mobile :
1. Liste de conversations avec libellés humains (au lieu de `web:<uuid>`).
2. Page conversation `/app/chat/:id` qui charge réellement l'historique et permet de répondre, peu importe la source.
3. Page WAOUH `/app/chat/waouh` qui charge l'historique complet de l'utilisateur, avec le même fond doodle que les autres chats.

---

## 1. `ChatListScreen.tsx` — libellés et centralisation

Remplacer l'affichage brut `c.phone_number ?? "Inconnu"` (qui tombe sur l'UUID parce que `phone_number` contient `web:<uuid>` pour les sessions web) par un libellé dérivé de `channel` + jointure légère sur `waouh_users` :

- Étendre le `select` pour récupérer `user_id` puis charger en lot `waouh_users(id, display_name, phone_number, channel, auth_user_id)` pour tous les `user_id` distincts.
- Fonction `formatConvLabel(conv, user)` :
  - `channel === "whatsapp"` → numéro WhatsApp formaté (`+229 97 12 34 56`), avatar avec initiales du numéro.
  - `channel === "app"` / utilisateur authentifié → `display_name` ou e‑mail du profil, avatar avec initiales du nom.
  - `channel === "web"` ou fallback → ID court stable : `Web #` + 6 derniers caractères de l'UUID en majuscules (ex. `Web #5AB`), avatar coloré.
- Le sous-titre reste `last_message`, l'horodatage reste `formatStamp(updated_at)`.
- Forcer le listing exhaustif : conserver la fusion `waouhUserIds` + sessionId, mais augmenter `limit` à 200 et inclure aussi les conversations où `auth_user_id` du `waouh_users` lié = `user.id` (déjà couvert par `waouhUserIds`, on s'assure juste que le hook renvoie bien tous les `waouh_users` du compte, y compris ceux à canal `whatsapp` et `app`).
- Recherche : étendre le filtre à label + last_message.

## 2. `ChatScreen.tsx` — historique visible et réponses universelles

La page est blanche parce qu'aucune ligne `waouh_messages` n'a `conversation_id` rempli pour les vieilles conversations web. Correctifs :

- Étendre le `select` : `direction,text,created_at,attachments,channel,phone_number,web_session_id,user_id`.
- Charger l'historique avec un `OR` :
  - `conversation_id.eq.<id>`
  - `phone_number.eq.<meta.phone_number>` (couvre WhatsApp et web où l'id de session est stocké dans `phone_number` comme `web:<uuid>`)
  - `web_session_id.eq.<sessionId>` quand `meta.phone_number` ressemble à `web:<sessionId>`
  - `user_id.eq.<meta.user_id>` (waouh_users.id de la conversation)
- Trier `created_at asc`, dédupliquer par `id`.
- Réabonnements realtime : un canal par filtre actif (`conversation_id`, `phone_number`, `user_id`) pour capter les nouveaux messages quelle que soit la source.
- En-tête : afficher le même `formatConvLabel` que la liste + badge canal (Web / WhatsApp / App).
- Envoi : conserver la logique actuelle, mais router selon `meta.channel` :
  - `whatsapp` → edge function `waha-send-message` (déjà présent).
  - `web` / `app` → insert dans `waouh_messages` + appel `waouh-webhook` pour que l'IA réponde (même mécanique que WAOUH).
- Appliquer la classe `waouh-chat-bg` (déjà en place) — vérifier que `min-h-[100dvh]` n'écrase pas le fond.

## 3. `WaouhChatScreen.tsx` — historique + fond unifié

- Passer un fond `waouh-chat-bg` au conteneur de `WaouhWebChat` (variant native) en remplaçant la photo de fond actuelle.
- Dans `WaouhWebChat.tsx` (chargement historique L86–144) :
  - Remplacer le filtre `user_id.eq.<auth.uid()>` par `user_id.in.(<waouhUserIds>)` en utilisant le hook `useWaouhIdentity` (la colonne `user_id` référence `waouh_users.id`, pas `auth.users.id` — d'où l'historique vide).
  - Conserver le filtre session, fusionner les deux résultats, dédupliquer par `id`, trier `created_at asc`, `limit 500`.
  - Abonnements realtime : un canal par `waouh_users.id` + un canal session.
- Vider l'affichage "vide" uniquement quand `loading=false && messages.length===0`.

## 4. Fond chat par défaut

- Conserver `src/app-mobile/theme/chat-bg.css` (`waouh-chat-bg`) comme fond officiel.
- L'appliquer dans : `ChatScreen` (déjà), `WaouhChatScreen` (nouveau), et au panneau `WaouhWebChat` variant `native` (remplacer le fond image actuel).
- Ne pas modifier `waouh-chat-list-bg` (fond plus léger de la liste).

---

## Fichiers touchés

- `src/app-mobile/screens/ChatListScreen.tsx`
- `src/app-mobile/screens/ChatScreen.tsx`
- `src/app-mobile/screens/WaouhChatScreen.tsx`
- `src/components/waouh/WaouhWebChat.tsx` (uniquement le chargement historique + fond panel native)
- `src/app-mobile/hooks/useWaouhIdentity.ts` (exposer aussi les `waouh_users` complets pour récupérer `display_name`/`phone_number`/`channel` côté liste)

Aucune migration SQL nécessaire — toutes les colonnes utilisées existent déjà (`waouh_users.display_name`, `phone_number`, `channel`, `auth_user_id`).
