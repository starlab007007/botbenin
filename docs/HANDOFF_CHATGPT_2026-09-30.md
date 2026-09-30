# Point de passation — 2026-09-30

## Dépôt, branche et déploiement de référence
- Dépôt : `starlab007007/botbenin`. **Branche de référence : `prod`** (tout ce qui est en production y est fusionné par PR squash). Les branches de travail (`claude/harmonisation-phase-0-1`) sont recréées depuis `origin/prod` à chaque lot.
- Supabase production : projet `mvynepqulhflxtyymtzs`. Les migrations sont appliquées à la main (MCP `apply_migration`) puis la version est alignée dans `supabase_migrations.schema_migrations`.
- Workflows : Web = `deploy.yml` (« Deploy React App botbj »), Edge = `deploy-waouh-chat-v2.yml`, CI Web/Edge = `waouh-web-muse-nexus-ci.yml` (liste explicite de fichiers `deno test`), CI Flutter = `waouh-flutter-muse-nexus-ci.yml` (construit l'APK arm64, artefact `app-arm64-v8a-release.apk`, se lance sur PR/push touchant `flutter_waouh_app/**` ou en `workflow_dispatch`).
- Version plateforme : fichier `VERSION` + `CHANGELOG.md`. Flutter : `flutter_waouh_app/pubspec.yaml` (`18.21.2+1790788852`).

## Générer l'APK et la dernière version Web
- APK : Actions → « WAOUH Flutter Muse NEXUS CI » → Run workflow sur `prod` → artefact « APK ». Augmenter le `+build` de `pubspec.yaml` pour qu'il s'installe par-dessus l'ancien.
- Web : fusionner dans `prod` déclenche `deploy.yml` automatiquement.

## État en production (fin de journée)
Partenaire : intérêt unique, notifications sans doublon (PR 70–72) · sources unifiées avec classement par qualité (PR 73) · ouverture des sources au chat + SerpAPI (PR 74) · tâches de fond pg_cron : avatar (:23), suivi Nexus (:07, inactif tant que `nexus_direct_deal` est fermé), Radar 5 min, Apify/sites 6 h, SerpAPI 05:17 UTC.

## Recettes à rejouer (Codespaces)
Voir `scripts/waouh-chat/recette/` (Web : `recette-comptes.mjs`, partenaire : `test-interet-partenaire.mjs`) et `flutter_waouh_app/test/recette/recette_flutter_prod_test.dart`. Limite : 10 publications / 24 h / compte de test.

## Reste à la main du propriétaire
Campagnes Radar après la pause (30/09 23:53 UTC) · numéros exposés sur `waouh_articles.contact_whatsapp` (vue + colonnes explicites avant retrait) · clés d'API en clair dans `waouh_radar_api_configs` (Vault + rotation) · cause du « ko » Apify · sources désactivées (Facebook/Instagram Business, Telegram, TikTok) à connecter · boucle de retour des correspondances Radar.

## Pièges connus
Les fichiers `*-test.ts` ne sont pas découverts automatiquement (ajouter la ligne en CI) · la CI type-check les tests (pas de `--no-check`) · le déploiement Supabase échoue parfois en 500/esm.sh : relancer les jobs en échec · écriture dans le Vault refusée à l'agent.
