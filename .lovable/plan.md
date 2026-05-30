
# Stabilisation des notifications & chats WAOUH

Objectif : rendre **robuste**, **fluide** et **prévisible** tout le flux *notification → liste → ouverture de la fenêtre → chat*, pour les types `match`, `match_buyer`, `match_seller`, `new_buyer`, `radar_match`.

## Problèmes identifiés dans le code actuel

1. **Auto-ouverture intrusive** : `useWaouhMatchNotifications` dispatch `waouh:open-match-chat` à **chaque** INSERT realtime — même quand l'utilisateur n'est pas sur `/app/chat`. Une nouvelle notif vole le focus et ouvre une fenêtre.
2. **Doublons de souscriptions realtime** : `useWaouhMatchNotifications`, `WaouhMatchChatList`, `useWaouhMatchChats` et `WaouhMatchChatWindow` s'abonnent chacun à `waouh_notifications` / `waouh_messages` avec leurs propres canaux → 4+ canaux par session, recharges multiples, race conditions, fuites au démontage.
3. **`WaouhMatchChatList` recharge tout** à chaque event (`loadRef.current?.()`) : N+1 sur `waouh_articles` dans la boucle fallback messages, pas de debounce → scintillement de la liste.
4. **Dépendance instable** `waouhIds.join("|")` re-crée le canal à chaque changement (auth resolve, etc.).
5. **`upsertNotif` skip silencieusement** les doublons mais ne met pas à jour `read`/`image_url` si la version realtime arrive après l'historique.
6. **Toast + Notification système systématiques** même lorsque la fenêtre cible est déjà ouverte/active → bruit.
7. **`WaouhMatchChatWindow`** : filtre realtime uniquement par `web_session_id` (rate les messages reçus via `user_id`), scroll forcé en `smooth` sur chaque arrivée (saccadé sur mobile), refocus auto même quand l'utilisateur scrolle.
8. **Seed text** rechargé même quand `match.seed_text` est déjà fourni (requête `waouh_notifications` inutile).
9. **Clé d'archivage `EXPANDED_KEY`** dépend de `sessionId` mais l'état initial n'est lu qu'au mount → désynchronisé si `sessionId` change.
10. **Pas de gestion d'erreur visible** côté `send()` (le message disparaît, restauré dans l'input sans toast → l'utilisateur ne sait pas pourquoi).

## Plan d'action (frontend uniquement, aucune migration DB)

### 1. Centraliser le realtime dans un seul provider
Créer `src/components/waouh/WaouhRealtimeProvider.tsx` (+ hook `useWaouhRealtime`) :
- Un seul `supabase.channel` par session/user qui écoute `waouh_notifications` et `waouh_messages`.
- Expose un **event bus interne** (`subscribe(event, handler)`) consommé par `useWaouhMatchNotifications`, `WaouhMatchChatList`, `useWaouhMatchChats`, `WaouhMatchChatWindow`.
- Monté une fois dans `WaouhChatPage` + `WaouhChatScreen` (mobile).

### 2. Ne plus auto-ouvrir la fenêtre depuis le realtime
Dans `useWaouhMatchNotifications` :
- Supprimer le dispatch automatique de `waouh:open-match-chat` sur INSERT.
- Garder uniquement : ajout en liste + toast cliquable + notification système.
- Le toast/notif clique → dispatch `waouh:open-match-chat` (intention utilisateur).
- `WaouhMatchChatList` reste le seul point d'ouverture proactif (déjà géré).

### 3. Robustifier `upsertNotif`
- Sur doublon : merger (`read`, `image_url`, `body`) au lieu de skip.
- Trier la liste après merge.
- Persister immédiatement.

### 4. Optimiser `WaouhMatchChatList`
- Remplacer le N+1 sur `waouh_articles` par **un seul** `select ... in ("id", [...])`.
- Debounce `load()` (150ms) — un seul rechargement par rafale.
- Mise à jour locale immédiate sur INSERT (push optimiste dans `items`) avant le reload.
- Stabiliser les deps : `useMemo` sur `waouhIds`.

### 5. Fluidifier `WaouhMatchChatWindow`
- Filtre realtime : OR sur `web_session_id` et `user_id IN (waouhIds)`.
- Skip la requête seed si `match.seed_text` est déjà fourni.
- Scroll : `auto` (instantané) sur premier render, `smooth` ensuite ; ne pas scroller si l'utilisateur est >120px du bas.
- Focus textarea : seulement à l'ouverture/changement de tab, pas après chaque message.
- `send()` : sur erreur, restaurer l'input **+** `toast.error("Message non envoyé, réessayez")`.
- Empêcher double-submit (déjà via `sending`, ajouter guard sur Enter).

### 6. UX notifications
- Toast/notif système uniquement si :
  - L'onglet n'est pas focus (`document.visibilityState !== "visible"`), **ou**
  - L'utilisateur n'est pas sur `/app/chat` / `/waouh-chat`.
- Sinon : juste un bump visuel sur la cloche + liste mise à jour.

### 7. Nettoyage & cohérence
- Unifier les types : `recipient` toujours dérivé via une seule fonction `resolveRole(notif)` partagée (`src/components/waouh/utils/role.ts`).
- Unifier les listes `matchKinds` dans une constante exportée.
- Logs `console.warn` préfixés `[waouh]` uniquement, supprimer les `console.log` debug restants.

## Détails techniques

**Fichiers modifiés** :
- `src/hooks/useWaouhMatchNotifications.ts` — retirer auto-open, fix upsert merge, gate toast.
- `src/components/waouh/WaouhMatchChatList.tsx` — debounce, batch articles, optimistic update.
- `src/components/waouh/WaouhMatchChatWindow.tsx` — filtre realtime élargi, scroll/focus intelligents, toast erreur.
- `src/components/waouh/useWaouhMatchChats.ts` — consommer le provider.

**Fichiers créés** :
- `src/components/waouh/WaouhRealtimeProvider.tsx`
- `src/components/waouh/utils/role.ts`
- `src/components/waouh/utils/matchKinds.ts`

**Aucune** modification de :
- Edge functions (`waouh-radar-process`, `waouh-notify-dispatch`, `waouh-channel-in`) — la chaîne backend est déjà OK depuis la dernière itération.
- Schéma DB / RLS.

## Critères de succès
- Une nouvelle notif `radar_match` apparaît instantanément dans la cloche + liste **sans** ouvrir une fenêtre intempestive.
- Cliquer une notif (liste ou toast) ouvre la fenêtre avec seed text + photo dès la 1ʳᵉ frame (pas de flash).
- Envoyer un message ne fait plus sauter le scroll si l'utilisateur lit l'historique.
- Un seul canal Supabase par session visible dans les DevTools Network (vs 4+ actuellement).
- Aucune erreur si on enchaîne 10 notifs en rafale.
