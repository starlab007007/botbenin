# Audit : fenêtres de chat Flutter = Web, backend connecté, plateforme stable

## 1. Comparaison Flutter / Web, écran par écran (lecture du code)
Reprendre le tableau de parité (docs/PARITY_CHAT_WEB_FLUTTER.md) et le mettre à jour avec les changements récents :
- Chat principal : ouverture vide, bouton « Voir l'historique » (Web) contre filtre « depuis l'ouverture » sans bouton (Flutter).
- Fenêtre produit (Deal Room) : 3 derniers messages, « Voir plus », bande d'en-tête compacte + volet détail, carte Bot réduite, frise des 7 étapes.
- Boutons d'action dans les messages guides du Bot (nouveaux sur le Web, absents sur Flutter).
- Envoi, boutons serveur (Accepter, Refuser, paiement…), conversation clôturée, isolation 1 fenêtre = 1 article × 1 interlocuteur, notifications qui ouvrent la bonne fenêtre, temps réel.
Chaque écart : classé « à corriger » ou « écart voulu ».

## 2. Contrôle du backend sur les données réelles (lecture seule)
- Journaux des fonctions du chat (envoi, historique, actions commerce, notifications, WhatsApp) : erreurs et temps de réponse des derniers jours.
- Tables messages, notifications, file d'envoi WhatsApp : messages bien rattachés à un article et un interlocuteur, aucun mélange, aucun doublon, photos stockées, notifications vraiment ouvertes.
- Vérifier que les messages envoyés depuis Flutter portent les mêmes informations que ceux du Web (titre produit, identifiant de corrélation, fil, rôle).
- État de la session WhatsApp « WaouhApp » (actuellement refusée par le serveur : file en attente).

## 3. Tests
- Web : tests automatiques du chat + test de parité commun Web/Flutter.
- Web en vrai : connexion avec le compte de test, recherche, « Intéressé », ouverture de la Deal Room, envoi d'un message de test, boutons d'action, sur ordinateur et téléphone, puis nettoyage des données de test.
- Flutter : je ne peux pas compiler ni lancer l'appli ici ; contrôle par lecture du code et des tests Dart.

## 4. Corrections
Corriger les écarts classés « à corriger » (côté Web, Flutter et serveur), en priorité :
- boutons d'action des messages guides sur Flutter ;
- frise des 7 étapes retirée du haut de la fenêtre Flutter (dans le volet détail) ;
- « Voir plus » dans les fenêtres produit Flutter.
Le verrou d'isolation et tous les tests doivent rester verts.

## 5. Rapport
Tableau de parité à jour, état du backend, résultats des tests, corrections faites, points restants (session WhatsApp à reconnecter, APK à générer chez vous).

## Détails techniques
- Fichiers Flutter : flutter_waouh_app/lib/live (live_match_chat_v2, live_controller, live_match_history_service, live_commerce_action_client).
- Web : WaouhWebChat, WaouhMatchChatWindow, WaouhMatchChatList, commerceAction.
- Fonctions : waouh-channel-in(-secure), waouh-match-history, waouh-commerce-action, waouh-notify-dispatch, waouh-outbound-dispatch (erreur waha_health_http_401 visible dans les journaux).
- Fixtures de parité : docs/contracts/chat/parity-fixtures.json, à étendre aux boutons des messages guides.
