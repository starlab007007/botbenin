# Plan d'harmonisation Web / Flutter / Supabase

Principes : une source de vérité (`prod`), un backend canonique, une version plateforme datée,
aucun changement de production hors dépôt. Constats : voir AUDIT_HARMONISATION_2026-09-29.md.

## Phase 0 — gel (fait dans cette branche : docs + VERSION + CHANGELOG)
Tag de sauvegarde `baseline-2026-09-29` sur f9b240e (à poser après validation).
## Phase 1 — Supabase = dépôt
1. Migrations du 29/09 versionnées (fait ici).
2. Réconcilier l'historique (`supabase migration repair`), contrôle par `db diff` hors production.
3. Rapatrier les 24 fonctions absentes : manifeste fait (`supabase/functions/DEPLOYED_MANIFEST.md`) ; copie exacte via
   `scripts/supabase/pull-deployed-functions.sh` (CLI, token requis), relecture du diff, puis commit. Corriger les slugs trompeurs.
4. Décider des 16 fonctions non déployées ; déployer d'abord `waouh-chat-reconcile`.
## Phase 2 — versioning
Version plateforme `YYYY.MM.PATCH` (fichier VERSION), tags `platform/…`, `flutter/…`, `web/…`.
Build Flutter dérivé de la CI ; version visible dans les apps ; contrôle CI du contrat v3 Web/Flutter.
## Phase 3 — branches
`prod` protégée ; nommage feat/fix/release ; archiver par tags puis supprimer backup/tmp/edit/local/test ;
trier feat/* et fix/* sur liste validée ; statuer sur `main`.
## Phase 4 — CI/CD
Un workflow par domaine (web, flutter, supabase), contrôle de dérive nocturne, environnement de test,
retour arrière documenté, suppression des workflows temporaires.
## Phase 5 — hygiène
Un seul gestionnaire de paquets Web, retrait des fichiers générés/morts, rapports racine rangés dans docs/,
ARCHITECTURE.md, audit des fonctions `verify_jwt = false`.
