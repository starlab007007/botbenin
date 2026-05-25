## Diagnostic

La production sert actuellement `index-C5IMKMbW.js`, `react-CxMR-VaM.js` et `charts-CUJi52dS.js`. L’erreur `Cannot access 'e' before initialization` vient d’un cycle de dépendance entre chunks :

```text
charts-CUJi52dS.js -> importe React depuis react-CxMR-VaM.js
react-CxMR-VaM.js -> importe un helper depuis charts-CUJi52dS.js
```

Ce cycle est créé par le découpage manuel Vite/Rollup : `react-router` est inclus dans le chunk `react`, tandis que certains helpers communs sont remontés dans `charts`. En développement, les modules ne sont pas packagés pareil, donc le bug ne se voit pas.

L’erreur `chrome-extension://... Cannot use import statement outside a module` vient d’une extension Chrome, pas du site Bot.bj.

## Plan de correction

1. Modifier `vite.config.ts` pour supprimer le cycle de chunks :
   - isoler `react`, `react-dom` et `scheduler` dans le chunk `react` uniquement ;
   - mettre `react-router` / `react-router-dom` dans un chunk séparé `router` ;
   - garder `recharts` et `d3-*` dans `charts` ;
   - ajouter un chunk `vendor` fallback pour les dépendances non classées afin d’éviter que des helpers communs soient injectés dans `charts`.

2. Renforcer la vérification de déploiement dans `.github/workflows/deploy.yml` :
   - après build, vérifier qu’aucun chunk `react-*.js` n’importe `charts-*.js` ;
   - si ce cycle réapparaît, faire échouer le déploiement au lieu de publier une version cassée.

3. Préparer le redéploiement production :
   - une fois les fichiers modifiés, utiliser le bouton Publish/Update de Lovable ou laisser le workflow GitHub Actions se déclencher sur `main`/`prod` ;
   - côté production, refaire un hard refresh ou désenregistrer l’ancien Service Worker si le navigateur garde une ancienne version.

## Résultat attendu

Après redéploiement, `react-*.js` ne dépendra plus de `charts-*.js`, `charts-*.js` pourra charger React normalement, et le dashboard post-authentification ne devrait plus tomber sur la page d’erreur en production.