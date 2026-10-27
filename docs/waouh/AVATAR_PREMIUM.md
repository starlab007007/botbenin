# Avatar, Missions et choix automatique · 18.37

Les trois maquettes minimalistes validées sont intégrées au Web mobile et à Flutter. L’accueil Chat reste inchangé. Avatar montre le portrait 64 px, le mode, trois résumés de règles et une pause réelle. Les formulaires sont ouverts à la demande et enregistrés sur le compte. Le détail des horaires, contacts, alertes, apparence et limites reste accessible.

Missions affiche les mandats persistants et les anciennes missions sans répéter les missions liées. Une nouvelle demande ouvre la recherche commune. Les décisions et le suivi détaillé restent accessibles ; le haut de page ne contient plus le grand avatar, les titres dupliqués, les onglets NEXUS/Suivi et les multiples actions.

La recherche conserve les événements réels dans un journal à la demande. Une comparaison déterministe se calcule dès réception des résultats, avec une piste principale et deux alternatives repliées. Les autres pistes restent disponibles à la demande. Les modèles explicitement différents, capacités incompatibles, devises non comparables, villes différentes connues, offres indisponibles et prix au-delà du plafond sont écartés. Les prix nuls non documentés sont inconnus, jamais gratuits. Le mot « confirmé » exige des données explicites ; les informations absentes restent à vérifier.

Une recherche explicitement lancée par un utilisateur connecté crée ou réutilise automatiquement un mandat si le mode enregistré est autonome. Les modes assistés attendent une validation ; une vente exige la sélection d’un article appartenant au compte. Les permissions du compte sont relues au serveur. Le plafond du compte, les horaires et le maximum de contacts sont conservés. La comparaison suit la priorité choisie. Un UUID déterministe arbitre les appels concurrents et évite deux insertions pour une même demande. Les missions actives ou en pause sont réutilisées ; une mission terminée permet une nouvelle génération.

La pause de l’avatar est enregistrée dans les préférences existantes. Le worker, les relances, la progression autonome et l’envoi différé la relisent ; un message en attente est reporté sans consommer une tentative. Cette pause est globale au compte, contrairement aux limites ordinaires copiées dans les nouveaux mandats. Les commandes manuelles et les accords explicitement validés restent distincts. Tout accord, paiement et partage de coordonnées privées conserve sa confirmation.

Aucune migration ni nouvel accès public n’est ajouté. Les fonctions authentifiées existantes restent responsables de l’identité du compte. La recette n’envoie aucun message externe et ne crée aucune mission réelle. Les cas de classement sont partagés par les tests Web et Flutter ; le contrôle visuel couvre les petits écrans.


## Recherche guidée · 18.36

- Étapes visibles dès la préparation du besoin, alimentées par les retours réels. Les étapes ne sont pas temporisées pour retarder artificiellement les résultats.
- Galerie de quatre pistes maximum au premier affichage, comparatif automatique et fiche de décision : coût renseigné, différences, incertitudes, source et suivi existant.
- Les déclinaisons métier Opportunités, Services, Prestations et Vente validées sont intégrées en 18.37, avec un type sélectionnable, des critères repliés et des règles de comparaison communes au Web, à Flutter et au suivi autonome.
- Frais absents = inconnus. Les fourchettes ne deviennent pas des totaux exacts. Le budget tient compte de la livraison lorsqu’elle est renseignée.
- Un prix non confirmé très inférieur aux autres observations du même modèle, variante, capacité et unité est mis à part pour clarification (au moins trois observations). Les services hétérogènes ne sont pas comparés par cette règle.
- Le classement du Web, de Flutter et du suivi utilise le même contrat testé. Une fiche consultée ne déclenche aucun contact.
- Avatar visiteur : présentation et entrée de connexion. Les préférences authentifiées réessaient une fois après un refus de session, en conservant le compte initiateur.


## Missions métier · 18.37

Le contrat `waouh-mission-kinds.json` fournit les cinq textes et étapes. `scripts/sync-waouh-mission-copy.py` produit la copie native ; les tests comparent les deux données. Les offres, prix et organisations fictifs des maquettes ne sont pas utilisés.

- Opportunités : publications, conditions et échéances annoncées. Les échéances dépassées et les incompatibilités explicites sont exclues. Une veille conserve quatre pistes dans Missions, signale une sélection modifiée ou une échéance à moins de 48 h selon les alertes du compte, et ne crée aucun contact ni candidature. Les dates sans heure expirent en fin de journée au Bénin. Une activation explicite est possible en mode assisté, sans autoriser de contact.
- Services : déplacement et diagnostic séparés du prix final d’intervention. Un coût inconnu reste inconnu. Les montants ne sont comparés que sur un périmètre et une base tarifaire identiques ; le suivi demande le créneau et un devis.
- Prestations : brief, livrables, nombre de pages, délai et révisions annoncés. Un nombre de pages insuffisant ou un délai connu trop long écarte la proposition. Les périmètres différents demandent un devis comparable, avec exclusions et frais récurrents.
- Vente : article actif appartenant au compte, prix plancher enregistré, quantité et unité. Les demandes vendeurs et budgets connus sous le plancher sont écartés. La quantité n’est comparée qu’à unité identique. Un budget acheteur n’est pas une offre ferme et l’accord reste à valider.

Le suivi reprend les critères normalisés au serveur. Les appels manuels sont liés au compte qui a confirmé ; un changement de session arrête les étapes suivantes. Aucune migration n’est nécessaire : les critères et la sélection utilisent les métadonnées existantes avec leurs contrôles de propriété. La projection publique conserve une liste explicite de faits et de photos publiques non signées, en supprimant coordonnées, identifiants privés et données brutes.

Validation : fixtures de classement partagées Web/Flutter pour les quatre domaines, tests des décisions, de la veille et de l’isolation des requêtes, contrôles de projection publique, widgets 320 px et recette navigateur avec transport simulé sans contact réel. Les contrôles de publication restent ceux des workflows Web, Flutter et Native Messaging.
