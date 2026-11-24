# Intéressé : ouverture du salon existant

Référence : salon « DEAL ROOM » dans le Chat Command Center de BOT.BJ, avec onglet produit, photo, prix, ville, messages et actions de négociation.

Pour une offre de produit, le clic « Intéressé » ouvre le fil canonique renvoyé par `waouh-buyer-interest` (article ou catalogue partenaire) ou `waouh-commerce-action` (offre externe). Il n'ouvre pas le panneau plein écran de `waouh-deal-room` et ne génère pas de lien d'invitation. Un intérêt déjà traité reprend ses identifiants de fil et de négociation.

Le même point d'entrée sert aux résultats NEXUS, à l'analyse des offres, aux statuts, aux anciens liens de résultats et au retour après authentification. Le chat ouvre aussi le salon quand la réponse serveur fournit le fil d'un intérêt explicite sans l'ancien nom d'intention.

Web : le salon est sélectionné avant le chargement complémentaire du produit. Une nouvelle information sur le vendeur ne crée pas un second onglet pour le même fil. Une réponse tardive d'un autre compte n'est pas ouverte.

Flutter : les résultats et les anciens liens réutilisent `/app/chat/match/:key` et son écran existant. L'ouverture d'un article ou catalogue transmet un seul intérêt ; aucun deuxième `sendMain` n'est effectué.

Les parcours de délégation, les dossiers d'opportunité et les démarches du vendeur conservent leur contexte métier et leurs autorisations. Une offre indisponible, une annonce personnelle, une identité manquante ou une ouverture refusée affiche un échec et ne fabrique pas un autre salon. Les limites de contact et l'état de WhatsApp restent appliqués par les services existants.

## Vérification

- Tests Web : envoi canonique, catalogue, offre externe, concurrence, compte changé, erreur, retour de connexion, ouverture immédiate et absence de doublon d'onglet.
- Test Flutter avec service HTTP local : un seul appel lors de deux ouvertures simultanées, conservation du fil, de la négociation, du prix et des photos.
- Compilation Web et contrôles de parité des routes et des versions.
