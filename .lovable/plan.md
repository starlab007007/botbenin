# Vérifier et compléter les corrections sur tous les écrans

## Ce qui est déjà commun à tous
Les corrections faites côté serveur s'appliquent partout (Web ordinateur, Web tablette, Web sur téléphone Android, application Flutter) :
- recherche NEXUS rapide et sources de nouveau interrogées ;
- tri des résultats (téléphones/accessoires écartés) ;
- annonce vendeur bien enregistrée et confirmée ;
- clôture des ventes payées à la livraison ;
- paiement reporté sur la transaction ;
- livreurs de test désactivés.

## Ce qui reste à vérifier ou compléter
1. **Web tablette et Web Android** : rejouer le parcours (recherche, fiche, Deal Room, accord, clôture) en format tablette (768 px) et téléphone (390 px), avec captures, et corriger tout bouton masqué ou fenêtre coupée.
2. **Application Flutter**
   - La ville saisie n'est pas envoyée avec la recherche : l'ajouter, comme sur le Web, pour que l'analyse du marché tienne compte de la ville.
   - En cas d'échec, l'app peut afficher le texte brut renvoyé par le serveur : le remplacer par un message français générique (« Une erreur est survenue, réessayez »).
   - La règle « Bot ne choisit jamais une offre au prix suspect » est déjà reportée ; ajouter le même test que sur le Web.
   - Vérifier que les boutons de clôture (« Confirmer le paiement ») appellent bien le même parcours que le Web.
3. **Rapport de certification** : ajouter une colonne par écran (Web, tablette, Web Android, Flutter) avec le verdict de chaque étape.

## Limite connue
L'application Flutter ne peut pas être compilée ni lancée ici. Je corrige et vérifie le code ; le test final sur un vrai téléphone Android reste à faire de votre côté (je fournirai la liste des 9 étapes à cocher).

## Détails techniques
- `flutter_waouh_app/lib/main.dart` (~l.1379) : ajouter `city` au corps envoyé à la recherche ; ne plus relayer `data['message']/data['error']` dans l'erreur affichée.
- Tests Dart pour la règle d'écart > 50 % dans `live_guided_ask.dart`.
- Playwright avec des tailles d'écran 768×1024 et 390×844, compte acheteur + compte vendeur de test.
