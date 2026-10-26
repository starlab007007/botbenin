# Avatar — accueil, mission en direct et autonomie · 18.34

Les trois écrans validés sont intégrés à la navigation existante : accueil dans Chat, réglages dans Avatar, recherche commune aux quatre actions. L'avatar de l'accueil mesure 84 px ; le message unique est situé dessous. Les étapes de recherche avancent uniquement à la réception des réponses réelles, sans chronomètre de progression simulé. Une recherche annulée ignore ses réponses tardives. Les résultats déjà reçus restent disponibles si l'actualisation externe échoue.

Les cartes courtes conservent l'identité des offres et les actions canoniques : comparaison jusqu'à cinq offres, détail, contact confirmé, délégation et suivi. Les outils de contribution et les informations avancées restent accessibles à la demande.

Les règles sont enregistrées sur le compte par l'API authentifiée existante, puis copiées dans chaque nouveau mandat. Les règles d'un compte ne modifient pas les mandats historiques. Le serveur contrôle la plage horaire au Bénin, le démarrage différé, l'échéance, les autorisations de contact et de négociation, le canal WhatsApp et les relances. Les accords, paiements et coordonnées privées nécessitent une confirmation. Un rayon sans géolocalisation précise restreint la mission à la ville indiquée. Les nouveaux réglages s'appliquent aux prochaines missions ; les commandes existantes de pause et d'arrêt dans Missions restent opérationnelles.

La migration ajoute une colonne JSON bornée à la table de préférences déjà protégée par les politiques de propriété. Aucun envoi externe n'est effectué pour la recette.

Validation : compilation Web, tests des composants et contrats existants, nouveaux tests des écrans et des règles horaires, tests Flutter d'affichage à 320 px et des autorisations, contrôle de parité des routes. Le workflow Flutter construit et vérifie les APK universel et ARM64.
