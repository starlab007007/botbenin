# Autonomie WAOUH — contrôle GO/NO-GO

La publication comme entièrement autonome exige des preuves sur un même SHA :
- mandat avec durée globale non renouvelable, plafond TTC, plancher privé, consentement et pause humaine;
- cascade idempotente et transactionnelle, absence de contact après expiration, reprise après crash;
- interprétation des réponses libres et stratégies métier, sans acceptation ni paiement implicites;
- tests sur deux comptes contrôlés, app fermée, redémarrage en environnement isolé, livraison des notifications et reprise;
- CI Web, Flutter et convergence verte, preuves serveur et recette réelle.

Correctifs de cette livraison : compatibilité fabric_id/source_ref, exclusion des pauses de la cascade, durée résiduelle, filtrage des alternatives, expiration des mandats actifs, contrôle d'erreur, Material local du comparateur Flutter. Le transfert atomique, le plancher serveur explicite, le moteur IA de réponse et la recette réelle restent des gates bloquantes. Ne pas réactiver les collecteurs ni réexpédier les messages historiques pour les tests.

## Livraison atomique
- RPC service-role-only, verrou sur la piste initiale, révision, échéance, contrôle des autorisations, transfert et délégation dans une transaction; replay du résultat.
- Prix plancher explicite dans le parcours principal Web/Android et garde serveur. Coût annoncé et frais de livraison connus pris en compte pour les contre-propositions; frais inconnus à clarifier.
- Smart Reply: classification déterministe prioritaire, Gemini en repli, réponse métier contrôlée et journalisée, sans acceptation, dépôt ni paiement automatiques.
- Test SQL isolé sur la migration réelle; test Deno de classification. La recette réelle sur appareil, livraison physique des notifications et redémarrage isolé restent obligatoires.

Le transfert et la notification de basculement sont inscrits dans la même transaction; les notifications de progression sont dédupliquées et restent en file jusqu'au traitement existant. Le test n'envoie aucun message sur un canal externe. Le déclenchement IA est limité à cinq tentatives par tick et les réponses non autorisées ne sont pas traitées.

## Recette de résilience locale
Le test SQL utilise un répertoire de stockage temporaire, ferme la base puis la rouvre et vérifie historique, mandat, rejeu du transfert et de la réponse, déduplication des notifications. Cette preuve locale ne remplace pas un redémarrage d'Edge Runtime ou un test sur téléphone. Aucun environnement Supabase de recette n'était disponible au contrôle. Ne pas utiliser la production pour simuler une panne.

## Contrôle conversationnel des montants
Une réponse libre contenant un montant déterministe non ambigu déclenche une demande adaptée à la limite du mandat. Les montants ambigus et ceux proposés par l'IA ne sont jamais des instructions financières. Le test persistant ajoute une nouvelle réponse après redémarrage et vérifie le blocage après expiration.
