# Modules utilisateurs · 18.38

L’administration **Modules utilisateurs** contrôle 22 modules. Les réglages sont communs au Web et à Flutter. Aucun module n’est désactivé lors de l’installation : l’administrateur décide des changements.

- **Afficher** : retire le module des menus, onglets et raccourcis principaux ; un lien direct reste utilisable si l’accès est autorisé.
- **Autoriser l’accès** : coupe l’ouverture des pages et les opérations du module. Les données sont conservées. Les contrôles d’administration restent accessibles pour réactiver le module.
- **Autoriser les automatisations** : suspend les actions autonomes, les relances et les envois différés concernés, sans donner d’autorisation supplémentaire aux actions manuelles.
- **Profils autorisés** : un ou plusieurs rôles limitent affichage, accès et automatisations à ces profils. Sans sélection, tous les profils et les visiteurs des pages publiques sont admis ; les exigences habituelles de connexion et de propriété restent obligatoires.

Les changements sont historisés avec leur auteur, date et états avant/après. Le réglage est relu en direct, au retour dans l’application et périodiquement (30 secondes). Si la règle ne peut pas être vérifiée, l’interface affiche une invitation à réessayer et les opérations protégées sont refusées.

Le catalogue et les règles de correspondance des routes sont partagés par Web, Flutter et les services. Les autorisations effectives sont calculées pour l’identité authentifiée. Aucun utilisateur ne peut demander la politique d’un autre compte. Les accès directs aux données concernées restent soumis aux contrôles de propriété existants auxquels la restriction de module s’ajoute. Les opérations historiques Présence, BI et Stock ont aussi une vérification de module.

Les contrôles d’exploitation historiques restent complémentaires : autoriser un module dans ce nouvel écran ne réactive pas un traitement suspendu dans le Centre de contrôle. Les accords, paiements et contacts conservent leurs validations habituelles.

Validation : comparaison du catalogue Web/Flutter, routes profondes et raccourcis, masquage distinct de l’accès, absence de montage des pages bloquées, refus en cas d’erreur, tests PostgreSQL des rôles, des lectures/écritures directes et des opérations existantes, et contrôles des tâches autonomes. La recette ne suspend aucun module réel et n’envoie aucun message externe.
