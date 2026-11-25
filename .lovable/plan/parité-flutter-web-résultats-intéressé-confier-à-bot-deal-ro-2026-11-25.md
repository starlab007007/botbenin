# Parité Flutter ↔ Web : résultats, Intéressé, Confier à Bot, Deal Room

## Constat (captures)
- « Confier les 4 à Bot » échoue sur mobile avec « Impossible de confier à Bot pour le moment ».
- Sous « Les offres », Flutter affiche encore l'ancien message Bot « Top 5 annonces trouvées » + « Sélection WAOUH · bic bic » + « Comparer 0/5 » au lieu des cartes d'offres du Web.
- Sur le Web, chaque action (Intéressé, Bot, Détails) ouvre directement la Deal Room / la discussion de l'article.

## 1. Diagnostiquer l'échec « Confier à Bot »
- Lire les journaux du service Deal Room au moment des essais (23:06) pour connaître la vraie raison (offre sans identifiant, mandat, ville, compte).
- Comparer la requête Flutter (`open` puis `delegate`) à celle du Web, champ par champ (`fabric_id`, `city`, `budget_max`, `sale_article_id`, `cascade_candidates`).
- Corriger côté Flutter (et côté serveur seulement si le défaut y est) ; afficher un message clair et utile selon la cause, jamais l'erreur brute.

## 2. Après « Confier à Bot » : ouvrir la Deal Room
- En cas de succès, ouvrir directement la Deal Room créée (même écran de suivi Bot que le Web), au lieu d'un simple message en bas d'écran.
- Même chose pour les deux écrans concernés (recherche du chat et écran Achat/Vente Avatar).

## 3. Résultats de recherche identiques au Web
- Remplacer, sous « Les offres », le bloc ancien style (Top 5, Sélection, Comparer) par des cartes d'offres comme sur le Web : photo, titre, prix, ville, source, puis
  - bouton principal « Intéressé » → ouvre la discussion de cet article avec ce vendeur (règle 1 fenêtre = 1 article × 1 interlocuteur) ;
  - « Bot » → confie cette seule offre à Bot puis ouvre sa Deal Room ;
  - « Détails » ;
  - « Voir l'annonce d'origine » / « Contact non disponible » quand le vendeur n'est pas joignable.
- Bandeau du haut aligné sur le Web : « N offres · Bot recommande la n°1 », plafond affiché, bouton « Confier les N à Bot » ; message dédié si aucun vendeur n'est joignable.

## 4. Vérification
- Web : test réel connecté de « Intéressé » et « Confier à Bot » sur une recherche, ouverture de la Deal Room, et tests automatiques du chat (244) toujours verts.
- Serveur : vérifier dans la base que la Deal Room et le mandat Bot créés depuis le mobile sont identiques à ceux du Web.
- Flutter : non compilable ici ; vous générerez l'APK pour l'essai sur téléphone.

## Détails techniques
- Fichiers Flutter : `lib/live/live_chat_search_screen.dart`, `lib/live/live_avatar_commerce_screen.dart`, `lib/live/live_automatic_offers.dart`, `lib/live/live_deal_room.dart` (navigation vers `LiveDealRoomScreen(roomId:)`).
- Référence Web : `WaouhOfferActions.tsx` (WaouhOfferActions, WaouhBotBanner), `WaouhDelegateButton.tsx`, `interestNavigation.ts`.
- Flux synchro chat verrouillé (v13) non modifié.
