# Fix WaouhMatchChatList: ordering, realtime, dedicated chats, archive

## Problèmes constatés

1. **Le dernier match (Chocolat, capture 1) n'apparaît pas sous WAOUH** dans l'inbox (capture 2).
   - `WaouhMatchChatList` charge les notifications **une seule fois au montage** (pas de realtime ni de re-fetch).
   - L'ordre est correct (`order sent_at desc`), mais sans realtime, un nouveau `new_buyer` / `match` arrivé après le mount n'est jamais affiché.
   - Aucun fallback : si la notification a échoué/dédupliquée côté backend, l'item n'apparaît jamais même si un message `article_id` existe dans `waouh_messages`.

2. **La liste devient longue** (6+ "Annonce WAOUH·VEN-B033-*" identiques dans la capture 2) et noie le dernier match.

3. **Pas de moyen d'archiver / masquer** d'anciens items.

## Plan (frontend uniquement)

### 1. `WaouhMatchChatList.tsx` — refonte

**Tri & épinglage**
- Trier strictement par `last_at` DESC (déjà) et **épingler le plus récent en tête** avec un fond highlight (`bg-emerald-50/60 dark:bg-emerald-950/20`) + badge "Dernier".
- Le plus récent est rendu *au-dessus* du séparateur des autres pour bien occuper la 1ère place sous la carte WAOUH.

**Realtime**
- Souscrire aux changements `waouh_notifications` filtrés par `user_id in waouhIds` + `web_session_id=sessionId` (un channel par filtre) → relancer `load()` au moindre INSERT.
- Écouter aussi l'event custom `waouh:match-updated` (émis par `WaouhMatchChatWindow` quand on envoie un message) pour rebump l'ordre instantanément.

**Fallback messages**
- Si aucune `waouh_notifications` ne couvre un `article_id` récent, requêter `waouh_messages` (où `article_id is not null`) du `sessionId` / `waouhIds` des dernières 24 h et fusionner avec la map. Cela garantit que la conversation "Chocolat" apparaît même si la notification n'a pas été persistée.

**Archivage / masquage**
- Affichage par défaut : **3 premiers items**.
- Bouton « Voir tout (N) » → étend ; bouton « Réduire » pour replier.
- Bouton archive par item (icône `Archive` au swipe-style sur tap long, ou simple bouton "×" à droite avec confirm) → écrit la clé dans `localStorage` `waouh_archived_matches_<sid>` (Set de keys). Les items archivés sont filtrés.
- Bouton « Voir les archivés » en bas si Set non vide → permet de désarchiver.
- Auto-archive silencieux : tout item dont `last_at` > 7 jours et `unread === false` est automatiquement archivé (filtré de la vue principale, accessible via "Archivés").

**Ouverture chat dédié**
- Comportement actuel (`waouh:open-match-chat`) déjà OK : ouvre `/app/chat/waouh` + dispatch event → `useWaouhMatchChats` crée l'onglet et `WaouhChatScreen` affiche la fenêtre plein écran. Aucun changement.

### 2. `useWaouhMatchChats.ts`

- Quand un onglet est sélectionné depuis `WaouhMatchChatList`, **marquer les notifications correspondantes comme `opened=true`** (`update waouh_notifications set opened=true where article_id=... and user_id in (waouhIds)`) pour que le badge "Nouveau" disparaisse et que l'item descende en priorité.
- Quand l'utilisateur ferme un onglet, **archiver automatiquement** la match-key (ajoute dans `waouh_archived_matches_<sid>`) → "faire disparaître les anciennes fenêtres" comme demandé.

### 3. UI: indicateur de mise à jour

- Petit séparateur "Conversations produit" au-dessus de la liste avec un compteur `(3/12)` quand collapsé.

## Fichiers touchés

- `src/components/waouh/WaouhMatchChatList.tsx` (refonte tri + realtime + archive + fallback messages)
- `src/components/waouh/useWaouhMatchChats.ts` (mark-as-read + auto-archive on close)
- (aucune migration DB, aucun edge function)

## Notes techniques

- Realtime Supabase : un `supabase.channel('waouh-match-list')` avec deux listeners postgres_changes (un sur `user_id=in.(...)`, un sur `web_session_id=eq...`). Cleanup au unmount.
- `localStorage` keys :
  - `waouh_archived_matches_<sessionId>` → JSON string array de match keys.
  - `waouh_match_expanded_<sessionId>` → "1" si liste étendue.
- Garde-fou : si `items.length <= 3`, masquer les boutons "Voir tout / Réduire".
