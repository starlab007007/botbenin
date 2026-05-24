## Diagnostic actuel

Audit des fichiers d'entrée (`index.html`, `main.tsx`, `App.tsx`, `vite.config.ts`, `package.json`) — plusieurs goulots majeurs identifiés :

### Problèmes critiques détectés
1. **`index.html` casse le cache navigateur** : les balises `<meta http-equiv="Cache-Control" content="no-cache, no-store">`, `Pragma: no-cache`, `Expires: 0` forcent un re-téléchargement complet à chaque visite (assets JS/CSS inclus). Effet : chaque navigation = cold load.
2. **Double CSP** : deux balises `Content-Security-Policy` se chevauchent (la première `upgrade-insecure-requests`, la seconde restrictive). Le navigateur applique l'intersection → blocages aléatoires + warnings coûteux.
3. **Chunks Vite mal calibrés** : `manualChunks` regroupe seulement 2 composants Radix dans `ui`, le reste (20+ Radix, recharts, leaflet, mapbox, ffmpeg, huggingface, pdfjs, jspdf) part dans le bundle principal ou vendor → bundle initial gonflé.
4. **Dépendances lourdes chargées globalement** :
   - `@huggingface/transformers` (~50 Mo), `@ffmpeg/ffmpeg`, `pdfjs-dist`, `mapbox-gl`, `leaflet` + CSS leaflet importé dans `main.tsx` (chargé pour tout le monde même hors carte).
   - `recharts`, `jspdf`, `react-pdf`, `jszip` — utilisés sur quelques pages seulement.
5. **`Index` (HomePage) non lazy** : importé statiquement dans `App.tsx` (`import Index from "./pages/Index"`), donc inclus dans le bundle initial avec tous ses sous-composants.
6. **Pas de préchargement intelligent** des routes (pas de `<link rel="modulepreload">` ni de prefetch au survol).
7. **React Query** : aucun `staleTime`/`gcTime` configuré globalement → refetch à chaque mount, requêtes Supabase dupliquées (ex. `DashboardPage` enchaîne 3 requêtes séquentielles dans `useEffect`).
8. **Pas d'optimisation des images** : pas de plugin `vite-imagetools`, pas de `loading="lazy"` systématique, pas de `width/height` → CLS, LCP dégradés.
9. **Service Worker** (`/sw.js`) enregistré mais probablement sans stratégie cache-first sur les assets hashés.
10. **`useActivityTracking`** + Google Analytics + monitoring Web Vitals s'exécutent dans le main thread au boot sans `requestIdleCallback`.
11. **63 pages, ~150 hooks** : composants Toast/Sonner/Tooltip/Theme empilés autour de tout — pas vraiment problématique sauf si re-render global.

## Plan d'optimisation

### Phase 1 — Quick wins (impact maximal, 0 risque)
- **`index.html`** : supprimer les `<meta>` `Cache-Control/Pragma/Expires`, supprimer la CSP `upgrade-insecure-requests` dupliquée (garder uniquement la CSP complète), ajouter `<link rel="preload">` pour le logo LCP et les fonts critiques, ajouter `fetchpriority="high"` sur l'image LCP.
- **`main.tsx`** : retirer l'import global `leaflet/dist/leaflet.css` ; le déplacer dans les composants qui montent une `MapContainer` (lazy CSS via dynamic import).
- **`App.tsx`** : passer `Index` en `lazy()` comme les autres pages.

### Phase 2 — Code-splitting agressif (Vite)
Refondre `vite.config.ts > rollupOptions.output.manualChunks` en fonction :
```ts
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'react';
    if (id.includes('@radix-ui')) return 'radix';
    if (id.includes('recharts') || id.includes('d3-')) return 'charts';
    if (id.includes('leaflet') || id.includes('mapbox')) return 'maps';
    if (id.includes('@huggingface') || id.includes('onnxruntime')) return 'ai-hf';
    if (id.includes('@ffmpeg')) return 'ffmpeg';
    if (id.includes('pdfjs') || id.includes('jspdf') || id.includes('react-pdf')) return 'pdf';
    if (id.includes('@supabase')) return 'supabase';
    if (id.includes('framer-motion') || id.includes('motion')) return 'motion';
    if (id.includes('lucide-react')) return 'icons';
  }
}
```
Effet attendu : bundle initial 60–75 % plus léger.

### Phase 3 — Lazy-load des libs lourdes côté composants
- `@huggingface/transformers`, `@ffmpeg/ffmpeg`, `pdfjs-dist`, `jspdf`, `mapbox-gl`, `leaflet`, `recharts` → encapsuler chaque usage dans un `await import('...')` au moment du clic / mount de la feature concernée (pas au top-level).
- Ajouter `optimizeDeps.exclude` pour `@huggingface/transformers` et `@ffmpeg/ffmpeg` afin que Vite ne les pré-bundle pas en dev.

### Phase 4 — React Query & data
- Centraliser `QueryClient` avec `defaultOptions: { queries: { staleTime: 60_000, gcTime: 5*60_000, refetchOnWindowFocus: false, retry: 1 } }`.
- `DashboardPage` : paralléliser `fetchDashboardStats / fetchUserPermissions / fetchMyBots` via `Promise.all` + transformer les `useEffect` en `useQuery` (cache partagé entre routes).

### Phase 5 — Images & assets
- Ajouter `vite-imagetools` (dev dep) + convertir les images critiques (hero, logo) en AVIF/WebP avec import `?format=avif&as=picture`.
- `OptimizedImage` : forcer `width/height` obligatoires + `decoding="async"` + `fetchpriority` configurable.
- Script `scripts/optimize-public-images.mjs` (sharp) pour pré-générer WebP des assets de `public/`.

### Phase 6 — Préchargement routes
- Ajouter un util `prefetchRoute(importer)` appelé `onMouseEnter`/`onFocus` des liens de navigation principaux (Sidebar, Header) → import dynamique en idle.
- `requestIdleCallback` autour de `registerServiceWorker()`, `initPerformanceMonitoring()`, GA.

### Phase 7 — Service Worker
- Réécrire `public/sw.js` avec stratégie :
  - `cache-first` immutable pour `/assets/js/*`, `/assets/images/*`, `/assets/fonts/*` (fichiers hashés).
  - `network-first` avec fallback cache pour `index.html`.
  - Skip waiting + clients claim.

### Phase 8 — Mesure
- Lancer Lighthouse avant/après via `browser--performance_profile` sur 3 pages clés (`/home`, `/dashboard`, `/waouh`) et rapporter LCP / CLS / INP / Total JS transféré.

## Détails techniques (récap fichiers)

```text
index.html                      → nettoyage meta cache + CSP + preloads LCP
src/main.tsx                    → retirer import leaflet CSS
src/App.tsx                     → lazy(Index), QueryClient defaultOptions, idle init
vite.config.ts                  → manualChunks fonction, optimizeDeps.exclude, vite-imagetools
src/components/OptimizedImage   → width/height requis, fetchpriority
src/utils/registerServiceWorker → wrap requestIdleCallback
public/sw.js                    → réécriture stratégies cache
src/pages/DashboardPage.tsx     → Promise.all + useQuery
src/pages/{features ai/pdf/map} → dynamic import des libs lourdes
src/components/layouts/*Layout  → prefetch onHover sur NavLinks
package.json                    → +vite-imagetools, +sharp (dev)
```

## Hors scope
- Pas de migration SSR/Next.js (lourd, hors demande).
- Pas de refonte UI/visuelle.
- Pas de modification des règles RLS Supabase ni des edge functions.

Une fois ces phases livrées, l'objectif est : LCP < 2.0 s sur 4G simulé, JS initial < 250 Ko gzip, INP < 200 ms sur toutes les pages.
