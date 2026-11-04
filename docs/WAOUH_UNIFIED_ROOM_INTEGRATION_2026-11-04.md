# Parcours WAOUH AIR — intégration du 4 novembre 2026

## Architecture livrée

Web et Flutter utilisent `/app/deal-room` et la même API authentifiée `waouh-deal-room`. Recherche, sélection et mandat conduisent à une seule room. Le composant Convergence et son accord versionné restent l’autorité; les messages métier existants restent conservés. `waouh_deal_room_links` relie cette autorité au thread canonique sans recopier un accord historique.

Le worker `waouh-opportunity-worker` exécute les mandats côté serveur indépendamment du téléphone: expiration, horaires de Cotonou, plafond privé, relances plafonnées, approbation des modes assistés, pause et reprise humaine. Le Bot peut proposer ou contre-proposer dans ses limites; la confirmation finale demeure humaine et bilatérale. Aucun paiement financier automatique.

Les nouvelles commandes sont idempotentes et isolées par utilisateur. Les propositions portent une version et des conditions complètes. Le plafond n’est jamais inclus dans les événements du vendeur. Une interruption ou une réponse réseau perdue réutilise le même identifiant de requête. Les messages sont paginés sans perdre l’historique chargé.

## Interfaces

Charte AIR d’origine et avatar existant conservés. Recherche, fiche, conversation, mandat, suivi, contre-offre, confirmation, réception, déclaration de paiement, clôture et signalement sont reliés. Les anciennes routes vendeur restent disponibles. Une invitation rejoint le même composant; son propriétaire peut la révoquer avant utilisation.

Une ancienne négociation classique déjà liée nécessite une réconciliation explicite: la nouvelle room se met en pause plutôt que créer un second accord. Elle n’est pas déclarée migrée automatiquement.

## Mise en service

1. Exécuter les contrats SQL, tests Web, analyse et tests Flutter sur le commit exact.
2. Vérifier le schéma réel de production et les migrations Convergence prérequises avant d’appliquer uniquement `20261104082300_waouh_unified_deal_rooms.sql`. Ne pas appliquer aveuglément toutes les migrations historiques en attente.
3. Déployer `waouh-deal-room` et `waouh-opportunity-worker`, puis les fonctions utilisant `_shared/waouh-deal-open.ts`. Les JWT sont vérifiés dans le code de l’API; elle n’accepte pas d’identité fournie par le client.
4. Contrôler le cron existant du worker et l’accès service-role aux RPC; aucune exécution client des fonctions SQL.
5. Publier Web et APK depuis le même commit, puis contrôler deux comptes réels: vendeur connecté et vendeur invité, interruption, reprise, ancienne version, expiration, accord et réception.

## Preuves et limites

Les tests PGlite couvrent autorisations, idempotence, limites, relances, modes assistés, pagination, expiration, invitation, reprise et accord bilatéral. Les tests Web couvrent sélection, délégation, reprise et absence de faux succès. Des tests widgets Flutter couvrent la reprise et la réponse vendeur.

Une compilation ne certifie pas une recette physique Android ni un accord entre deux comptes réels. Le déploiement de production et cette recette doivent être constatés avant de déclarer l’autonomie complète opérationnelle.

## Compléments de validation

Le parcours opportunité conserve la préparation puis la déclaration explicite de transmission du dossier, sans fabriquer un achat. Les tests couvrent désormais aussi réception, déclarations de paiement, clôture bilatérale, évaluation et ouverture sans accord. Le script de déploiement applique et enregistre atomiquement la seule migration dédiée; il refuse un schéma préexistant non suivi. La version préparée est 18.46.0+1793783142.

Les politiques d’accès et d’automatisation existantes couvrent également la route Deal Room, son API et le worker. Les tests vérifient qu’une désactivation administrative empêche tout nouveau message automatique.

## Recette métier après déploiement

La recette transactionnelle `scripts/tests/waouh-deal-room-live-audit.sql` a exécuté en production le parcours manuel produit et le parcours Bot service jusqu’à `completed`, puis l’évaluation. Invitation, contact unique, isolation du tiers, propositions, ancienne version refusée, reprise après interruption, signatures et clôtures bilatérales, réception et déclarations de paiement ont été vérifiés. Les deux parcours ont terminé en 771 ms côté SQL dans cet essai; ce chiffre ne mesure pas la durée des échanges humains ou le réseau mobile. Toutes les données de recette ont été annulées par rollback.

L’essai a révélé une relance prématurée après pause/reprise. La migration `20261104105439_waouh_room_followup_resume_cooldown.sql` est appliquée en production: elle maintient l’intervalle de 24 heures depuis la dernière action Bot, sans retarder le traitement d’une nouvelle proposition vendeur. Tests ajoutés: reprise sans envoi immédiat, maintien de l’échéance initiale, relance autorisée après 24 heures et plafond de relances conservé.

La recette physique complète sur deux appareils reste distincte de cette validation SQL et des tests UI automatisés. Un vendeur externe doit rejoindre la room via invitation pour y participer. Les paiements sont des déclarations, sans transfert financier automatique.

## Guidage progressif 18.47

Le serveur projette chaque snapshot en `guidance` (schéma `waouh.room_guidance.v1`): étape, responsable, tâche prioritaire, action autorisée, confirmations et alternatives. Web et Flutter rendent ce même contrat. Les étapes sont cochées à partir des preuves effectives; une signature seule, une interruption ou un signalement ne peuvent afficher une clôture confirmée. Les opportunités utilisent Dossier → Transmission → Suivi, sans processus d’achat imposé.

La tâche change progressivement entre invitation, devis/proposition, autorisation Bot, relecture, attente de l’autre partie, réception, déclaration et confirmation du paiement, puis clôture et avis facultatif. Réception et paiement restent possibles dans l’ordre prévu par l’accord. Les écrans de relecture verrouillent la version approuvée; une modification distante impose une nouvelle lecture. Les formulaires de proposition et de mandat conservent aussi leur version d’ouverture.

La migration `20261104111700_waouh_room_progressive_guidance.sql` ajoute une projection en lecture sans changer les paiements ni les accords existants. Vingt-cinq états canoniques partagés dans `tests/fixtures/waouh-room-guidance.json` couvrent les rôles, les attentes, les mandats, les blocages et les confirmations. Les clients antérieurs restent compatibles et ignorent le champ ajouté. L’affichage progressif requiert les nouvelles interfaces 18.47.
