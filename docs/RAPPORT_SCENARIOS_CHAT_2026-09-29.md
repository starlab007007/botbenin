# Rapport de scénarios du chat — 29/09/2026

**Mise à jour (fin de journée) : E10 et E11 sont corrigés ; la batterie étendue passe 73/73 sur le projet de test** (voir `docs/RAPPORT_FENETRES_CHAUDES_2026-09-29.md`). Le texte ci-dessous est le constat initial : 62 vérifications sur 64, 2 défauts (E10, E11). Des pans entiers du chat ne sont toujours pas testés (liste en fin de document).

Cadre : vraies edge functions sur le projet de test `botbj-test-e2e`, 6 comptes (vendeurs S1 S2 ; acheteurs B1 B2 B3 ; admin de test pour la livraison). Script : `scripts/waouh-chat/test-project/scenarios-chat.mjs`. Les corrections E1 à E6 sont déployées sur le projet de test, pas en production.

## Résultats par scénario
| # | Scénario | Résultat |
|---|---|---|
| 1 | 3 acheteurs, 1 vendeur, même article : fils et négociations distincts, vendeur notifié dans chaque fil avec boutons, isolation des fils entre acheteurs, offres non mélangées | 5/5 |
| 2 | Le vendeur accepte 2 acheteurs **en même temps** (course) : un seul deal, le perdant reçoit « réservé » | 2/3 — **2c KO** (E10) |
| 3 | Après l'accord : refus d'accepter un 2ᵉ acheteur, refus d'ouvrir l'article réservé | 2/3 — **3a KO** (E11) |
| 4 | Annulation par l'acheteur retenu → l'article revient à la vente → un autre acheteur négocie et achète | 3/3 |
| 5 | 1 acheteur, 2 vendeurs en parallèle : fils distincts, notifications au bon vendeur, isolation entre vendeurs, décisions indépendantes, nouvelle offre après refus | 6/6 |
| 6 | Double clic « Intéressé », idempotence (rejeu, clé volée par un autre utilisateur, clés en parallèle) | 6/6 |
| 7 | Règles de tour, montants invalides (0, négatif, énorme, texte), action inconnue, article inexistant, tiers non participant, sans identité, jeton invalide | 16/16 |
| 8 | Négociation à 4 tours, accord au dernier prix (270 000) | 4/4 |
| 9 | Refus du vendeur → acheteur informé → bouton périmé refusé → nouvelle offre | 4/4 |
| 10 | Questions acheteur ↔ vendeur, tiers refusé | 5/5 |
| 11 | Vente complète Mobile Money, tiers ne peut pas annuler, annulation d'une commande terminée refusée | 9/9 |

Invariants vérifiés en base sur les 9 articles de la batterie : au plus 1 deal actif par article ; 0 message sur 156 sans fil ; 0 négociation sans fil sur 13 ; au plus 1 fil actif par acheteur × vendeur × article.

## Nouveaux défauts
| # | Gravité | Constat | Preuve |
|---|---|---|---|
| E10 | majeur | **Un acheteur évincé n'est pas prévenu.** Quand le vendeur accepte un autre acheteur, l'acheteur en attente ne reçoit rien : son dernier message reste « Offre envoyée 95 000 », sa négociation reste `countered` (dernier acteur : lui), l'article est `reserved`, 0 notification. Il n'apprend l'indisponibilité que s'il agit. Côté vendeur, les boutons « Accepter » de cette offre restent affichés et échouent. (Mon premier test 3d était un faux positif : le message « réservé » venait d'une action ultérieure ; corrigé.) | scénario 2c, sonde dédiée, lecture en base |
| E11 | bloquant pour le parcours | **Une offre est acceptée sur un article déjà réservé.** Un acheteur en attente peut renchérir après l'accord d'un autre : réponse `offer_sent`, le vendeur reçoit une « Nouvelle offre » qu'il ne pourra pas accepter (refus `article_reserved`), et la négociation se ferme à ce moment-là. | scénario 3a |

Corrections proposées (non faites) : (E10) à l'acceptation d'un deal, clore les autres négociations ouvertes de l'article et écrire un message « article réservé » dans chaque fil concerné (acheteur), retirer les boutons périmés côté vendeur ; (E11) contrôler le statut de l'article avant d'enregistrer une offre (`waouh-negotiation-router` / branche `offer` de `waouh-commerce-action`) et répondre `article_reserved` ou `article_sold`.

## Comportements constatés à décider avec le métier (pas comptés comme échecs)
- Une offre supérieure au prix affiché (90 000 sur 60 000) est acceptée.
- L'acheteur peut choisir son mode de paiement avant la confirmation de disponibilité du vendeur ; le livreur n'est pas déclenché avant cette confirmation (vérifié en base).
- Confirmer un deal inexistant répond « erreur technique » (message « Rien n'a été validé ») au lieu d'un « commande introuvable ».
- Un acheteur qui accepte sa propre offre reçoit `ok: true` avec le message d'attente du vendeur ; aucun deal n'est créé.
- Double confirmation de paiement : réponse OK, sans second effet visible.

## Ce qui n'est PAS testé
- Interfaces : Web `/app/chat` et application Flutter (tout est testé au niveau des fonctions serveur).
- WhatsApp réel, envois sortants (`waouh-outbound-dispatch` volontairement absent), mirroir WhatsApp des messages.
- Recherche par l'acheteur et notification des acheteurs correspondants (`waouh-notify-buyers`) ; publication avec photos.
- Livraison réelle par livreur (ici : compte admin de test), litiges, expiration d'annonce, articles archivés/supprimés.
- Concurrence à plus de 2 requêtes simultanées, reprise après coupure réseau, temps réel (Realtime) et notifications push.
- Parcours invité sans compte (session seule) côté commerce-action et match-history avec les vrais clients.
- Tout ce qui précède dans un environnement de production.
