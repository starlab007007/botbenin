## Déploiement final

Pour pousser toutes les optimisations et corrections récentes en production :

### Étapes
1. **Frontend** — Cliquer sur **Publish → Update** en haut à droite de l'éditeur Lovable. Cela publie les changements de :
   - `index.html` (cache headers, preload LCP)
   - `vite.config.ts` (chunks optimisés)
   - `src/App.tsx`, `src/main.tsx` (lazy loading, idle init)
   - `src/components/LoadingSpinner.tsx`, `MainLayout.tsx` (fallback différé)
   - `public/sw.js` (service worker cache-first)

2. **Backend (déjà déployé automatiquement)** :
   - Edge function `waouh-waha-sync-contacts` (sync contacts WAHA corrigée)
   - Edge function `waouh-catalog-backup` (backups auto + manuel)
   - Migration SQL (table de backups)

3. **VPS Docker (bot.bj)** — Le workflow GitHub Actions `deploy.yml` se déclenche automatiquement au push sur `main`. Rien à faire manuellement.

### Vérifications après déploiement
- Ouvrir `/admin/waouh` → tester **Synchroniser contacts WAHA** (doit réussir)
- Tester **Backup manuel** et **Export Google Sheets / Excel** dans le catalogue unifié
- Naviguer entre pages → vérifier qu'il n'y a plus de spinner plein écran
- Lighthouse sur `/` → LCP < 2.5s attendu

### Notes
Aucun changement de code dans cette étape — c'est uniquement une action de publication côté utilisateur. Je ne peux pas cliquer "Update" à votre place.

<presentation-actions>
<presentation-open-publish>Publier l'application</presentation-open-publish>
</presentation-actions>
