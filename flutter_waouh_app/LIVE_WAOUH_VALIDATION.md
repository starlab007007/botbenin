# Validation fonctionnelle WAOUH Flutter

La cible de test connectee est `lib/live/live_app.dart`. Utiliser exclusivement :

```bash
bash scripts/build_arm64_test.sh
```

Le script genere `release-apks/WaouhApp-arm64-test.apk` et refuse un binaire Flutter Demo.

## Donnees et contrats verifies par le client

- Session mobile persistante : `waouh_web_session_id`.
- Chat principal : Edge Function `waouh-channel-in`.
- Historique principal : `waouh-history`, avec lecture de continuité seulement si la fonction n'est pas disponible.
- Conversations identifiees : `waouh_conversations` et `waouh-operator-send`.
- Images du chat : bucket `waouh-uploads`.
- Statuts 24 h : bucket `waouh-statuses` et Edge Function `waouh-status-publish`.
- Matches : `waouh_notifications`, puis secours via messages lies a `waouh_articles`.
- Archives de matches : stockage local isole par session WAOUH.

## Recette Android a executer

1. Ouvrir WAOUH en invite, envoyer un message texte, puis fermer et rouvrir l'application : le fil doit etre retrouve.
2. Connecter un compte, envoyer un message avec une image prise par camera puis une image galerie.
3. Appuyer sur Vendre, Acheter et Negocier : les textes de payload doivent etre editables puis envoyes dans `waouh-channel-in`.
4. Creer un statut Vente, Achat et Annonce : titre, prix/budget, ville, GPS avec consentement, deux photos maximum et publication 24 h.
5. Verifier sur Supabase : le statut contient les URL Storage, `expires_at` et les coordonnees si le GPS a ete accepte.
6. Creer ou recevoir un match : la ligne doit apparaitre dans Conversations produit, ouvrir une fenetre liee a l'article et envoyer `meta.article_id`, `meta.role`, `meta.buyer_profile_id` et `meta.counterpart_user_id`.
7. Archiver un match puis afficher Archives : le match reste ouvrable.
8. Archiver une conversation standard : elle doit disparaitre de la liste active.
9. Creer une notification `match`, `new_buyer` ou `radar_match` dans `waouh_notifications` : toucher la notification doit ouvrir la fenetre de match correspondante et la marquer lue.
10. Creer une notification avec `conversation_id` : toucher la notification doit ouvrir la conversation identifiee.

## Notifications push Android

Les notifications dans l'application sont connectees a `waouh_notifications`.

La reception Firebase en arriere-plan exige encore un fichier Android Firebase valide (`google-services.json`) et la configuration Firebase du projet. Ce fichier ne doit pas etre place dans Git. Une fois disponible, connecter le token FCM a l'Edge Function `register-device-token` et tester le toucher de notification sur un appareil reel.
