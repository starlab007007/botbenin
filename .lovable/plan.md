# Flutter WAOUH — parcours fluide, peu de texte, boutons précis

## Constats (captures du 26/11)
- Écran résultats surchargé : « Les offres » affiché 2 fois (sélection en haut + bloc assistant), séparateurs « ——— », cases « Comparer l'offre N » au-dessus de chaque carte, longs paragraphes d'aide.
- Trop de boutons concurrents par offre : « Organiser ce besoin », « Ouvrir », « Confier à Bot », « Comparer », « Tout afficher ».
- « Confier les 4 à Bot » échoue (« Impossible de confier à Bot… ») : l'enchaînement ouverture puis délégation renvoie une erreur non traitée par la cascade.
- « Ouvrir » sur la liste « Ouvrir un échange » échoue (« Échange indisponible. Connectez-vous… ») : message flou, cause non identifiée.
- Badges peu utiles (« Match 72% », « Avis IA » en texte), prix sans repère clair (« Références comparables insuffisantes »).

## Parcours cible (5 étapes visibles)
```text
[1 Besoin] → [2 Offres] → [3 Échange] → [4 Accord] → [5 Reçu]
```
Une barre d'étapes compacte (icônes + 1 mot) en haut de chaque écran du parcours, étape active mise en avant.

## Écrans
1. Besoin : un champ + micro (voix), 3 puces suggérées. Bouton unique « Chercher ».
2. Offres : une seule liste de cartes. Chaque carte = grande photo, prix en gros, ville, pastille couleur (Bon prix / Prix moyen / Cher / Prix à demander), pastille « Vérifié ».
   - 2 boutons seulement : « Je veux » (principal) et icône Bot « Bot négocie ».
   - Bandeau fixe en bas : « Bot s'occupe de tout » (confie les meilleures offres), un seul bouton.
   - Comparaison : appui long sur une carte (plus de cases à cocher). Tri en icône.
   - Suppression du bloc assistant en double, des séparateurs et des paragraphes d'aide.
3. Échange / Deal Room : ligne Bot (dernière action → prochaine étape) en une phrase, boutons d'action rapides (Proposer un prix, Appeler/Écrire, Accepter).
4. Accord : carte récap (article, prix, livraison) + « Valider » / « Modifier ».
5. Reçu : « J'ai reçu » / « Problème », puis écran de fin avec coche animée.

Textes : 1 ligne max par bloc, icônes systématiques, retour vibratoire léger et état de chargement sur chaque bouton (plus de double clic).

## Corrections fonctionnelles
- Confier à Bot : diagnostiquer l'erreur réelle (journaux serveur du flux ouverture/délégation), corriger, et passer automatiquement à l'offre suivante pour toute offre refusée ; message final clair si aucune offre n'est possible (« Aucune offre disponible, essayez une autre recherche »).
- Ouvrir un échange : identifier pourquoi l'ouverture échoue pour une offre visible, corriger ; ne jamais afficher une offre impossible à ouvrir.
- Intelligence : préremplir budget/ville depuis la demande, choisir automatiquement la meilleure offre mise en avant (« Meilleur choix »), proposer l'étape suivante seule après chaque action.

## Détails techniques
- Fichiers : `live_chat_search_screen.dart` (cascade délégation l.395-450), `live_chat_market_brief.dart`, `live_automatic_offers.dart`, `live_widgets.dart` (cartes), `live_deal_room.dart`, `live_deal_journey.dart`, `live_bot_next_step.dart`.
- Nouveau widget partagé `WaouhStepBar` + `WaouhOfferCard` compacte ; anciens widgets retirés des écrans de résultats sans supprimer la logique.
- Élargir la liste des codes tolérés par la cascade (y compris `price_missing`, `already_open`) et réutiliser une Deal Room existante au lieu d'échouer.
- Mêmes règles côté Web non modifiées (demande limitée à Flutter).
- Limite : pas de compilation Flutter ici ; validation finale sur votre téléphone Android avec captures.
