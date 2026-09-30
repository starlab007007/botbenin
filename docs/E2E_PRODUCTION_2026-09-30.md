# Test de bout en bout en PRODUCTION — 30/09/2026 (A = acheteur, B = vendeur, admin)

Données réelles (autorisées) : article « ZZ TEST E2E », comptes songbianzime@gmail.com (A), zime@africanschoolofeconomics.com (B), bot.bjdata@gmail.com (admin). Script : `scripts/waouh-chat/prod/journey-prod.mjs`.

## Résultat : 10/20 — le parcours s'arrête à la contre-proposition de B
Passé : publication, ouverture de l'article, « Intéressé » (fil X créé, thread = X), notification vendeur avec boutons, réouverture sans doublon (même X), proposition 80 000 (thread = X), réception par B avec boutons, historiques sur X.
Échec : **J6 B contre-propose → HTTP 403** ; tout ce qui suit en découle (pas de contre-proposition, pas d'accord, pas de deal, pas de livreur ni de paiement).

## Cause (confirmée par les données)
`resolveSiblingUserIds` (`_shared/waouh-identity.ts`) ne lisait que **50** identités (`waouh_users`) par compte. En production, **chaque session Web crée une ligne** : B en a **96**, A en a **177**. La ligne vendeur du fil (créée à 07:36, la plus récente) était hors des 50 → `roleIn` ne reconnaît pas B → `not_a_participant` (403). L'acheteur A s'en sort par chance (sa ligne figure dans les 50).
Conséquence en production : tout utilisateur avec plus de 50 identités peut être refusé comme « non participant » sur ses propres fils. Risque voisin : la recherche du fil par article construisait une URL avec toutes les identités (limite de longueur PostgREST).

## Correctif (prêt, NON déployé)
- lecture **paginée** des identités (pages de 1000, 3 pages au plus) ;
- recherche du fil par article **par lots de 100** identités ;
- 3 tests Deno (96 / 177 identités, pagination, compte sans auth) ; 303 tests Deno au total.
Reste à traiter en amont : pourquoi une ligne `waouh_users` par session pour un utilisateur connecté (les hooks Web lisent aussi `.limit(50)`).

## Nettoyage
L'article de test est passé en `paused` (plus visible). Fil, négociation (80 000, en attente) et 2 messages WhatsApp en file (pending/sending) laissés tels quels — WhatsApp conservé sur votre demande. À annuler avec le compte A si besoin.

## À rejouer après déploiement du correctif
`journey-prod.mjs` (parcours 1, 2, 3 avec livreur, livraison, paiement et thread_id vérifié à chaque étape).
