## Objectif

Rendre le module Chat de l'application mobile 100% natif (UI Android autonome, sans WebView, sans ouverture de lien web), tout en restant synchronisé avec le backend Supabase existant (mêmes tables `waouh_conversations` / `waouh_messages`, mêmes données que le web).

## Comportement attendu

1. **Arrière-plan style WhatsApp adapté Waouh** — pattern doodle subtil teinté vert Waouh (`hsl(165 91% 18%)`) en très faible opacité sur la liste et l'écran de conversation, light & dark mode.
2. **Header natif** déjà en place (vert Waouh, avatar, recherche) — conservé tel quel.
3. **WAOUH épinglé en tête** de la liste (comme aujourd'hui), avec badge IA et "Toujours actif".
4. **Sous WAOUH : liste des notifications de chats** (autres conversations `waouh_conversations` de l'utilisateur), triées par `updated_at desc`, avec :
   - Avatar / initiales
   - Nom ou numéro
   - Dernier message tronqué
   - Heure (aujourd'hui) ou date
   - **Bulle verte avec le nombre de messages non lus** par chat (style WhatsApp)
5. **Compteur de non-lus** : pas de colonne `read_at` en base → on stocke `lastReadAt` par `conversation_id` dans `localStorage` (clé `waouh_chat_read_v1`). À l'ouverture de `/app/chat/:id`, on met à jour `lastReadAt = now()`. Le compteur = nb de `waouh_messages` où `direction='in'` ET `created_at > lastReadAt`. Calculé en une requête groupée au chargement + maintenu via Realtime.
6. **Bouton "Nouveau chat" (header + FAB + état vide)** → ouvre directement le chat WAOUH (`/app/chat/waouh`), plus la `NewChatSheet` (qui demandait un numéro). La création de conversations WhatsApp/téléphone reste accessible via un petit lien secondaire "Discuter avec un numéro" dans l'état vide, mais l'action primaire est WAOUH.
7. **Écran de conversation** (`ChatScreen`) : applique le même fond doodle Waouh, bulles style WhatsApp (déjà ok), marque la conversation comme lue à l'ouverture.
8. **Realtime déjà branché** sur `waouh_conversations` et `waouh_messages` → conservé, étendu pour incrémenter le badge non-lu en live quand un message `in` arrive sur une conv non ouverte.

## Détails techniques

**Fichiers modifiés**
- `src/app-mobile/screens/ChatListScreen.tsx`
  - Ajout fond doodle (`bg-[url(...)] bg-repeat` + tint), via classe utilitaire.
  - Nouvelle requête `select id, count(*)` sur `waouh_messages` (direction=in, created_at > lastReadAt par conv) groupée côté client après fetch des convs.
  - Hook local `useUnreadCounts(convs)` qui lit `localStorage`, calcule les non-lus, et écoute Realtime INSERT sur `waouh_messages` pour incrémenter.
  - Bulle non-lus à droite de chaque ligne (`bg-[hsl(165_91%_35%)] text-white rounded-full min-w-5 h-5 px-1.5 text-[11px]`).
  - Bouton `+` du header et CTA "Nouveau chat" de l'état vide → `navigate("/app/chat/waouh")` (au lieu d'ouvrir `NewChatSheet`).
  - État vide : message "Aucune autre conversation — démarrez avec WAOUH ☝️" + petit lien texte "Discuter avec un numéro WhatsApp" qui ouvre encore `NewChatSheet` (option secondaire conservée).
- `src/app-mobile/screens/ChatScreen.tsx`
  - Remplace `bg-[#ECE5DD]` par le fond doodle Waouh.
  - `useEffect` : à l'ouverture, écrit `lastReadAt = new Date().toISOString()` pour `convId` dans `localStorage`.

**Fichiers créés**
- `src/app-mobile/hooks/useUnreadCounts.ts` — lecture/écriture localStorage, calcul des non-lus, abonnement Realtime.
- `src/app-mobile/theme/chat-bg.css` — pattern SVG doodle Waouh (inline base64, très léger), classe `.waouh-chat-bg` appliquée sur les écrans chat. Importé depuis `mobile-theme.css`.

**Pas de changement backend** : aucune migration, mêmes tables, mêmes RLS, même flux d'envoi (`waouh_messages` insert + edge function `waha-send-message` pour WhatsApp). Synchronisation web ⇄ mobile inchangée.

**Pas de WebView** : tout est React natif rendu par Capacitor. Aucun `window.open`, aucun lien externe ouvert depuis ces écrans.

## Hors scope

- Pas de modification de `WaouhChatScreen` (déjà natif).
- Pas de modification des tables Supabase ni des edge functions.
- Pas de push notifications nouvelles (le système existant `useWaouhMatchNotifications` reste).
