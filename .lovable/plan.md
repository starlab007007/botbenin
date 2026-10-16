# Fenêtre de chat produit (Deal Room) : plus d'espace pour la conversation

## Diagnostic (d'après votre capture, téléphone)
Avant le premier message, 5 blocs sont empilés et prennent environ 70 % de l'écran :
1. En-tête WAOUH One + onglets (Bot / Deal Room)
2. Bandeau « Annulée · Suivi Avatar · Voir les étapes »
3. Fiche produit + frise de 7 étapes (les libellés se chevauchent)
4. Carte « Bot conduit cette discussion » (objectif, proposition, à venir)
5. « Résumé IA de la négociation »
Ensuite viennent les messages, plus de grandes cartes Bot (« Meilleure opportunité ») dans le fil. Résultat : on voit 1 ou 2 messages, et les infos se mélangent avec la discussion.

## Nouvelle organisation
```text
┌ En-tête : ← [photo] Bic · 500 FCFA · Négociation ●  (i) ┐
├ Onglets (une ligne fine, défilable)                     ┤
├ Fiche repliée : 1 ligne, touche = déplier               ┤
│                                                         │
│   Messages (≥ 75 % de la hauteur)                        │
│                                                         │
├ Suggestions rapides (puces, 1 ligne)                    ┤
└ Zone de saisie                                          ┘
```
- **Une seule ligne de contexte** : photo, nom, prix et étape actuelle (« Négociation 2/7 ») dans une bande compacte. Un toucher ouvre un panneau du bas avec : fiche complète, frise des étapes, suivi Avatar, résumé IA, statut (Annulée…).
- **Frise des étapes** : remplacée par une petite barre de progression + nom de l'étape actuelle (plus de libellés qui se chevauchent).
- **Carte « Bot conduit cette discussion »** et **Résumé IA** : déplacés dans ce panneau ; dans le fil, une simple puce discrète « Le bot négocie pour vous ».
- **Cartes Bot dans le fil** (Meilleure opportunité, classement…) : affichées en bulle compacte d'une ligne avec « Voir détail ».
- **Statut « Annulée » / fin de deal** : petit badge coloré dans l'en-tête, pas un bandeau.
- **Style premium** : fond uni clair, bulles légères, espacements réguliers, zone de saisie toujours visible au-dessus du clavier, défilement fluide vers le dernier message.
- Ordinateur portable / tablette : même logique ; le panneau de détails s'ouvre sur le côté au lieu du bas.

## Flutter
Même réorganisation dans les écrans de match de `flutter_waouh_app/lib/live` (en-tête compact, panneau de détails, cartes compactes). Je ne peux pas compiler ici : l'APK sera à générer chez vous.

## Ce qui ne change pas
Verrou d'isolation (1 fenêtre = 1 article × 1 interlocuteur), données, notifications, négociation. Les tests d'isolation existants doivent rester verts.

## Vérification
Capture avant/après en taille téléphone (390×844) et portable (1280×800) sur une fenêtre Deal Room réelle.

## Détails techniques
- Web : `WaouhMatchChatWindow` (bandeau statut, fiche, frise, carte bot, résumé) regroupés dans un composant `DealContextSheet` (Sheet bottom sur mobile, right sur ≥768px) ; header compact `DealHeaderStrip`. Cartes bot inline rendues via variante `compact`. `WaouhChatTabs` hauteur réduite.
- Flutter : `live_resolved_match_screen.dart` et widgets associés : `showModalBottomSheet` pour le contexte, en-tête compact.
