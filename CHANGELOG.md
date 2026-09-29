# Changelog plateforme Bot.bj / WAOUH

Format de version plateforme : `YYYY.MM.PATCH` (proposition, voir docs/PLAN_HARMONISATION.md).
Chaque entrée relie Web, Flutter et Supabase.

## 2026.09.29
- Base : `prod` @ f9b240e (identité canonique des produits, Deal Room premium).
- Flutter : 18.19.0+1786092819 (package `bj.bot.waouhapp`).
- Web : pas de version propre (package.json 0.0.0) ; référence = commit ci-dessus.
- Supabase `mvynepqulhflxtyymtzs` : dernière migration 20260929065715.
- Ajout au dépôt des migrations déjà appliquées en production :
  `20260929065700_waouh_v3_canonical_thread_guard`,
  `20260929065715_waouh_v3_commerce_events_rls_lockdown`.

## Historique Flutter (pubspec.yaml)
| Version | Date (+01:00) | Jalon |
|---|---|---|
| 18.14.1 | 2026-09-24 20:38 | Intégration NEXUS Global Discovery |
| 18.15.0 | 2026-09-25 13:20 | APK Deal Graph |
| 18.15.1 / 18.15.2 | 2026-09-28 18:24 / 18:41 | Android |
| 18.16.0 | 2026-09-28 19:47 | Parité Chat Web |
| 18.16.1 | 2026-09-28 20:47 | Chat UI restauré |
| 18.17.0 / 18.18.0 | 2026-09-28 21:59 / 22:35 | Chat Center canonique |
| 18.19.0 | 2026-09-28 23:55 | Identités catalogue/article séparées, Deal Room premium |
