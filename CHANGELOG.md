# Changelog plateforme Bot.bj / WAOUH

Format de version plateforme : `YYYY.MM.JJ` suivi d'un indice `.N` pour les livraisons du même jour (proposition, voir docs/PLAN_HARMONISATION.md).
Chaque entrée relie Web, Flutter et Supabase.

## 2026.09.29.5 (branche claude/harmonisation-phase-0-1, NON déployé en production)
- Résultats Nexus sans article → Deal Room directe (matérialisation d'un vendeur stub, action `transmit_offer` « Envoyer mon offre », politique de contact C0–C5 conservée, interrupteur `nexus_direct_deal`) — docs/NEXUS_DEAL_ROOM_DIRECTE_2026-09-29.md.
- Runbook de déploiement production (préparé, non exécuté) — docs/RUNBOOK_DEPLOIEMENT_PROD_2026-09-29.md.

## 2026.09.29.4 (branche claude/harmonisation-phase-0-1, NON déployé en production)
- Corrections E1–E6 du parcours (boutons de la notification vendeur, notification vérifiée, ordre de l'écho, « article vendu », identité du lecteur
  par le jeton, erreurs internes tracées) — docs/RAPPORT_CORRECTIONS_E1-E6_2026-09-29.md.
- E10/E11 : les acheteurs évincés sont prévenus (négociation fermée, boutons périmés retirés, reprise « De nouveau disponible » si l'accord tombe) ;
  une offre sur un article réservé/vendu est refusée. Nouveau module `_shared/waouh-evict.ts`.
- Fenêtres chaudes : boutons dans tous les états d'attente (Modifier mon offre, Poser une question, Annuler la commande) ; cartes produit avec
  bouton de prix intelligent (« Proposer 270 000 FCFA », un geste) ; libellés « contacter / trouver un moyen de contacter » remplacés partout
  (Web, Flutter 18.21.0, `waouh-agentic-core`) par un vocabulaire d'action commun (`docs/contracts/chat/hot-labels-fixtures.json`) avec garde-fou de test.
- Flutter 18.21.0+1786179221.

## 2026.09.29.3 (correctif appliqué en production le 29/09 avec l'accord de l'utilisateur, versionné 20260929131943 en base)
- Défaut trouvé par le test de bout en bout : le garde-fou `waouh_resolve_message_thread` (migration 20260929065700) utilise `min(id)` sur un uuid,
  agrégat inexistant : les insertions concernées échouent (11 erreurs relevées en production le 29/09). Correctif :
  supabase/migrations/20260929130000_waouh_v3_thread_guard_fix_uuid_min.sql. Détail : docs/E2E_PARCOURS_VENDEUR_ACHETEUR_2026-09-29.md.
- Ajout du banc `scripts/waouh-chat/verify/run-journey-e2e.sh` (parcours vendeur A / acheteur B sur Postgres local).

## 2026.09.29.2 (branche claude/harmonisation-phase-0-1, non déployé)
- Flutter 18.20.0+1786092821 : parité du chat avec le Web (`/app/chat`, référence) — boutons serveur via `waouh-commerce-action`,
  historique par `waouh-match-history`, verrou des conversations clôturées, requête d'envoi alignée (`product_title`, `correlation_id`),
  libellés de la liste. Détail et écarts restants : docs/PARITY_CHAT_WEB_FLUTTER.md.
- Tests de parité communs Web/Flutter (docs/contracts/chat/parity-fixtures.json).
- Web : aucun changement de code.

## 2026.09.29.1 (branche claude/harmonisation-phase-0-1, non déployé)
- Backend uniquement : embeddings alignés sur `gemini-embedding-2` (768 dimensions, normalisés) — voir docs/EMBEDDINGS_GEMINI_2.md.
- Rapatriement dans le dépôt de 22 fonctions Supabase déployées sans source (dont `a`, avec `a/agent-ai-studio.ts`) — voir supabase/functions/DEPLOYED_MANIFEST.md.
- Flutter : version 18.19.1+1786092820 (montée de version uniquement, aucun changement de code) pour produire un nouvel APK de test via la CI de la PR. Web : aucun changement de code, pas de nouvelle version.
- À faire au déploiement : redéployer `waouh-agent-ingest`, `waouh-agent-chat`, `waouh-agent-webhook`, puis `scripts/supabase/reindex-agent-chunks.mjs --apply`.

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
| 18.19.1 | 2026-09-29 | Montée de version seule (nouvel APK de test, backend embeddings gemini-embedding-2) |
| 18.20.0 | 2026-09-29 | Parité du chat avec le Web (boutons v3, historique serveur, conversation clôturée, requête d'envoi) |
