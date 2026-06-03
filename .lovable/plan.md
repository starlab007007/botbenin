## Objectif

Trois chantiers indépendants sur la couche chat WAOUH :

1. Charger seulement les **10 derniers messages** à l'ouverture du chat, puis paginer vers le haut au scroll.
2. Stabiliser `WaouhMatchChatWindow` pour qu'il **conserve tout l'historique** d'une discussion produit, sans perte ni re-fetch destructif.
3. **Fiabiliser** l'envoi/réception des messages et notifications (in-app + WhatsApp), avec retries, dédup et statuts.

---

## Chantier 1 — Pagination lazy du chat (WaouhWebChat + WaouhMatchChatWindow)

Aujourd'hui `WaouhWebChat.loadHistory()` tire jusqu'à 500 messages, et `WaouhMatchChatWindow` jusqu'à 300, en un seul `select`. Sur les comptes actifs cela charge tout l'historique à chaque ouverture.

Changements :
- `waouh-history` edge function : ajouter params `limit` (défaut 10) et `before` (ISO timestamp). Tri DESC côté DB, re-tri ASC à l'envoi.
- `WaouhWebChat.loadHistory(ids, { initial: true })` : premier appel → 10 messages les plus récents. Affichage immédiat en bas (scroll-to-bottom).
- Ajout `loadOlder()` : récupère les 20 suivants `created_at < oldestLoaded.created_at`. Préserve la position de scroll (mesure `scrollHeight` avant/après et compense `scrollTop`).
- Sentinelle `IntersectionObserver` en haut de la liste : déclenche `loadOlder()` quand visible, avec garde `loadingOlder` + `hasMore` (false si la dernière page renvoie < pageSize).
- `WaouhMatchChatWindow` : même logique, pagination scopée par `article_id`. Premier load → 10 derniers messages du fil produit.
- Realtime INSERT continue d'append en bas (inchangé). Dédup par `id`.

## Chantier 2 — Stabilité de WaouhMatchChatWindow

Causes identifiées de la "perte" d'historique :
- L'effect de chargement se re-déclenche quand `waouhIds.join(",")` change (l'identité se résout en plusieurs étapes au login), et `setMessages(data ?? [])` **écrase** la liste, y compris les `temp-*` optimistes et tout message déjà reçu par realtime.
- `WaouhMatchChatList` démonte/remonte la fenêtre quand on bascule entre tabs : la liste repart de zéro.
- Le scope de la requête (`web_session_id` OR `user_id`) loupe les messages où `article_id` est porté uniquement par `meta.article_id` (anciens enregistrements).

Changements :
- Cache mémoire **par `match.key`** dans `useWaouhMatchChats` (Map en ref) — la fenêtre lit depuis ce cache et y persiste ses ajouts (optimistic + realtime). Démonter/remonter ne vide plus rien.
- Sur reload, **merge** au lieu d'écraser : dédupe par `id`, conserve les `temp-*` non encore confirmés, re-tri par `created_at`.
- Requête article-scope : `or(article_id.eq.X, meta->>article_id.eq.X)` pour rattraper les anciens messages.
- Garde l'effect "réinitialisation" uniquement quand `match.article_id` change réellement, pas quand `waouhIds` est juste enrichi (compare avec ref précédente).
- Persistance locale optionnelle : snapshot des 50 derniers messages du fil dans `localStorage` clé `waouh_match_msgs_${sessionId}_${match.key}` → restauration instantanée à la prochaine ouverture en attendant le fetch.

## Chantier 3 — Fiabilité messages & notifications

État actuel : `waouh-channel-in` appelle WAHA puis `waouh-notify-dispatch` en fire-and-forget ; `waouh-notify-dispatch` envoie WhatsApp puis insère la notif in-app. Pas de retry, pas d'idempotence côté envoi WA, statuts seulement `delivered/queued/failed` sans relance.

Changements :
- **Outbound queue** : toute notif/message sortant passe par `waouh_outbound_queue` (déjà existant). `waouh-notify-dispatch` enregistre l'intent avec `status='pending'`, puis tente l'envoi ; si KO → `status='retry'` + `retry_after`. Edge function planifiée existante (`waouh-outbound-dispatch`) reprend les `retry`/`pending`.
- **Idempotence WhatsApp** : clé `dedupe_key = ${kind}:${article_id}:${recipient}:${dayBucket}` déjà côté `waouh_notifications`. Étendre la même clé à l'outbound queue pour éviter les doubles envois WA si la queue retry après succès silencieux.
- **Ack côté WAHA** : `sendImage`/`sendText` retournent un id message ; le stocker dans `waouh_outbound_queue.provider_message_id`. `waha-webhook` met à jour le statut `delivered/read` quand WA push l'event.
- **In-app garanti** : aujourd'hui la notif in-app n'est insérée que si `notifTargetUserId` est résolu. Fallback : si non résolu mais `phone_number` connu → résoudre/créer un `waouh_users` puis insérer. Sinon insérer une notif "orpheline" scopée par `phone_number` que le front lit en plus de `user_id`.
- **Notif d'intérêt acheteur** : `waouh-buyer-interest` doit toujours appeler `waouh-notify-dispatch` même si la 1ère insertion `waouh_interests` est un duplicate (sinon le vendeur ne reçoit rien lors d'un 2e clic légitime). Gérer le dédup uniquement au niveau notification, pas au niveau dispatch.
- **Frontend** : `useWaouhMatchNotifications` et `WaouhNotificationsBell` s'abonnent déjà au realtime — vérifier qu'ils écoutent aussi sur `web_session_id=eq.<sid>` (utile pour les comptes anonymes) et sur `phone_number=eq.<phone>` si renseigné.
- **Retry envoi message utilisateur** : `WaouhWebChat.send()` et `WaouhMatchChatWindow.send()` — sur timeout (>20s) ou erreur, conserver le message optimiste avec badge "⚠️ Renvoyer", bouton manuel. Pas de perte côté UI.
- **Observabilité** : logguer dans `waouh_pipeline_events` chaque étape (`outbound_queued`, `wa_sent`, `wa_failed`, `inapp_inserted`) avec `dedupe_key` pour pouvoir diagnostiquer en SQL.

---

## Détails techniques

**Fichiers édités :**
- `supabase/functions/waouh-history/index.ts` — params `limit`, `before`, tri DESC + reverse.
- `src/components/waouh/WaouhWebChat.tsx` — `loadInitial(10)`, `loadOlder()`, IO sentinelle, conservation `scrollTop`.
- `src/components/waouh/WaouhMatchChatWindow.tsx` — pareil + cache externalisé.
- `src/components/waouh/useWaouhMatchChats.ts` — ajoute `messagesCache: Map<string, Msg[]>` exposé via ref, helpers `getCached/setCached/append`.
- `supabase/functions/waouh-notify-dispatch/index.ts` — passage par `waouh_outbound_queue`, dédup étendu, fallback user resolution.
- `supabase/functions/waouh-channel-in/index.ts` — n'attend plus le notify (déjà), mais logue pipeline_event.
- `supabase/functions/waouh-buyer-interest/index.ts` — découple insertion intérêt et dispatch.
- `supabase/functions/waouh-outbound-dispatch/index.ts` — gère retry/backoff.
- `supabase/functions/waha-webhook/index.ts` — update `provider_message_id` → `delivered_at/read_at`.

**Pas de migration nécessaire** : les tables `waouh_outbound_queue`, `waouh_pipeline_events`, `waouh_notifications.dedupe_key` existent déjà. Ajout éventuel d'une colonne `provider_message_id` sur `waouh_outbound_queue` si absente — à vérifier au moment du build.

**Questions ouvertes :**
1. Pour la pagination, préfères-tu 10 messages initiaux + 20 par page, ou un autre couple (ex. 15/30) ?
2. Pour les messages échoués côté UI, garde-t-on un bouton "Renvoyer" manuel, ou un retry automatique silencieux (3 tentatives) avant d'afficher l'erreur ?