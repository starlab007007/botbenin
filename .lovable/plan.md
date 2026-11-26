# « Confier à Bot » intelligent, de bout en bout, pour les 6 parcours

## Constats (audit du 26/11, à rafraîchir au début des travaux)
- Le moteur du Bot tourne bien, mais son activité réelle est faible : 11 délégations sur 30 jours, aucune action depuis le 15/11.
- 8 mandats ont expiré et sont restés en pause sans que vous soyez prévenu.
- 5 échanges attendent un vendeur qui n'est joignable que par WhatsApp, actuellement déconnecté.
- Le Bot est surtout pensé pour l'achat. La vente, les services, les prestations et les opportunités n'ont pas de stratégie propre.
- L'utilisateur ne voit ni ce que le Bot fait, ni pourquoi, ni la prochaine étape.

## Principe
```text
Confier -> Mandat clair (1 écran) -> Bot agit -> Journal visible -> Vous validez l'accord -> Suivi
```
Le Bot ne conclut jamais seul : l'accord final, le paiement et toute candidature restent toujours à votre validation.

## 1. Mandat en un seul écran (tous les parcours)
- Les réglages sont préremplis par l'IA : prix plafond ou prix plancher, ville et rayon, durée (24 h par défaut), nombre de relances (2 au maximum).
- Une phrase résume le mandat, par exemple : « Je négocie jusqu'à 4 500 F à Parakou pendant 24 h. »
- Un seul bouton : **Confier à Bot**.

## 2. Stratégie IA propre à chaque parcours
| Parcours | Ce que fait le Bot | Analyses IA |
|---|---|---|
| Acheter | Trie les offres, contacte la meilleure, négocie, passe à la suivante en cas de refus | Prix marché (médiane, fourchette), score fiabilité vendeur, distance, détection des annonces douteuses |
| Vendre | Fixe un prix conseillé, repère les acheteurs qui correspondent, répond aux questions et aux contre-offres | Prix conseillé et prix plancher, score d'intérêt de chaque acheteur, évaluation des contre-offres (bonne affaire, correct, trop bas) |
| Trouver | Élargit la recherche (synonymes, villes voisines) et active la veille | Reformulation du besoin, classement des résultats par pertinence |
| Service | Compare le même périmètre et demande les devis manquants | Normalisation des devis (matériel, déplacement, délai), comparaison sur une base égale |
| Prestation | Vérifie les disponibilités et la zone, puis propose les créneaux | Correspondance compétences et dates, historique des avis |
| Opportunité | Surveille les publications et les échéances, puis prépare le dossier | Éligibilité, date limite, liste des pièces à fournir ; le dépôt reste toujours à votre validation |

## 3. Bot fiable et automatique
- Le Bot démarre **immédiatement** après « Confier », sans attendre son passage suivant.
- Si un vendeur ne répond pas (délai ou WhatsApp coupé), le Bot passe seul à l'offre suivante.
- Toute offre du Bot reste bornée par votre mandat et guidée par le prix marché.
- 2 h avant l'expiration du mandat, une notification propose « Prolonger 24 h » ou « Arrêter ».
- Les 8 mandats déjà expirés reçoivent une relance.
- Contrôle anti-doublon : jamais deux messages identiques au même interlocuteur.

## 4. Visibilité (Web et mobile)
- Dans la Deal Room, une ligne « Bot » affiche la dernière action, la prochaine étape et l'heure. Elle propose deux boutons : « Reprendre la main » et « Voir le journal ».
- Sur la fiche Mission, l'état s'affiche en mots simples (Recherche, Contact, Négociation, Accord à valider, Suivi) avec un bouton **Voir la Deal Room**.
- Quand le Bot obtient un accord, une notification « Accord à valider » s'affiche et ouvre directement l'écran de validation.

## 5. Vérification
- Des tests automatiques couvrent chaque règle : plafond jamais dépassé, plancher respecté, 2 relances au maximum, passage à l'offre suivante, expiration et relance, aucune conclusion sans vous.
- Un test réel avec deux comptes, un acheteur et un vendeur, sera mené pour l'achat et pour la vente, jusqu'à « Accord à valider ».
- Pour les services, prestations et opportunités, un test sera fait sur des données réelles.
- L'application mobile devra être recompilée et testée sur votre téléphone.

## Ce qu'il me faut de votre part
- Un deuxième compte (vendeur) pour le test réel.
- La reconnexion de WhatsApp pour joindre les vendeurs hors application.

## Détails techniques
- Le moteur du Bot (délégation, tick, cascade) est étendu par type de mission, et l'analyse des offres s'appuie sur la référence marché existante.
- L'IA produit des verdicts structurés (prix, score, motif court), jamais affichés bruts.
- Les nouveaux états du mandat sont : actif, expiration proche, expiré, accord à valider.
- Des notifications liées à la Deal Room ouvrent la bonne fenêtre (isolation article × interlocuteur conservée).
