
# Plan : corriger l'écran blanc en production

## Contexte vérifié dans le repo

- **Déploiement** : Docker + nginx (`Dockerfile`, `default.conf`, `docker-compose.yml`) sur `bot.bj`. Ce n'est **ni Netlify ni Vercel** — donc pas besoin de `public/_redirects` ni de `vercel.json`. Le SPA fallback est déjà géré par `try_files $uri $uri/ /index.html;` dans `default.conf`.
- **Vite** : `base: '/'` et `outDir: 'dist'` déjà présents. Manque seulement `emptyOutDir: true`.
- **Supabase client** : URL + anon key **codées en dur** dans `src/integrations/supabase/client.ts` (pas via `import.meta.env`). C'est volontaire (fichier auto-généré Lovable). Aucune variable critique n'est donc bloquante en prod — on ajoute quand même un `.env.example` pour documenter.
- **AuthContext** : `isLoading: true` initial + `getSession()` + `onAuthStateChange` déjà bien implémentés (lignes 110-195). Pas de boucle infinie côté auth, le pattern demandé est déjà appliqué.
- **Router** : `BrowserRouter` déjà utilisé dans `App.tsx`.
- **ErrorBoundary** : le composant existe (`src/components/ErrorBoundary.tsx`) mais **n'enveloppe pas `<App />` dans `main.tsx`** → si une erreur de chunk lazy ou de render se produit au boot en prod, l'écran reste blanc sans message.

## Changements à faire

### 1. `src/main.tsx`
Envelopper `<App />` avec `<ErrorBoundary>` pour capturer toute erreur de boot (notamment échecs `lazy()` quand un chunk hashé est introuvable après redéploiement).

### 2. `src/components/ErrorBoundary.tsx`
Détecter les erreurs `ChunkLoadError` / `Loading chunk ... failed` et déclencher un `window.location.reload()` automatique une seule fois (via `sessionStorage` flag) — cause classique du blanc après nouveau déploiement quand le navigateur a un vieux `index.html` en cache pointant vers un ancien hash.

### 3. `vite.config.ts`
- Ajouter `emptyOutDir: true` dans `build`.
- Conserver `manualChunks` actuel (il fonctionne ; le supprimer casserait les optimisations existantes — on ne touche pas).
- Confirmer `base: '/'` (déjà OK).

### 4. `index.html`
Ajouter `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">` pour forcer le navigateur à toujours re-fetch `index.html` (le `default.conf` le fait déjà côté serveur, on double côté client par sécurité).

### 5. `.env.example` (nouveau)
Créer à la racine, sans valeurs sensibles :
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

### 6. Garde explicite Supabase
Dans `src/integrations/supabase/client.ts` ajouter en haut un `console.error` si les constantes deviennent vides un jour (sécurité défensive, n'affecte rien aujourd'hui).

### 7. Vérification post-build
Après les changements, lancer un build local pour confirmer la génération de `dist/index.html` + `dist/assets/`.

## Ce que je NE fais PAS (et pourquoi)

- **Pas de `public/_redirects` ni `vercel.json`** → hébergement nginx, déjà géré.
- **Pas de refonte d'`AuthContext`** → le pattern `isLoading` est déjà correct, le modifier casserait le flux OAuth en place.
- **Pas de figeage des versions `package.json`** (suppression des `^`) → risque élevé de casser des peer deps qui marchent ; à faire uniquement si un conflit réel est identifié. Aucun signalé.
- **Pas de suppression de `manualChunks`** → la config actuelle de splitting fonctionne ; la retirer regrouperait tout dans un bundle géant et dégraderait le LCP en prod.
- **Pas de modification du `sw.js`** → déjà neutralisé en kill-switch dans la dernière itération.
- **Pas de scan `grep localhost`** automatique destructif → s'il y a des occurrences, elles sont en commentaires/configs dev et n'impactent pas le build.

## Résultat attendu

L'app charge en production. Si une erreur survient (chunk manquant après redeploy, exception render), l'utilisateur voit soit un rechargement automatique soit la page d'erreur d'`ErrorBoundary` au lieu d'un écran blanc.
