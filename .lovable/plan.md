## Diagnostic

La production ne bloque pas à cause de Supabase ni de l’auth pour l’erreur fournie. Le signal important est :

```text
icons-Det9xvbz.js:20 Uncaught ReferenceError: Cannot access 'a' before initialization
```

Cela indique un crash JavaScript dans un chunk de production, généré par Vite/Rollup/Terser. En développement Lovable, le code n’est pas minifié ni découpé de la même manière, donc l’application fonctionne. En production, le chunk `icons-*` vient très probablement du découpage manuel `manualChunks` qui force `lucide-react` dans un chunk séparé nommé `icons`, combiné à la minification Terser/mangle. Le navigateur charge ce chunk, il plante avant l’initialisation de React, puis l’utilisateur reste sur le spinner HTML de `index.html`.

L’erreur `chrome-extension://... content_reporter.js` vient d’une extension Chrome et n’est pas la cause principale de Bot.BJ.

## Plan de correction

1. Modifier `vite.config.ts`
   - Supprimer le chunk manuel `icons` pour `lucide-react`.
   - Supprimer aussi les restes inutiles `recharts` / `d3-*` dans `manualChunks`, puisque la librairie chart a été retirée.
   - Remplacer la minification production `terser` par `esbuild`, ou au minimum désactiver le mangle Terser agressif.
   - Garder `base: '/'`, `outDir: 'dist'`, `emptyOutDir: true`.
   - Ajouter un commentaire clair dans le code expliquant que cette configuration évite les erreurs TDZ `Cannot access before initialization` en production.

2. Corriger la configuration nginx utilisée par Docker
   - Le Dockerfile copie `nginx.conf`, pas `default.conf`.
   - Adapter donc `nginx.conf` pour différencier :
     - `index.html` : `no-cache`, afin que le navigateur récupère toujours le nouvel index après déploiement.
     - `/assets/` : cache long `immutable`, car les fichiers sont hashés.
   - Ajouter des headers anti-cache pour les fichiers racine sensibles (`/`, `/index.html`, `/manifest.json`, `/sw.js`).

3. Stabiliser `index.html`
   - Supprimer les meta `Cache-Control` côté HTML si nécessaire, car le vrai contrôle cache doit venir de nginx.
   - Garder le spinner initial, mais s’assurer que les chemins critiques restent cohérents avec `base: '/'`.

4. Vérification après correction
   - Rechercher les références restantes à `recharts`, `recharts-stub`, `charts`, et `localhost` dans le code source.
   - Vérifier que la configuration de build ne génère plus de chunk manuel `icons-*`.
   - La validation finale attendue : après redéploiement Docker, le navigateur ne doit plus charger un chunk `icons-*` isolé qui plante, et React doit remplacer le spinner HTML par l’application.

## Cause à retenir

La différence dev/prod vient du build production : découpage manuel + minification. Le chunk `icons-*` plante avant que l’app React ne démarre, donc l’écran reste sur “Chargement de Bot.BJ...”. La correction doit donc se faire côté `vite.config.ts` et cache nginx, pas côté Supabase.