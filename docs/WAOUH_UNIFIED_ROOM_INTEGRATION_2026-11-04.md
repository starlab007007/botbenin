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
