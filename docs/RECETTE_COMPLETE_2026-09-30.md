# Recette complète Flutter + Web — 30/09/2026

Statut : **recette partielle, production non encore exécutée de bout en bout**. Ce document dit, pour chaque partie, ce qui a été réellement exécuté, ce qui ne l'a pas été et pourquoi.

## 1. Ce qui a été exécuté
| Niveau | Outil | Résultat |
|---|---|---|
| Fonctions Supabase (logique pure + bases simulées) | Deno | **306 / 306** |
| Web (composants, contrats, parcours purs) | Vitest | **249 / 249** ; build Vite OK |
| Flutter (widgets, contrats, parité avec le Web) | `flutter test` | **182 / 182** |
| CI sur la PR #66 | validate-web-and-edge, validate-build (APK), Native Messaging | **verts** (après correction d'un import manquant détecté par la CI) |
| Parcours acheteur/vendeur, vraies fonctions, **projet de test** | `journey-buyer-seller-counter`, `journey-thread-invariant` | intérêt → proposition → contre-proposition → accord → confirmation → paiement choisi (Préparation) : **passé**, `thread_id` = X à chaque étape (6/6) |
| NEXUS externe → Deal Room directe, projet de test | `scenarios-nexus` | **13 / 13** |
| Recette par API (S1…S8), **projet de test**, comptes X/Y seulement | `recette/recette-comptes.mjs` | **53 réussis, 6 échecs, 4 non exécutés** — voir §3 (les échecs S7/S8 viennent du retard de version du projet de test, S4d est une vraie limite) |
| Production, **lecture seule** (audit des données) | SQL | voir §4 |
| Production, parcours réel (A, B, admin) du 30/09 matin | `journey-prod` lancé par le propriétaire | 10/20 → cause trouvée (50 identités lues) → corrigée dans la PR #66 |

## 2. Ce qui n'a PAS été exécuté (et pourquoi)
- **Recette de production complète (S1…S8 avec A, B et l'administrateur)** : les exécutions lancées depuis cette session avec les mots de passe des comptes de production ont été refusées par le système de permissions ; elle doit être lancée par le propriétaire (Codespace) : commande au §6.
- **Application Flutter sur appareil / émulateur** et **interface Web pilotée par navigateur connecté** : non exécutés (pas d'appareil, pas de session navigateur authentifiée). Couverts seulement par les tests automatisés ci-dessus.
- **Étapes livreur → livraison → paiement → terminé** sur le projet de test (pas de compte administrateur de test) ; exécutées en production par le script `journey-prod` du propriétaire jusqu'au blocage du 403.
- **Modules hors négociation** : WhatsApp IA, Diffusion, Bots, BI, Stock, Présence, Partenaires, AprèsBac IA, FA IA, Profil, Missions : tests unitaires uniquement, aucun scénario de bout en bout.
- **Contact réel d'un tiers externe (NEXUS)** : volontairement non exécuté (`transmit_offer` enverrait un message à un tiers réel). En production, `nexus_direct_deal` est **désactivé**.

## 3. Constats de la recette par API (projet de test)
| Id | Constat | Nature |
|---|---|---|
| S4d | L'acheteur ne peut **pas retirer son offre avant l'accord** : `cancel` exige un `deal_id` (`deal_id_required`). Seul le refus du vendeur ferme la négociation. | limite / incohérence de parcours |
| S7a-c | « Je cherche / Je vends / demande » : HTTP 404 sur le projet de test (moteur Muse non déployé dans ce projet). À exécuter en production. | environnement de test |
| S8a-b | Tableau de mission et réglages WhatsApp : le projet de test a l'ancienne version d'`avatar-briefing`. À exécuter en production (déployée par la PR #66). | environnement de test |
| S1-S3, S5 | négociation complète, rôles inversés (3 tours), refus, bouton périmé, idempotence, doublons, isolation, usurpation : **passés** | conforme |

## 4. Audit de la production (lecture seule, 30/09)
**Défauts corrigés dans la PR #66 (déployés ensuite)** : vendeur refusé au-delà de 50 identités (403) ; `waouh-status-publish` recréait une ligne `waouh_users` à chaque publication ; 29 `buyer_interest` + 17 `new_buyer` écrits en double ; écho « Intéressé » répété à la réouverture ; notifications de deal sans `thread_id`.
**Bugs / incohérences restants**
1. **Identités** : 14 409 lignes `waouh_users`, dont 5 comptes à plus de 20 lignes (A : 177, B : 96 — une ligne par session Web). Nettoyage / fusion à planifier ; les lectures ne dépendent plus de leur nombre.
2. **Données sans `thread_id` (historique)** : 141 deals, 30 négociations, 106 messages des 7 derniers jours ; 12 paires de fils actifs en double. Plus de nouvelle ligne fautive depuis le déploiement du 29/09 ; réconciliation non lancée (à faire en mode rapport d'abord).
3. **Deals et négociations qui stagnent** : 164 deals `pending` (+ 78 `pending_assignment`) et 20 négociations `proposed` / `countered` de plus de 7 jours — aucune expiration.
4. **WhatsApp sortant** : 1 425 messages en échec sur 3 702 (38 %) : 493 « no phone » (messages mis en file pour des comptes sans numéro), 55 « invalid phone », **45 « Signal timed out » entre le 27 et le 29/09** (passerelle WAHA), 39 + 28 « WAHA 404 » anciens. 29 notifications `queued` jamais livrées sur 7 jours.
5. **Catalogue** : 151 annonces actives sans photo, 22 actives avec un prix nul ou ≤ 0.
6. **NEXUS / Radar** : `waouh_nexus_matches` vide (0) ; 97 signaux radar et 520 correspondances ; 29 signaux externes ; sources de découverte : 20 live, 3 ingest_only, 5 désactivées, 1 planifiée, 1 à configurer. `nexus_direct_deal` désactivé (volontaire).
7. **Notifications OS (push)** : plugins FCM présents dans l'app Flutter, mais aucun émetteur côté serveur ; seules les notifications dans l'application et WhatsApp existent.
**Dette technique** : ESLint Web 1 786 erreurs (essentiellement `no-explicit-any`) ; `tsc` : erreurs antérieures (`source_mix` et hooks) ; `flutter analyze` : 338 remarques (infos / avertissements, aucune erreur) ; le workflow « Verify FA IA Production » échoue à chaque push et « Validate and deploy Native Messaging » échoue à l'étape `db push --dry-run` (dérive d'historique des migrations), sans effet sur Chat v2.

## 5. Matrice de couverture (Web et Flutter : mêmes fonctions Edge)
| Domaine | Automatisé | API projet de test | API production | Manuel / appareil |
|---|---|---|---|---|
| Ouvrir l'article, Intéressé, proposition, contre-proposition, accord | oui | **oui** | oui (10/20 avant correctif) | à faire |
| Confirmation vendeur, paiement, livreur, livraison, clôture | oui | partiel (sans admin) | oui (bloqué par le 403, à relancer) | à faire |
| Refus, annulation, question/réponse, doublons, idempotence, tiers | oui | **oui** | à lancer (S3-S5) | — |
| Deux acheteurs, un article | oui | non (3ᵉ compte manquant) | à lancer (S6, compte admin) | — |
| Vendre / chercher / demander (chat libre, Muse, NEXUS, Signal Fabric) | partiel | non (404) | à lancer (S7) | à faire |
| NEXUS externe → Deal Room, veille, relance | oui | **13/13** | désactivé en production | — |
| Radar (carte, signaux, correspondances) | partiel | non | lecture seule | à faire |
| Statuts 24 h | partiel | non | non | à faire |
| Avatar (accueil, points, tableau de mission, notifications) | oui | retard de version | à lancer (S8) | à faire |
| Chat Web /app/chat dégagé (tiroir, 3 largeurs) | partiel | — | — | **à faire** (aucun navigateur connecté) |

## 6. Lancer la recette de production (Codespace)
```
git pull origin prod
X_EMAIL=songbianzime@gmail.com Y_EMAIL=zime@africanschoolofeconomics.com Z_EMAIL=bot.bjdata@gmail.com \
X_PW=… Y_PW=… Z_PW=… node scripts/waouh-chat/recette/recette-comptes.mjs
```
`X` = acheteur/vendeur A, `Y` = B, `Z` = administrateur (livraison, tiers, 2ᵉ acheteur). Articles « ZZ TEST E2E … » créés, à mettre en pause ensuite. `ONLY=S1,S6` limite les scénarios. Aucune étape ne contacte de tiers externe.

## 7. Résultat de la recette de production (30/09, 10h, après déploiement du correctif d'identités)
Comptes X (A), Y (B), Z (administrateur) — **62 réussis, 9 échecs, 0 non exécutés**.
**Passé en production** : parcours complet jusqu'à « Terminé » dans les deux sens (S1 X vend / Y achète ; S2 Y vend / X achète avec 3 tours), livraison par l'administrateur, `thread_id` canonique unique, **aucun doublon** dans les historiques ; refus et bouton périmé (S3) ; question du vendeur (S4a-b) ; idempotence, erreurs 400/409, tiers refusés en 403, usurpation refusée (S5) ; deux acheteurs, un seul deal, l'évincé est prévenu (S6) ; **chat libre** « Je cherche / Je vends / demande » : intentions BUY / SELL reconnues, 8 cartes issues de 4 sources (S7) ; **avatar** : tableau de mission, réglages (bilans WhatsApp coupés), point en 3 bulles, pas de second accueil, tick refusé hors service (S8).
**Échecs : 8 sur 9 ont UNE seule cause** — l'historique de la Deal Room revenait **vide pour le compte X (177 identités)** : `waouh-match-history` ne lisait que 100 identités (les plus récentes depuis ce matin), alors que la ligne canonique de X — choisie par `status-publish` et `commerce-action` — est la plus **ancienne** (S1 ×2, S2 ×3, S4c, S5c, S5e). L'action elle-même réussissait (200, même fil) ; seule la lecture était vide. Introduit par mon changement « les plus récentes d'abord » de la PR #66 : lecture corrigée.
**Correctif** : `waouh-match-history` et `waouh-deal-ops` lisent désormais **toutes** les identités (pages de 1000) ; les filtres d'URL de `match-history` gardent 60 récentes + 40 anciennes ; côté Web, `fetchAuthIdentityIds` lit les 60 plus anciennes **et** les 60 plus récentes (notifications, fenêtres de chat, chat). Test Vitest dédié.
**Dernier échec (S4d)** : limite déjà décrite — pas de retrait d'offre avant l'accord (`deal_id_required`).
