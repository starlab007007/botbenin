# Flutter : finir la parité avec le Web et dégager les fenêtres de chat

## 1. Boutons d'action dans les messages du Bot
- Les messages guides du Bot (par exemple plusieurs négociations en cours) affichent jusqu'à 3 boutons, un par article, comme sur le Web. Les articles où c'est à vous de répondre passent en premier.
- Toucher un bouton ouvre directement la bonne fenêtre produit, et on peut continuer tout de suite.
- Mêmes données que le Web, ajoutées au test de parité commun.

## 2. « Voir plus » et « Voir l'historique »
- Fenêtre produit : les 3 derniers messages à l'ouverture, puis un bouton « Voir plus » qui charge les messages plus anciens, 20 par 20.
- Chat principal : il s'ouvre vide, avec un petit bouton « Voir l'historique » qui charge les anciens messages à la demande.

## 3. « Nouveau chat » vraiment vide
- « Nouveau chat » vide l'écran tout de suite. Aucun ancien message ne revient, même après un retour en arrière, un rechargement ou une reconnexion.

## 4. Fenêtres plus aérées (chat principal et fenêtres de négociation)
- Fenêtre de négociation : une seule bande fine en haut (photo, nom, prix, étape en cours). Le détail (étapes, conseils du Bot, résumé) s'ouvre en touchant la bande.
- Grandes cartes du Bot dans le fil réduites à une ligne avec « Voir détail ».
- Plus d'espace entre les messages, bulles plus légères, zone de saisie bien visible en bas.
- Messages techniques répétés regroupés ou masqués.

## Limites
- Je ne peux pas compiler l'appli ici : l'APK devra être généré chez vous, et la vérification sur téléphone reste à faire.
- La règle « 1 fenêtre = 1 article × 1 interlocuteur » ne change pas. Les tests Web doivent rester verts.

## Détails techniques
- `live_match_chat_v2.dart` : parsing des boutons `ouvrir-deal:` (même format que WaouhWebChat) → `openMatch` ; bande compacte ; cartes Bot compactes ; espacements.
- `live_match_history_service.dart` : paramètre `before` + bouton « Voir plus » (pages de 20).
- `live_controller.dart` : `_mainOpenedAt` remis à zéro et cache vidé sur Nouveau chat ; chargement à la demande de l'historique.
- `docs/contracts/chat/parity-fixtures.json` : cas des boutons de messages guides, rejoués côté Web (vitest) et Flutter (test Dart).
