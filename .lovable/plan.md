## Diagnostic

La route `/app/chat` rend `MobileShell` → `ChatListScreen` (côté Mobile/Web). Plusieurs causes cumulées expliquent la lenteur, et l'erreur `net::ERR_TIMED_OUT` sur réseaux faibles :

1. **Bundle JS énorme et monolithique**  
   `vite.config.ts` regroupe React, Radix, Supabase, react-router, react-leaflet, react-pdf, lucide, tanstack, react-hook-form, etc. dans **un seul chunk `vendor`** (commentaire « vendor catch-all »). Sur 3G/Edge, ce fichier de plusieurs Mo peut dépasser le timeout TCP → `ERR_TIMED_OUT`.

2. **Pas de préchargement / pas de cache offline du shell de chat**  
   Le SW (`public/sw.js` v5) précache `/`, `/offline.html`, manifest, icônes — mais **pas** les chunks JS de la route `/app/chat`. À la première visite hors-ligne ou flaky → page blanche / timeout.

3. **Cascade de requêtes Supabase bloquantes avant l'affichage**  
   À l'ouverture de `/app/chat` :
   - `useWaouhIdentity` : 1 requête `waouh_users` (bloque `ready`).
   - `ChatListScreen` : `waouh_conversations` + (souvent) `waouh_messages` → puis hydrate `users`.
   - `useGlobalChatSync` (dans `MobileShell`) : refait `waouh_conversations` + **N requêtes COUNT** parallèles sur `waouh_messages` (une par conversation, jusqu'à 100). Sur réseau faible → file d'attente HTTP saturée, certaines requêtes timeout.
   - 2 souscriptions Realtime ouvertes en plus (WebSocket).
   Tant que `ready` est faux, **aucun rendu** de liste : l'utilisateur voit un écran vide pendant 5–30 s.

4. **Pas d'hydratation depuis le cache local**  
   Les conversations ne sont pas servies depuis `localStorage`/IndexedDB en attendant la réponse réseau → 0 contenu visible pendant la latence.

5. **`useGlobalChatSync` dupliqué et trop précoce**  
   Il tourne dans `MobileShell` même quand l'utilisateur n'est pas connecté, et ses N+1 COUNT s'exécutent à chaque mount/navigation.

6. **`registerServiceWorker` désactivé sur preview Lovable**  
   Normal en preview, mais cela signifie qu'on **ne peut pas tester l'offline** dans l'éditeur — uniquement sur `bot.bj` publié.

## Plan de correction

### 1. Découpe du bundle (gros impact sur le TTI)
Dans `vite.config.ts`, sortir du chunk `vendor` ce qui n'est pas utilisé par la route `/app/chat` :
- `react-pdf`, `jspdf`, `pdfjs` → chunk `pdf` (déjà partiel, étendre à react-pdf).
- `react-leaflet` + `leaflet` → chunk `leaflet`.
- `recharts` + `d3-*` → déjà `charts` (garder).
- `xlsx`, `mapbox-gl`, `@huggingface`, `@ffmpeg` → déjà isolés (garder).
- Garder React/Radix/router/supabase ensemble dans `vendor` (contrainte v3 documentée — ne pas régresser).
- Ajouter un chunk `waouh-match` pour `src/components/waouh/*` (gros module utilisé seulement quand on ouvre un chat).

### 2. Précache du shell `/app/chat` (offline-first réel)
Dans `public/sw.js` :
- Bumper `VERSION` → `v6`.
- Étendre `SHELL_URLS` pour précacher la route `/app/chat` (HTML) + ajouter une stratégie **stale-while-revalidate** pour les chunks `/assets/js/*` afin que la 2e visite soit instantanée même hors-ligne.
- Conserver `NetworkFirst` pour la navigation, mais en cas de timeout `> 4s`, retomber sur le cache HTML de `/app/chat` (au lieu de `offline.html`).

### 3. Hydratation instantanée depuis localStorage
Dans `ChatListScreen.tsx` :
- Au mount, lire `waouh_chatlist_snapshot_v1` (clé scoppée par `auth_user_id` ou `sessionId`) et afficher immédiatement la liste (sans attendre `ready` Supabase).
- Après chaque `setConvs(...)` réussi, sérialiser un snapshot léger (id, phone, last_message, updated_at, channel) dans `localStorage`.
- Idem pour `users` (map d'avatars/labels).

### 4. Réduire les requêtes Supabase au mount
- `useGlobalChatSync` : remplacer les N COUNT par **1 seule requête agrégée** côté serveur (RPC `waouh_unread_totals(identity)`) — fallback côté client si RPC absent : un seul COUNT global `IN (conversation_id list)` + `created_at > min(since)`.
- Différer `useGlobalChatSync` derrière `requestIdleCallback` (200 ms) pour ne pas concurrencer le premier paint.
- Paralléliser les fetchs de `ChatListScreen` (`waouh_conversations` + `waouh_users`) via `Promise.all`, et lancer l'appel **avant** d'attendre `ready` quand on a déjà un `sessionId` local.

### 5. Suspense + skeleton immédiat
- Le `<Suspense fallback={<DeferredRouteFallback />}>` est OK, mais `ChatListScreen` doit rendre un **skeleton de liste** dès le 1er paint au lieu d'attendre `loading=false`. Cela donne un retour visuel < 200 ms.

### 6. Preload des chunks critiques dans `index.html`
- Ajouter `<link rel="modulepreload" href="/assets/js/MobileShell-*.js">` et `ChatListScreen-*.js` injectés au build (plugin Vite `experimentalRenderBuiltUrl` ou simple `modulepreload-polyfill`).

### 7. Garde-fou réseau
- Dans `src/integrations/supabase/client.ts`, ajouter un fetch wrapper avec `AbortSignal.timeout(8000)` + 1 retry exponentiel → évite que les promesses pendantes bloquent l'UI indéfiniment.

### 8. Vérifications
- Build → vérifier que `assets/js/vendor-*.js` repasse sous ~700 kB gzip.
- `curl -I https://bot.bj/app/chat` depuis un POP lent (ou throttling Chrome "Slow 3G") → mesurer LCP < 4 s.
- Sur cache vide, hors-ligne : `/app/chat` doit s'ouvrir avec skeleton + dernier snapshot, sans `ERR_TIMED_OUT`.

## Fichiers concernés

```text
vite.config.ts                                  (split chunks)
public/sw.js                                    (v6, précache /app/chat + assets)
index.html                                      (modulepreload chat shell)
src/integrations/supabase/client.ts             (fetch wrapper timeout+retry)
src/app-mobile/hooks/useWaouhIdentity.ts        (ready immédiat si sessionId)
src/app-mobile/hooks/useGlobalChatSync.ts       (1 RPC agrégé, defer idle)
src/app-mobile/screens/ChatListScreen.tsx      (snapshot localStorage + skeleton)
src/app-mobile/layouts/MobileShell.tsx          (Suspense interne + defer sync)
supabase/migrations (RPC waouh_unread_totals)   (optionnel mais recommandé)
```

## Hors-scope (à ne PAS toucher)
- Logique métier WAOUH (verrouillée par `waouh-chat-sync-flow-locked-v12`).
- `WaouhMatchChatWindow`, `WaouhWebChat`, identité waouh côté `useWaouhMatchChats`.
- Schéma des tables `waouh_*` (seule la RPC additive).
