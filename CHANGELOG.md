# Changelog plateforme Bot.bj / WAOUH

Format de version plateforme : `YYYY.MM.JJ` suivi d'un indice `.N` pour les livraisons du même jour (proposition, voir docs/PLAN_HARMONISATION.md).
Chaque entrée relie Web, Flutter et Supabase.

## 2026.09.30.9
- Recette Flutter de production : une offre faite après un refus ouvre un nouveau fil ; « Retirer mon offre » envoyé avec l'ancien fil échouait (`out_of_stage`). `waouh-commerce-action` résout désormais le fil par la négociation (qui n'appartient qu'à un fil) avant le fil transmis. Lecture admin du fil (RLS) documentée dans la recette.

## 2026.09.30.8
- Retrait d'offre : le vendeur reçoit « L'acheteur a retiré son offre » (clé `offer_withdrawn_other`) au lieu de « a refusé ». Constaté en recette de production (S4h). Recettes : limite de 10 annonces/24h par compte à prendre en compte (les articles ZZ TEST sont antidatés après les essais).

## 2026.09.30.7
- Recette Flutter de bout en bout (`flutter_waouh_app/test/recette/recette_flutter_prod_test.dart`) : mêmes scénarios S1–S8 que la recette Web, exécutés avec le code de l'application (client d'action v3, boutons serveur → requêtes, historique, chat libre, avatar). Ignorée sans identifiants ; aucun effet sur la CI.

## 2026.09.30.6
- Nettoyage et mise au propre : « Retirer mon offre » (acheteur, offre en attente) sur Web, Flutter et serveur (`offer_withdrawn`, alias `retirer-offre`) ; typage `source_mix` et fixtures du guide avatar ; retrait des fichiers parasites (`deno.lock`, `__noop__`, sauvegarde `main.dart.bak_*`, `dist-mobile/`, `.temp` Supabase) et de 8 imports Flutter inutilisés ; `.gitignore` complété.

## 2026.09.30.5
- Recette de production (62/71) : historique vide pour les comptes à plus de 100 identités (lecture qui excluait la ligne canonique, la plus ancienne). `waouh-match-history` et `waouh-deal-ops` lisent toutes les identités ; Web : plus anciennes + plus récentes (`identityIds.ts`). Détail : docs/RECETTE_COMPLETE_2026-09-30.md §7.

## 2026.09.30.4
- Recette Flutter + Web : script `scripts/waouh-chat/recette/recette-comptes.mjs` (8 scénarios : vendeur, acheteur, vendeur-acheteur, refus, questions, garde-fous, concurrence, chat libre, avatar), audit de production en lecture seule, rapport `docs/RECETTE_COMPLETE_2026-09-30.md`. Recette de production à lancer par le propriétaire.

## 2026.09.30.3 (branche claude/harmonisation-phase-0-1)
- Correctif général des identités (publication qui recréait une ligne `waouh_users`, lectures plafonnées, choix de ligne non déterministe) et garde anti-doublon des messages (`buyer_interest`, `new_buyer`, écho de réouverture). Détail : docs/E2E_PRODUCTION_2026-09-30.md.

## 2026.09.30.2 (branche claude/harmonisation-phase-0-1, NON déployé)
- Test de bout en bout en production : le vendeur était refusé (403 « non participant ») sur la contre-proposition car seules 50 identités par compte étaient lues (B en a 96, A en a 177, une ligne par session Web).
  Correctif : lecture paginée des identités (`waouh-identity.ts`) et recherche du fil par lots. Détail : docs/E2E_PRODUCTION_2026-09-30.md.

## 2026.09.30.1 (branche claude/harmonisation-phase-0-1)
- Test de bout en bout acheteur/vendeur (parcours 1, 2, 3) sur le projet de test : accord, négociation, préparation conformes, thread_id canonique stable à chaque étape. Défaut corrigé : notifications dans l'application sans `thread_id` (livraison, paiement, `new_buyer`) — `_shared/waouh-notif-thread.ts`.
  Livreur → Terminé non exécutés (compte admin de test). Détail : docs/E2E_ACHETEUR_VENDEUR_THREAD_2026-09-30.md.

## 2026.09.29.11 (branche claude/harmonisation-phase-0-1)
- Web /app/chat dégagé : la conversation occupe tout l'espace ; Échanges, Statuts et Radar passent dans un tiroir à gauche (boutons dans l'en-tête, lien `?tab=radar|statuses`), épinglable à côté du chat dès 1280 px (choix mémorisé).
  Tablette / portable 13" (768–1279 px) : chat pleine largeur, tiroir par-dessus, boutons tactiles ; téléphone : parcours mobile inchangé. Un seul en-tête (le bouton du tiroir rejoint l'en-tête de Muse).
  La carte PrivatAI quitte le chat pour le menu « Agents IA » ; les pastilles « 99+ » deviennent un chiffre (≤ 9, sinon « 9+ ») et seulement sur le Chat. Aucun changement Flutter ni Supabase. Détail : docs/CHAT_ESPACE_DEGAGE_2026-09-29.md.

## 2026.09.29.10 (branche claude/harmonisation-phase-0-1)
- Avatar ACTIF (Web + Flutter) : tableau de mission en direct dans la barre du guide (à vous · recherches · contacts · négociations · veilles · commandes),
  points qui parlent des recherches, contacts et négociations en cours et rappellent l'objectif d'une mission ; nouvelle action `status` de `waouh-avatar-briefing`.
  Notification dans l'application pour tout message spontané (point planifié, relance, voie de contact ouverte) : ligne `waouh_notifications` (`avatar_point`) reçue en même temps par le Web (cloche, toast, notification navigateur)
  et par Flutter (bannière premium, tap = ouvre le chat), même si l'autre client est ouvert. Aucune migration. Détail : docs/AVATAR_LIVE_CHAT_2026-09-29.md.

## 2026.09.29.9 (branche claude/harmonisation-phase-0-1)
- L'avatar PARLE dans le chat : accueil, points, rapports et prochaines étapes arrivent comme 2 à 3 bulles de conversation déjà lisibles (plus de carte à ouvrir), avec « l'avatar écrit… » et apparition séquencée en direct
  (l'historique s'affiche d'un coup), boutons sur la dernière bulle. Ouverture sans nouveauté : une seule phrase courte, jamais le même point répété.
  Évènements d'offre (relance possible, voie ouverte, clôture) : bulle dans la Deal Room + WhatsApp par défaut (réglable) ; bilans réguliers : chat seulement, WhatsApp sur option.
  Nouveau : migration `20260929180000` (`notify_events` actif, `notify_digest` coupé). Anciennes cartes de l'historique toujours lues. Détail : docs/AVATAR_LIVE_CHAT_2026-09-29.md.

## 2026.09.29.8 (branche claude/harmonisation-phase-0-1, NON déployé en production)
- L'avatar guide (Web + Flutter) : accueil et point à chaque ouverture (2 à 3 phrases, aide « Je peux aussi »), « Faire le point » à la demande, points réguliers réglables (jamais / 1 h / 4 h / jour / semaine)
  avec heures calmes, carte premium (activités, veilles, contacts, prochaines étapes, boutons), barre du guide et réglages ; jamais d'envoi à un tiers.
  Nouveau : fonction `waouh-avatar-briefing`, migration `20260929160000` (`waouh_avatar_prefs`, installeur `waouh_schedule_avatar_briefing`). Détail : docs/AVATAR_GUIDE_2026-09-29.md.

## 2026.09.29.7 (branche claude/harmonisation-phase-0-1, NON déployé en production)
- Deal Room vivante : politique de contact C0–C5 sans impasse (`_shared/waouh-contact-path.ts`, le consentement du tiers n'est jamais contourné : veille de l'avatar quand l'envoi n'est pas possible),
  points d'avancement et synthèse de l'avatar (Web + Flutter), suivi `waouh-nexus-followup` (notes et boutons, aucun envoi automatique), relance manuelle limitée à 1/24 h, migration d'installation du suivi.
  Corrige aussi : montant absent du message d'accroche (colonne inexistante), double envoi au double tap. Détail : docs/AVATAR_DEAL_ROOM_VIVANTE_2026-09-29.md.

## 2026.09.29.6 (branche claude/harmonisation-phase-0-1, NON déployé en production)
- E7 : la publication rend l'issue du fan-out acheteurs (`buyers_notified`), plus d'échec silencieux. E8 : `waouh-sell/buy/negotiate-handler` retirés (HTTP 410), Flutter route tout vers `waouh-channel-in`.
  E9 : `waouh-notify-dispatch` réservé à la clé service. Pointage public : PIN limité (migration `20260929140000`, HTTP 429). `waouh-stock-ingest` : garde SSRF.
  P2 : migration renommée `20260929131943_…` (identique à la base). Imports supabase-js épinglés sur la chaîne du chat. Workflow « Deploy WAOUH Chat v2 » étendu.
  Détail : docs/RAPPORT_DURCISSEMENT_E7-E9_2026-09-29.md.

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
  supabase/migrations/20260929131943_waouh_v3_thread_guard_fix_uuid_min.sql. Détail : docs/E2E_PARCOURS_VENDEUR_ACHETEUR_2026-09-29.md.
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
