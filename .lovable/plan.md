# Stabilisation des fenêtres de chat WAOUH (WaouhMatchChatList → WaouhMatchChatWindow)

## Causes racines identifiées

### 1. Tabs ouvertes peuvent être perdues lors de la navigation
- `WaouhMatchChatList.open()` appelle `navigate("/app/chat/waouh")` puis dispatche `waouh:open-match-chat` après un `setTimeout(50)`.
- Le listener est enregistré dans `useWaouhMatchChats` (dans `WaouhChatScreen`). Si la transition route est plus lente que 50ms (montage React, lazy-load, etc.), **l'événement est perdu** → la fenêtre ne s'ouvre jamais ou s'ouvre vide.

### 2. Clés instables : même article = plusieurs tabs avec historiques différents
- Quand la liste a un `notification_id` → key = `n_<notifId>`.
- Quand elle a un fallback message → key = `msg_<articleId>_<role>`.
- Quand le hook `useWaouhMatchChats` crée la tab → key = `n_<notifId>` ou `${role[0]}_${articleId}`.
- **3 préfixes différents pour le même article** (`n_`, `msg_`, `b_`/`s_`). Chaque clé a son propre snapshot localStorage → l'historique semble disparaître quand on rouvre depuis un autre point d'entrée.

### 3. Snapshot localStorage tronqué à 50 messages
- `setCached` écrit `msgs.slice(-SNAPSHOT_LIMIT=50)` dans localStorage.
- Après remount de `WaouhChatScreen` (sortie/retour de l'écran), le cache mémoire est vide → on relit uniquement les 50 derniers. Si l'utilisateur avait scrollé pour charger 200 messages plus anciens, ils disparaissent.

### 4. Cache mémoire perdu au remount du hook
- `msgCacheRef` (Map) est défini dans `useWaouhMatchChats`. Démontage de `WaouhChatScreen` → Map perdue. Le fallback localStorage est tronqué (cf. #3).

### 5. Effet de rechargement écrase `hasMore`
- Le `useEffect` initial appelle `setHasMore(pageMsgs.length === PAGE_INITIAL)` à chaque remount, écrasant le `hasMore` mémorisé (qui pouvait être `false` après avoir tout chargé). Pas critique mais provoque des appels inutiles à `loadOlder()`.

### 6. Pas de retry/fiabilité si l'événement open est dispatché avant montage
- Aucun buffer d'événements pending.

---

## Plan de correction

### A. Clé canonique par article+rôle (fichier : `useWaouhMatchChats.ts` + `WaouhMatchChatList.tsx`)
- Helper partagé `matchKey({article_id, role})` → toujours `art_<articleId>_<role>`.
- `WaouhMatchChatList.renderRow` utilise cette clé pour `item.key` ET pour les opérations d'archivage.
- `useWaouhMatchChats.onOpen` calcule la même clé canonique. Le `notification_id` est stocké dans la meta de la tab (pour mark-as-read) mais n'influe plus sur la clé.
- **Migration douce des anciennes clés** : au boot du hook, parcourir les tabs `loadOpen()` et anciens snapshots `waouh_match_msgs_*`, renommer `n_<id>` / `msg_<art>_<role>` / `b_<art>` / `s_<art>` → `art_<art>_<role>` (en mergeant les snapshots existants par tri created_at + dédupe par id, garder le plus complet).

### B. Buffer d'événements `waouh:open-match-chat`
- Dans `WaouhMatchChatList.open()` : avant de dispatcher, écrire le payload dans `localStorage["waouh_pending_open"]` puis naviguer.
- Dans `useWaouhMatchChats` (au montage) : lire `waouh_pending_open`, traiter immédiatement, puis le supprimer. Conserver aussi le listener `window.addEventListener` pour les cas où on est déjà sur l'écran.
- Élimine le race condition `setTimeout(50)`.

### C. Persistance complète de l'historique (pas seulement 50 messages)
- Augmenter `SNAPSHOT_LIMIT` à **300** (couvre largement les conversations actives).
- Pour les très longues conversations : ajouter un compteur `loadedCount` par key. À la restauration, le snapshot reste source de vérité jusqu'à `loadedCount`, puis pagination DB prend le relais.
- Sauvegarder le `hasMore` final dans localStorage (`waouh_match_hasmore_${sid}_${key}`) pour ne pas re-trigger un fetch initial alors qu'on sait qu'on a tout.

### D. Stabilité du remount de `WaouhMatchChatWindow`
- Dans l'effet initial : ne PAS écraser `hasMore` si on a déjà des messages cachés ET un `hasMore=false` persisté.
- Garder la logique merge actuelle (déjà OK).
- Bonus : si `getCached(match.key)` retourne ≥ 10 messages, ne pas re-fetcher le PAGE_INITIAL au montage — laisser le realtime gérer les nouveaux messages. Refetch seulement après un délai (>30s) depuis la dernière activité connue.

### E. Tab list stable entre sessions anonymes/auth
- Si `authUserId` existe : utiliser une clé `waouh_open_matches_user_<authUserId>` en plus de la clé session. Au login, **migrer** les tabs de la session anonyme vers la clé user (merge + dédupe par clé canonique).

### F. Mark-as-read découplé de la clé
- Stocker `notification_ids: string[]` (tableau) sur chaque tab pour pouvoir marquer plusieurs notifications du même article comme lues quand on ouvre la tab unique.

---

## Fichiers modifiés

- `src/components/waouh/useWaouhMatchChats.ts` — clé canonique, buffer pending, migration snapshots, SNAPSHOT_LIMIT=300, persistance hasMore, support multi-notification.
- `src/components/waouh/WaouhMatchChatList.tsx` — clé canonique (`art_<id>_<role>`) au lieu de `n_<id>` / `msg_<id>_<role>`, écrit `waouh_pending_open` avant `navigate`.
- `src/components/waouh/WaouhMatchChatWindow.tsx` — saute le fetch initial si cache suffisant, respecte hasMore persisté, support `notification_ids[]` pour markRead.
- `src/components/waouh/WaouhMatchChatWindow.tsx` — type `MatchChatMeta` : ajout `notification_ids?: string[]`.

## Pas de migration DB nécessaire.

---

## Question

Veux-tu aussi que je purge les anciennes clés snapshot (`n_*`, `msg_*`, `b_*`, `s_*`) après migration, ou les conserver "au cas où" pendant 30 jours ?
