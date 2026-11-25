# Audit parcours mobile (Flutter) jusqu'à l'accord — état et reste à faire

## Ce qui est en place (vérifié dans le code)
- Une seule Deal Room sur mobile : tous les accès (recherche, Intéressé, Bot, Radar, NEXUS, notifications) ouvrent la même page de négociation existante. Aucune nouvelle page créée.
- Même serveur que le Web : ouverture, confier à Bot, contre-offres, relecture des conditions, Accepter / Refuser, livraison.
- « Confier à Bot » saute vos propres articles et les offres indisponibles, puis ouvre directement la Deal Room.
- Messages d'erreur clairs en français (ex. « Cette piste vous appartient »).

## Pas encore confirmé
- L'appli n'a jamais été compilée ni lancée ici : aucun parcours n'est prouvé en marche sur téléphone.
- Pas de test réel de bout en bout (recherche → Intéressé → négociation → accord) sur Web ni mobile.

## Reste à faire
1. Cartes de résultats mobile : ajouter photo et bouton « Détails » comme sur le Web.
2. Grandes cartes du Bot dans le fil : les réduire à une ligne « Voir détail ».
3. Vérifier que la frise des étapes reste accessible dans le détail de la Deal Room mobile.
4. Test réel signé sur le Web avec deux comptes (acheteur / vendeur) jusqu'à « Accord confirmé », puis rapport.
5. Vous : générer l'APK et refaire le même parcours sur téléphone ; me renvoyer captures en cas d'écart.
6. WhatsApp reste bloqué (numéro à reconnecter) : sans cela, le vendeur joint par WhatsApp ne reçoit pas l'offre.

## Détails techniques
- Route Flutter `/app/chat/room` → `LiveDealRoomScreen` (room_id, fabric_id, delegate, propose).
- Points 1–3 : `live_chat_search_screen.dart`, `live_match_chat_v2.dart`, `live_deal_room.dart`.
- Point 4 : Playwright sur localhost, deux sessions, lecture des statuts d'accord en base.
- Les 386 tests chat et l'isolation 1 fenêtre = 1 article × 1 interlocuteur restent intacts.
