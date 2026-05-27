# Stabilisation bout-en-bout du chat (App ⇄ WhatsApp ⇄ Notifications)

## Diagnostic actuel

```
                 ┌───────────────────────────────┐
INBOUND          │                               │
WhatsApp ─► waha-webhook ─► waouh-channel-in ──► waouh-webhook (bot)
                 │            │ ✓ dédup            │
                 │            │ ✓ rehost média     │ ✓ persist waouh_messages
                 │            │ ✓ persist in       │ ✓ envoi WAHA outbound
                 ▼            │                    │ ✗ pas de notif push/in-app
            whatsapp_messages │                    │ ✗ conversation_id pas tjs liée
            (doublon legacy)  └────────────────────┘

Web widget ─► waouh-channel-in (idem, OK)

App mobile ChatScreen (operateur) ─┐
                                   ├── INSERT direct waouh_messages (court-circuit)
                                   ├── invoke waha-send-message (sessionName="default" ❌)
                                   │       └─ exige whatsapp_accounts du user (KO pour WAOUH)
                                   └── invoke waouh-webhook (au lieu de channel-in)
                                       └─ pas d'idempotence, pas d'attachements, pas de notif

Pas d'upload photo dans ChatScreen mobile (📎 inactif).
Realtime ChatScreen filtre uniquement sur conversation_id → messages WhatsApp
non liés n'apparaissent pas.
```

Problèmes confirmés
- Mobile op → WhatsApp : non délivré (mauvais session/endpoint, route auth).
- Mobile op → Web user : pas d'idempotence, pas d'attachements.
- Mobile op → 📎 image : aucune action.
- Inbound WhatsApp avec images : rehost OK côté `waouh_messages`, mais `whatsapp_messages` duplique avec URL WAHA non publique.
- Aucune notification (push/in‑app) lors d'un nouveau message entrant.
- `conversation_id` souvent NULL pour messages WhatsApp → onglet conversation ne reçoit pas le realtime.

## Plan de correction

### 1) Unifier la sortie côté app mobile (ChatScreen)
- Remplacer `send()` par un appel unique à une nouvelle edge function `waouh-operator-send` (voir §3) avec : `conversation_id`, `text`, `attachments[]`, `channel` déduit du meta.
- Activer le bouton 📎 : ajouter `handleFiles` (caméra + galerie) qui upload vers le bucket `waouh-uploads` (déjà utilisé par le widget web) puis envoie l'URL publique en attachment.
- Aperçu local optimiste de la bulle envoyée + état `sending/sent/failed`.
- Realtime : élargir le filtre (en plus de `conversation_id`, écouter aussi `phone_number=eq.<n>` ou `web_session_id` quand `conversation_id` est NULL pour cette conv).

### 2) Lier systématiquement `conversation_id`
- Dans `waouh-channel-in`, après upsert user, upsert `waouh_conversations` (key = user_id + channel) et inclure `conversation_id` sur tous les INSERT `waouh_messages` (in et out).
- Mettre à jour `last_message`, `updated_at`, `unread_count` sur chaque inbound.

### 3) Nouvelle edge `waouh-operator-send`
Centralise l'envoi opérateur (mobile ou admin) :
1. Vérifie auth user + permission sur la conversation.
2. Upload n'est pas refait ici (les URLs publiques arrivent prêtes).
3. INSERT `waouh_messages` (direction=out, attachments, conversation_id, channel).
4. Si `channel = whatsapp` et `phone_number` présent → appelle WAHA via le même helper que `waouh-channel-in` (`sendWahaReply` avec `WAHA_SESSION = WaouhApp`, support image + texte combinés).
5. Met à jour `waouh_conversations.last_message/updated_at`.
6. Retourne `{ ok, waha_status }` pour feedback UI.

### 4) Inbound WhatsApp : nettoyage et idempotence
- Dans `waha-webhook`, ne plus dupliquer dans `whatsapp_messages` si la session correspond à WAOUH (déjà persisté par `waouh-channel-in`).
- Pour les autres sessions (bots WhatsApp utilisateurs), conserver `whatsapp_messages` mais réhoster aussi le média via le helper partagé (extraire `rehostMedia` dans `_shared/wahaMedia.ts`).

### 5) Notifications automatiques
- Trigger Postgres `AFTER INSERT ON waouh_messages WHEN direction='in'` → `pg_net` POST vers `notify-new-message` (nouvelle edge légère) qui :
  - Crée une `notifications` (in-app) pour le propriétaire de la conversation (op WAOUH + utilisateur si auth).
  - Si push tokens enregistrés (`register-device-token`) → envoie une push (fallback silencieux).
- Compteur `unread_count` mis à jour côté `waouh_conversations` (déjà partiellement présent côté `useUnreadCounts`).

### 6) UI mobile chat — robustesse et fluidité
- Optimistic UI : bulles envoyées affichent ⏱ puis ✓ (sent) puis ✓✓ (delivered via ack WAHA pour WhatsApp).
- Reconnexion realtime : recréer le channel sur visibilitychange + retry exponentiel.
- Skeletons d'images en chargement (déjà partiel) + cache lightbox.
- `markConversationRead` appelé à l'ouverture ET à chaque arrivée de message visible.

### 7) Tests de bout-en-bout
- `supabase/functions/waouh-operator-send/index_test.ts` : auth refusée, envoi web OK, envoi WhatsApp OK (mock WAHA), envoi image OK.
- Script `waouh-e2e-test` étendu : envoie message web → vérifie persistance + notif + (si phone lié) appel WAHA mocké.

## Détails techniques

Tables touchées
- `waouh_messages` : pas de migration de schéma, juste s'assurer que tous les INSERT incluent `conversation_id` et `attachments`.
- `waouh_conversations` : ajouter colonne `unread_count_op int default 0` si absente, et trigger d'incrément.
- `notifications` : déjà existante, on s'appuie dessus.

Edge functions
- Nouvelle : `waouh-operator-send`, `notify-new-message`.
- Modifiées : `waha-webhook` (dédup WAOUH), `waouh-channel-in` (toujours injecter conversation_id), `waha-send-message` (gardée pour bots utilisateurs uniquement).
- Shared : `_shared/wahaMedia.ts` (rehostMedia), `_shared/wahaClient.ts` (sendText/Image/Buttons unifiés).

Frontend
- `src/app-mobile/screens/ChatScreen.tsx` : refactor `send` + ajout upload + realtime élargi + optimistic.
- `src/components/waouh/WaouhWebChat.tsx` : continue d'utiliser `waouh-channel-in` (déjà OK), juste lecture du nouveau `attachments` enrichi.

Secrets requis (déjà présents)
- `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION` (= `WaouhApp`), `WAOUH_BUSINESS_PHONE`.
- Aucun nouveau secret nécessaire.

## Livrables
1. Pipeline unique opérateur → app/WhatsApp (texte + image) qui n'échoue plus silencieusement.
2. Réception WhatsApp (texte + image) qui apparaît instantanément dans l'app et déclenche une notif.
3. Idempotence et déduplication garanties dans les deux sens.
4. Tests automatisés couvrant les 4 chemins (web↔app, whatsapp↔app).
