## Objectifs

1. **Bridge backend `waha-webhook`** : pour chaque message WhatsApp entrant, créer/mettre à jour une conversation WA dédiée et insérer une notification in‑app.
2. **Chargement forcé** de l'historique conversationnel (messages + notifications) par utilisateur, déterministe et sans perte.
3. **Inbox unifiée App + WhatsApp** avec badge « nouveau » basé sur le statut lu/non‑lu par utilisateur.

---

## 1. Bridge backend `waha-webhook`

Le forwarding vers `waouh-channel-in` existe déjà (lignes 71‑83) mais ne crée pas de notification in‑app pour les messages WA simples (hors évènements de match). On ajoute donc deux écritures dans le pipeline :

**a) Table dédiée des conversations WA**
- Réutiliser `waouh_conversations` (déjà keyée `user_id + phone_number`) en y forçant `channel = 'whatsapp'` pour ce flux.
- Ajouter une colonne `unread_count INT DEFAULT 0` + `last_inbound_at TIMESTAMPTZ` + `last_direction TEXT` pour piloter le badge.
- Trigger Postgres `on insert waouh_messages` : si `direction = 'in'` → incrémenter `unread_count` et mettre à jour `last_inbound_at` + `last_message` sur la conversation correspondante. Si `direction = 'out'` → laisser intact (sauf reset à 0 quand on ouvre la conv).

**b) Notification in‑app par message WhatsApp entrant**
- Dans `waha-webhook` (après forward réussi vers `waouh-channel-in`, donc avec `inbound_message_id`/`conversation_id` disponibles), insérer dans `waouh_notifications` :
  ```
  notification_type = 'wa_inbound'
  channel = 'whatsapp'
  user_id = <waouh_users.id résolu via phone>
  payload = { text, from_phone, message_id, conversation_id }
  dedupe_key = `wa_inbound:<waha_message_id>` (anti rejouage WAHA)
  ```
- Le hook `useWaouhMatchNotifications` (Realtime déjà branché) le recevra sans modif côté DB.

**c) Idempotence**
- Continuer d'utiliser `waouh_processed_events` (déjà en place dans `waouh-channel-in`) pour la dédup des évènements WAHA + nouveau `dedupe_key` côté notif pour bloquer les doublons.

---

## 2. Forçage du chargement de l'historique par utilisateur

Symptôme actuel : si `waouh_users.id` lié change (nouveau device, login), les anciens messages ne s'affichent pas.

Solution :
- Nouvelle fonction Edge `waouh-history` (lecture seule) :
  - Entrée : `{ sessionId, authUserId? }`.
  - Résout **tous** les `waouh_users.id` liés (web_session_id ∪ auth_user_id ∪ phone_number du compte si présent).
  - Retourne `{ users: [...], messages: [...], notifications: [...], conversations: [...] }` avec :
    - messages : `waouh_messages` `or(web_session_id, user_id in)` (limit 1000, ordre asc).
    - notifications : `waouh_notifications` même filtre (limit 200, ordre desc).
    - conversations : `waouh_conversations` agrégée (user_id in) avec `unread_count`, `last_message`, `last_inbound_at`, `channel`.

- Côté front :
  - `WaouhWebChat` et `useWaouhMatchNotifications` appellent `waouh-history` à l'ouverture pour une réhydratation garantie (au lieu de plusieurs SELECT or() séquentiels), puis Realtime prend le relais.
  - Mécanisme de retry exponentiel (3 tentatives) + cache local (`localStorage.waouh_hydrate_<sessionId>`) pour survie offline/reload.

---

## 3. Inbox unifiée App + WhatsApp

Nouveau composant **`WaouhUnifiedInbox.tsx`** (et route `/app/chat/inbox` accessible depuis `WaouhChatScreen` via bouton "Inbox") :

- Liste des conversations issues de `waouh-history.conversations`, triées par `last_inbound_at` desc.
- Chaque ligne :
  - Avatar (initiale ou photo article si lié) + nom/numéro
  - Badge canal : `App` (cyan) ou `WhatsApp` (vert)
  - Dernier message tronqué
  - Heure relative
  - **Badge « nouveau » rouge** = `unread_count > 0`
- Clic → ouvre la fenêtre de discussion correspondante :
  - Conv WAOUH classique → `WaouhWebChat` (mode focus conv)
  - Conv match → fenêtre `WaouhMatchChatWindow` dans la pile
- À l'ouverture d'une conversation : RPC `waouh_mark_conversation_read(conv_id)` (security definer) qui :
  - `update waouh_conversations set unread_count = 0`
  - `update waouh_notifications set opened = true, read_at = now() where conversation_id = ... and opened = false`

**Badge global** (bell + onglet "Inbox") = somme `unread_count` toutes conv.

---

## Migrations SQL

- `waouh_conversations` : `ADD COLUMN unread_count INT NOT NULL DEFAULT 0`, `last_inbound_at TIMESTAMPTZ`, `last_direction TEXT`.
- `waouh_notifications` : `ADD COLUMN conversation_id UUID` + index.
- Trigger `trg_waouh_messages_bump_conv` after insert sur `waouh_messages`.
- Fonction RPC `waouh_mark_conversation_read(p_conv_id uuid)` security definer.
- Index : `waouh_conversations(user_id, last_inbound_at DESC)`.

---

## Fichiers impactés

Backend :
- `supabase/functions/waha-webhook/index.ts` (insertion notif `wa_inbound` après forward)
- `supabase/functions/waouh-channel-in/index.ts` (retourner `conversation_id` dans la réponse pour faciliter la notif)
- `supabase/functions/waouh-history/index.ts` (NEW)
- Migrations (cf. ci‑dessus)

Frontend :
- `src/hooks/useWaouhInbox.ts` (NEW – conversations agrégées + unread)
- `src/components/waouh/WaouhUnifiedInbox.tsx` (NEW)
- `src/components/waouh/WaouhWebChat.tsx` (utilise `waouh-history` pour hydratation)
- `src/hooks/useWaouhMatchNotifications.ts` (idem)
- `src/app-mobile/screens/WaouhChatScreen.tsx` (bouton/onglet Inbox + badge global)

---

## Critères de validation

- Envoyer un message WhatsApp au numéro business → 1 ligne dans `waouh_messages`, 1 dans `waouh_notifications` (type `wa_inbound`), `unread_count++` sur la conv.
- Recharger la PWA / changer de device avec même compte → tout l'historique (App + WA) revient immédiatement via `waouh-history`.
- Ouvrir une conv depuis l'inbox → badge passe à 0, notifs marquées lues, autres conv inchangées.
- Aucun doublon de notif (dedupe `wa_inbound:<waha_message_id>` actif).
