# Plan — WAOUH Chat: Mobile Fix + Photos d'annonce + Notifications matching temps réel

## 1. Bug : champ de saisie invisible sur mobile

### Cause
Dans `WaouhChatPage.tsx` (mobile), un header de 48px est rendu au-dessus de `<WaouhWebChat fullscreen />`. Mais en mode `fullscreen`, le composant force `h-[100dvh]` (= toute la hauteur du viewport). Résultat : le panel dépasse de 48px vers le bas, et le `<form>` d'input tombe sous la zone visible (sous la barre de navigation Android).

### Correctif
- Dans `src/components/waouh/WaouhWebChat.tsx`, remplacer en mode `fullscreen` `h-[100dvh]` par `h-full` (le parent gère déjà le `flex-1 min-h-0` et la safe-area).
- Garder `pb-[env(safe-area-inset-bottom)]` sur le panel pour la barre système iOS/Android.
- Vérifier que la zone de scroll des messages a `min-h-0` afin que le footer (input) reste collé en bas et toujours visible.

## 2. Publication d'annonce avec 1 à 2 photos

### Frontend (déjà 80% en place)
- `WaouhWebChat` permet déjà l'upload via `Paperclip` → bucket `waouh-uploads`. À ajuster :
  - Limiter à **2 photos max** (désactiver le bouton si `pendingAtts.length >= 2`, toast si dépassé).
  - Accepter sélection multiple (`multiple` sur l'input file, boucle sur `e.target.files`).
  - Afficher un compteur "1/2" sous la zone d'aperçu.

### Backend
- `waouh-channel-in` reçoit déjà `attachments` et les persiste dans `waouh_messages.attachments`.
- `waouh-sell-handler` (utilisé par le router quand l'intent = SELL) accepte `photos[]` mais le webhook actuel ne les transmet pas. À corriger :
  - Dans `waouh-webhook` (route SELL), passer `attachments.map(a => a.url)` comme `photos` à `waouh-sell-handler`.
  - `waouh_articles.photos` (text[]) déjà présent → rien à migrer.
- Notification de matching à l'acheteur : enrichir le template `match_buyer` dans `waouh-outbound-dispatch` pour envoyer la 1ère photo via WAHA `sendImage` (si `photos[0]` présent) avec la légende. Fallback `sendText` si pas de photo.

## 3. Notifications temps réel pour matching (web + WhatsApp)

### Architecture proposée

```text
              ┌─────────────────────────┐
   match  →   │ waouh_outbound_queue    │ (déjà en place)
              └──────────┬──────────────┘
                         │
            ┌────────────┴─────────────┐
            ▼                          ▼
 waouh-outbound-dispatch       Realtime → Web
     (cron / trigger)        (postgres_changes)
            │                          │
            ▼                          ▼
     WAHA sendText/Image      Toast + Notification API
                              + Service Worker push
```

### A. Notification web temps réel (utilisateur sur le site)
- Utiliser **Supabase Realtime** sur `waouh_outbound_queue` filtré par `web_session_id` ou `user_id`.
- Nouveau hook `useWaouhMatchNotifications(sessionId, userId)` :
  - Souscrit aux INSERT où `template IN ('match_buyer','match_seller','negotiation_open','payment_link')`.
  - Affiche un toast cliquable + joue un son court.
  - Si `Notification.permission === 'granted'`, envoie une notification système via le **service worker existant** (`public/sw.js` est déjà enregistré).
  - Bouton « Activer les notifications » dans le header du chat (demande la permission).
- Monter le hook dans `WaouhChatPage` (mobile + desktop) et dans `App.tsx` pour les utilisateurs connectés (réception même hors page chat).

### B. Notification WhatsApp temps réel (utilisateur sur WhatsApp)
- Déjà partiellement en place : `waouh_outbound_queue` + `waouh-outbound-dispatch` envoient via WAHA.
- À ajouter :
  - **Trigger DB** `pg_notify` ou edge cron qui invoque `waouh-outbound-dispatch` toutes les 10s — OU mieux : appel direct depuis `waouh-webhook` après `waouh_enqueue_outbound` (push immédiat sans attendre le cron).
  - Côté `waouh-outbound-dispatch` : ajouter le support `sendImage` (template `match_buyer` avec photos).
  - Lier `waouh_users.phone_number` au `web_session_id` quand l'utilisateur entre son numéro → la même personne reçoit notif web ET WhatsApp.

### C. Schema (migration)
- Ajout colonne `waouh_outbound_queue.web_session_id text NULL` + index, pour permettre à un user web de recevoir l'évènement même sans phone.
- Ajout colonne `waouh_outbound_queue.image_url text NULL` (pour `sendImage` WAHA).
- RLS : lecture publique limitée à `web_session_id = current_setting('request.jwt.claims', true)::json ->> 'session_id'` — ou plus simple : lecture libre des lignes filtrées côté Realtime via clé `web_session_id` (pas de données sensibles, juste le template).

### D. UI
- Petit bandeau dans le chat : « 🔔 Activer les notifications de matching » → `Notification.requestPermission()`.
- Toast in-app sur réception (même quand l'onglet est actif).
- Notification système (sw.js `showNotification`) quand l'onglet est en arrière-plan.

## Fichiers touchés

- `src/components/waouh/WaouhWebChat.tsx` — fix `h-full`, multi-photos (limite 2).
- `src/pages/waouh/WaouhChatPage.tsx` — monter le hook notifications.
- `src/hooks/useWaouhMatchNotifications.ts` — **nouveau**.
- `public/sw.js` — handler `push` / `notificationclick` (si manquant).
- `supabase/functions/waouh-webhook/index.ts` — passer `photos` au sell-handler + push immédiat dispatch.
- `supabase/functions/waouh-outbound-dispatch/index.ts` — support `sendImage`, lecture `image_url`.
- Migration : `waouh_outbound_queue` + `web_session_id` + `image_url` + policy SELECT.

## Hors scope (ce ne sera pas fait)
- VAPID push web véritable (server push hors onglet) — utilise Notification API via service worker uniquement quand l'onglet vit. Peut être ajouté en phase 2 si besoin.
