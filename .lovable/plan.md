## Plan de correction production

Objectif: supprimer définitivement l’erreur bloquante `Uncaught ReferenceError: Cannot access 'a' before initialization` dans `icons-*.js`, sans modifier `.github`, `Dockerfile` ni `docker-compose.yml`.

### Diagnostic

- L’erreur vient du bundle production `icons-*.js`, généré par le découpage manuel de `lucide-react` dans `vite.config.ts`.
- Le projet importe massivement `lucide-react` dans plus de 400 endroits, donc isoler toute la librairie dans un chunk `icons` augmente le risque de bug d’ordre d’initialisation après minification.
- Les erreurs précédentes `maps-*.js createContext` et maintenant `icons-*.js Cannot access 'a' before initialization` pointent vers la même cause probable: découpage manuel trop agressif + minification Terser sur certains modules ESM React.
- L’erreur `chrome-extension://... content_reporter.js Cannot use import statement outside a module` vient d’une extension Chrome locale, pas de l’application. Elle ne doit pas bloquer le déploiement.

### Corrections à appliquer

1. Modifier uniquement `vite.config.ts`.
2. Supprimer le chunk manuel séparé `icons` pour `lucide-react` afin que Vite/Rollup laisse les icônes dans les chunks consommateurs ou `vendor`.
3. Rendre le découpage `manualChunks` plus conservateur pour éviter les cycles entre chunks React, wrappers React, maps, charts et icônes.
4. Remplacer la minification production `terser` par `esbuild`, ou au minimum désactiver les options Terser agressives, car l’erreur TDZ `Cannot access before initialization` apparaît souvent après renommage/minification de modules ESM complexes.
5. Garder les exclusions lourdes existantes (`@huggingface/transformers`, `ffmpeg`, etc.) pour ne pas casser les optimisations déjà utiles.
6. Ne toucher à aucun fichier dans `.github`, ni `Dockerfile`, ni `docker-compose.yml`.

### Fichiers concernés

- `vite.config.ts` uniquement.

### Validation prévue

- Vérifier que la configuration ne génère plus de chunk dédié `icons-*.js`.
- Vérifier que le build production ne dépend plus d’un chunk `icons` isolé susceptible de casser l’ordre d’initialisation.
- Confirmer que l’erreur d’extension Chrome est externe et non corrigible dans le code applicatif.

### Résultat attendu

La production doit charger la page sans écran blanc, sans erreur bloquante dans `icons-*.js`, avec un bundle plus stable et moins sensible aux cycles de chunks.