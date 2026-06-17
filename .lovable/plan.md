## Diagnostic

Lenteur observée sur `/app/chat`, `WaouhWebChat` et `WaouhMatchChatWindow`. Causes identifiées :

1. **Hydratation cache déjà OK, mais `loadInitial` est bloqué par une requête séquentielle** : on attend d'abord `select waouh_users` (1 RTT Supabase) **avant** d'appeler `waouh-history` (2e RTT Edge Function). 2 round-trips série avant tout affichage frais.
2. **Realtime recréé à chaque changement de `waouhIds`** : tableau dans la deps `waouhIds.join(",")` ⇒ unsubscribe/resubscribe complet, perte de messages pendant la fenêtre.
3. **Bundles lourds chargés synchronement** : `WaouhWebChat` (838 l.), `WaouhMatchChatWindow` (706 l.), `react-markdown` + `remark-gfm`, `WaouhSellWizard`, `NativeSellSheet`, `WaouhPaymentDialog`, `WaouhTransactionCard`, `WaouhAuthGate`, `ChatImageLightbox` sont importés en statique alors que la moitié ne sert qu'à l'ouverture d'un dialog.
4. **Pas de cache offline pour `waouh-history`** : le SW exclut explicitement `/functions/` (`isApiOrSupabase`) ⇒ aucune réponse historique disponible hors-ligne, et chaque ouverture refait l'appel réseau même si rien n'a changé.
5. **WaouhMatchChatWindow** : `runInitialLoad` lance toujours un fetch (même en mode silent) au montage de chaque onglet ; tous les onglets fetchent en parallèle au lieu de prioriser l'actif.
6. **Geolocation + city lookup** lancés au montage de l'écran chat (RTT supplémentaire qui retarde le premier paint utile).
7. **`waouh-history` retourne notifications + conversations** dans le même appel initial (`includeMeta: true`) ⇒ payload plus gros que nécessaire pour le premier rendu.

## Plan de correction

### A. Rendu instantané (cache-first, zéro attente)
- `WaouhWebChat` et `WaouhMatchChatWindow` : si un snapshot localStorage existe → marquer `initialLoading=false` immédiatement, faire la réconciliation réseau en arrière-plan (mode silent déjà partiellement présent, le généraliser et virer tout spinner bloquant quand cache présent).
- Ajouter un cache **IndexedDB** (via un petit wrapper `idb-keyval`-like maison, ~30 lignes, pas de dep) pour stocker jusqu'à 500 msg par thread — survit aux limites de localStorage (5 Mo) et accepte des historiques plus longs.

### B. Paralléliser les requêtes initiales
- Dans `WaouhWebChat` useEffect open : lancer `waouh_users` lookup et `waouh-history(sessionId)` **en parallèle** (`Promise.all`). L'edge function `waouh-history` accepte déjà `sessionId` + `authUserId` ⇒ pas besoin d'attendre la résolution des `waouh_users.id` côté client.
- Séparer `includeMeta` (notifs + conversations) dans un second appel `requestIdleCallback` après le premier paint.

### C. Stabiliser le Realtime
- Subscribe **une seule fois** par session, sur un canal `waouh_msgs_session_${sessionId}` (filtre `web_session_id`), puis ajouter dynamiquement les filtres `user_id` via `.on(...)` supplémentaires sur le **même** channel quand `waouhIds` arrive — pas de teardown.
- Retirer `waouhIds.join(",")` des deps et utiliser un `ref` + `addFilter` impératif.

### D. Code-splitting agressif
- Convertir en `lazy()` + `Suspense` (fallback null) :
  - `WaouhSellWizard`, `NativeSellSheet`, `WaouhPaymentDialog`, `WaouhAuthGate`, `WaouhDealPaymentDialog`, `ChatImageLightbox`, `WaouhTransactionCard`.
- Remplacer `react-markdown` + `remark-gfm` par un renderer minimaliste maison (gras, italique, liens, listes, code inline — couvre 99% des messages WAOUH) ; conserver ReactMarkdown en lazy uniquement pour les messages contenant des tableaux/blocs code multiligne (détection regex). Économie estimée : ~80 kB gz sur le chunk principal du chat.
- `prefetch` les chunks chat dès le hover sur l'onglet "WAOUH Chat" de la liste.

### E. Service Worker — offline pour l'historique
- Étendre `public/sw.js` :
  - Reconnaître `*.supabase.co/functions/v1/waouh-history` comme une requête éligible **StaleWhileRevalidate** (cache `waouh-history-v1`, TTL 24 h via header `sw-cache-date`).
  - Idem pour `waouh-messages` GET et `waouh-match-chat` GET.
  - Quand offline : renvoyer la réponse cache + en-tête `x-from-sw-cache: 1` pour que le client puisse afficher un badge "Hors ligne".
- Précacher au `install` les chunks `waouh-*.js` listés via un manifeste émis au build (Vite plugin minimal `vite-plugin-precache-manifest` interne, ~40 lignes, ou simple fetch du `manifest.json` Vite).
- Bumper `VERSION` à `v5`.

### F. Optimisations secondaires
- `useWaouhGeolocation` : démarrer en `requestIdleCallback` (city badge non bloquant pour le premier render du chat).
- `WaouhMatchChatWindow` : fetch initial conditionnel à `active === true`. Les onglets inactifs hydratent uniquement depuis le cache, sans réseau, jusqu'à devenir actifs.
- Throttle des snapshots localStorage à 1 s (actuellement 300 ms) ⇒ moins de pression GC.
- Ajouter `<link rel="preconnect">` vers `*.supabase.co` dans `index.html` (déjà fait pour Google Fonts via `addResourceHints`, étendre).

## Détails techniques

```text
WaouhWebChat open useEffect (nouvelle séquence)
├── 0 ms   : cache hydraté (déjà fait, synchrone)
├── 0 ms   : Promise.all([
│             supabase.from(waouh_users)…,
│             supabase.functions.invoke('waouh-history',{includeMeta:false})
│           ])
├── ~RTT   : merge messages → setMessages
├── idle   : invoke('waouh-history',{includeMeta:true}) → notifs + conv
└── idle   : subscribe realtime channel (1 seul)
```

```text
Service Worker fetch
└── url.pathname.includes('/functions/v1/waouh-history')
      → staleWhileRevalidate('waouh-history-v1')   ← nouveau
```

Aucune modification du contrat `waouh-history` edge function ni du schéma DB. Compatible avec le lock v12 (chat sync flow).

## Risques & garde-fous
- Le rendu cache-first peut afficher brièvement des messages obsolètes : déjà mitigé par la réconciliation arrière-plan et le merge dédupliqué.
- Cache SW de réponses Supabase : limité aux endpoints idempotents en GET et avec en-tête de fraîcheur ; jamais pour POST/PUT/DELETE.
- Code-splitting : tester que les dialogs s'ouvrent toujours sans flash (Suspense fallback null = aucun flash).

## Fichiers impactés
- `src/components/waouh/WaouhWebChat.tsx`
- `src/components/waouh/WaouhMatchChatWindow.tsx`
- `src/components/waouh/useWaouhMatchChats.ts`
- `src/lib/waouhCache.ts` *(nouveau, wrapper IndexedDB)*
- `src/lib/miniMarkdown.tsx` *(nouveau, renderer léger)*
- `public/sw.js` *(extension cache + bump v5)*
- `index.html` *(preconnect Supabase)*

Gains attendus : **TTI chat < 100 ms** (cache présent), **0 spinner bloquant**, **historique disponible offline**, **~80 kB JS gz économisés** sur le chunk initial.