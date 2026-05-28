## Objectifs

1. Supprimer le doublon d'envoi des messages "Je cherche…" / "Je vends…" (côté WhatsApp + côté app).
2. Pour chaque notification "nouvel acheteur trouvé" ou "annonce trouvée", ouvrir automatiquement une nouvelle fenêtre de chat dédiée SOUS la fenêtre WAOUH, avec historique persistant jusqu'à finalisation.
3. Garantir parité simultanée des notifs/messages entre l'app et les comptes WhatsApp liés (annonce publiée, nouvel acheteur, annonce trouvée, contre‑offre vendeur/acheteur).

## 1. Correction du doublon d'envoi

Cause identifiée :
- `waouh-channel-in` insère le message `out` du bot + l'envoie déjà à WAHA (`sendWahaReply`, ligne 437).
- `waouh-webhook` (intent SELL / BUY) déclenche en parallèle `pushToOther` qui ré‑enqueue parfois vers l'expéditeur lui‑même (mirror web/whatsapp), produisant un 2e affichage in‑app et une 2e bulle WhatsApp.
- Côté UI, l'optimistic `temp-in-…` n'est pas dédupliqué par `id` réel quand le persistant arrive via Realtime avant `loadHistory` → 2 bulles "Je vends".

Correctifs :
- **`waouh-webhook` → `pushToOther`** : skipper proprement si `target.id === user.id` OU si `target.web_session_id === current sessionId` OU si `outboundPhone === phone` (déjà partiellement présent, à durcir et appliquer AVANT chaque `insert`/`enqueue`).
- **`waouh-channel-in`** : ne plus appeler `sendWahaReply` quand le webhook retourne `delivered_whatsapp: true` (nouveau flag), pour confier l'envoi WA à un seul endroit (le dispatcher d'outbound). Variante mini : ajouter un `dedupe_key` basé sur `message_id` à l'enqueue, et conserver `sendWahaReply` direct UNIQUEMENT pour le canal `web`.
- **`WaouhWebChat.tsx`** : remplacer le `temp-in-` par l'`id` réel renvoyé par `waouh-channel-in` (le faire renvoyer `inbound_message_id`), et matcher la dédup par `id` au lieu de `text + 30s`.

## 2. Fenêtres de chat par match (sous WAOUH)

Nouveau composant `WaouhMatchChats.tsx` :
- Liste empilée verticalement, juste sous `WaouhWebChat`, une carte/fenêtre par "match" (= `waouh_negotiations.id` ou `waouh_notifications` de type `match_seller` / `match_buyer` / `new_buyer`).
- Chaque fenêtre = mini chat (header avec photo article + titre + prix + autre partie, fil de messages, composer) connectée à `waouh_messages` filtré par `conversation_id` (à créer si absent) ou `negotiation_id`.
- Restent ouvertes jusqu'à `state === 'closed' | 'paid' | 'cancelled'` ; on garde l'historique en base (déjà persistant) et un cache local pour le tri.

Création/ouverture :
- Dans `useWaouhMatchNotifications`, à la réception d'une notif `match_*` ou `new_buyer`, dispatch d'un évènement `waouh:open-match-chat` avec `{ article_id, negotiation_id, counterpart_user_id, photos, title, price }`.
- `WaouhChatScreen` écoute cet évènement et insère/épingle la mini‑fenêtre dans `WaouhMatchChats`.
- Persistance des fenêtres ouvertes via `localStorage` (`waouh_open_matches_<sessionId>`) pour survivre au refresh.

Backend mini :
- Réutiliser `waouh_conversations` avec un champ existant `negotiation_id` (ajouter si manquant) pour cloisonner les messages par match.
- Tous les envois passent par `waouh-channel-in` avec un `match_id` → routé vers `waouh-negotiation-router` qui répond et notifie l'autre partie (WA + app) via le pipeline unifié.

## 3. Parité app ↔ WhatsApp

Audit des 5 évènements clés et vérification qu'ils empruntent tous le même chemin unique :

```
event → waouh-notify-dispatch
          ├─ insert waouh_notifications (in-app, +photos[])
          ├─ enqueue waouh_outbound_queue (web mirror si session)
          └─ send WAHA (sendImage+caption || sendText)
```

Évènements à valider/uniformiser :
- `sale_published` → vendeur (déjà via dispatcher).
- `new_buyer` / `match_seller` → vendeur.
- `match_buyer` / `match` → acheteur.
- `negotiation_open` (contre‑offre) → autre partie. Forcer le passage par `waouh-notify-dispatch` au lieu d'envoyer direct depuis `waouh-negotiation-router`.
- `negotiation_closed` / `contact_exchange` → les deux parties.

Pour chaque évènement :
- Supprimer les envois WhatsApp directs depuis les handlers (`waouh-sell-handler`, `waouh-buy-handler`, `waouh-negotiation-router`) et appeler uniquement `waouh-notify-dispatch` avec `recipient` et `kind`.
- Le dispatcher résout déjà `web_session_id` du destinataire → la notif in‑app arrive en Realtime ; il envoie WA via `resolveContact` → numéro réel (app, business produit, radar IA).
- Ajouter un `dedupe_key` (`${kind}:${article_id}:${recipient_user_id}:${day}`) côté `waouh_notifications` et `waouh_outbound_queue` pour empêcher double émission si plusieurs déclencheurs.

## Fichiers impactés

Backend :
- `supabase/functions/waouh-channel-in/index.ts` (déléguer envoi WA, renvoyer `inbound_message_id`)
- `supabase/functions/waouh-webhook/index.ts` (durcir `pushToOther`, plus de double mirror vers l'expéditeur)
- `supabase/functions/waouh-negotiation-router/index.ts` (router via `waouh-notify-dispatch`)
- `supabase/functions/waouh-notify-dispatch/index.ts` (ajouter `dedupe_key`, gérer `negotiation_open|closed|contact_exchange`)
- Migration : index unique partiel `(dedupe_key)` sur `waouh_notifications` et `waouh_outbound_queue` ; colonne `negotiation_id` sur `waouh_conversations` si manquante.

Frontend :
- `src/components/waouh/WaouhWebChat.tsx` (dédup `id` réel, drop matching `temp-in-` par id)
- `src/hooks/useWaouhMatchNotifications.ts` (émettre `waouh:open-match-chat`)
- `src/components/waouh/WaouhMatchChats.tsx` (NEW – pile de mini‑chats persistants)
- `src/components/waouh/WaouhMatchChatWindow.tsx` (NEW – un chat individuel)
- `src/app-mobile/screens/WaouhChatScreen.tsx` (afficher `WaouhMatchChats` sous `WaouhWebChat`, layout scrollable empilé)

## Critères de validation

- Envoyer "Je vends iPhone…" depuis l'app → 1 seule bulle in‑app, 1 seul message WhatsApp côté business, 1 seule notif `sale_published`.
- Lorsqu'un acheteur matche, une fenêtre apparaît automatiquement sous WAOUH côté vendeur (et symétriquement côté acheteur), persiste après refresh, et toute la conversation se déroule dedans.
- Une contre‑offre envoyée depuis l'app arrive simultanément dans la fenêtre dédiée ET sur WhatsApp du destinataire (numéro réel résolu : compte app, business produit ou radar IA).
