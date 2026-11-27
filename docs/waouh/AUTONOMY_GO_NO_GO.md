# Autonomie WAOUH — contrôle GO/NO-GO

La publication comme entièrement autonome exige des preuves sur un même SHA :
- mandat avec durée globale non renouvelable, plafond TTC, plancher privé, consentement et pause humaine;
- cascade idempotente et transactionnelle, absence de contact après expiration, reprise après crash;
- interprétation des réponses libres et stratégies métier, sans acceptation ni paiement implicites;
- tests sur deux comptes contrôlés, app fermée, redémarrage en environnement isolé, livraison des notifications et reprise;
- CI Web, Flutter et convergence verte, preuves serveur et recette réelle.

Correctifs de cette livraison : compatibilité fabric_id/source_ref, exclusion des pauses de la cascade, durée résiduelle, filtrage des alternatives, expiration des mandats actifs, contrôle d'erreur, Material local du comparateur Flutter. Le transfert atomique, le plancher serveur explicite, le moteur IA de réponse et la recette réelle restent des gates bloquantes. Ne pas réactiver les collecteurs ni réexpédier les messages historiques pour les tests.
