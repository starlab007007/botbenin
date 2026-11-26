# Parcours WAOUH premium de bout en bout (Web + application mobile)

## Constats sur vos captures
1. **Web « Je cherche pour vous »** : l'écran reste sur « Votre besoin est compris » et ne passe jamais aux offres. Le passage automatique vers la sélection ne se déclenche pas.
2. **Mobile « Ouvrir un échange »** : chaque clic affiche « Échange indisponible ». Le message cache la vraie raison. Les causes probables sont votre propre annonce (le bic à 5 001 FCFA est la vôtre), un article à vendre exigé à tort pour un achat, ou une session expirée. La cause exacte sera confirmée avant la correction.
3. **Trop de texte et doublons** : l'ancienne bulle « Top 5 annonces trouvées », les cases « Comparer l'offre », les encadrés « À savoir » et « Repère marché » apparaissent, puis une seconde liste « Ouvrir un échange » répète les mêmes offres.
4. **Bouton « Intéressé » invisible** sur la fiche produit : il n'existe que dans la seconde liste, sous le nom « Ouvrir ».
5. **Missions / Confier à Bot** : la fiche indique « Bot poursuit la mission », sans dire ce qu'il fait ni quelle est la suite. On n'y trouve que Pause, Arrêter et « Nouvelle recherche ».

## Parcours cible (identique sur Web et mobile)
```text
Besoin -> Offres (cartes) -> [Intéressé] ou [Confier à Bot] -> Deal Room -> Accord -> Suivi
```
- **Une seule liste d'offres** : une carte par offre avec photo, titre, prix, ville, le verdict marché en une ligne et deux boutons nets, **Intéressé** (principal) et **Confier à Bot**.
- Votre propre annonce porte le badge « Votre annonce » et n'a pas de bouton.
- **Intéressé** ouvre la Deal Room directement. En cas d'échec, un message précis s'affiche avec une action : « Connectez-vous », « Cette offre n'est plus disponible : voir la suivante » ou « Réessayer ».
- **Confier à Bot** affiche une confirmation courte (prix maximal et durée), puis ouvre la Deal Room en mode Bot.
- **Recherche** : une seule ligne de progression. Dès que des offres arrivent, l'écran bascule seul vers les cartes. Au bout de 20 s sans offre, il propose « Élargir la zone » ou « Activer la veille ».
- **Fiche mission** : elle affiche l'état (Recherche, Échange, Accord ou Suivi), la dernière action du Bot, puis un bouton principal **Voir la Deal Room** (ou **Voir les offres**), ainsi que Pause et Arrêter.
- **Moins de texte** : les bulles techniques et les doublons sont retirés. Le détail « À savoir » et « Repère marché » est replié derrière « Détails ».

## Étapes
1. **Diagnostiquer** l'échec de « Ouvrir » : lire la vraie erreur du serveur pour vos offres « bic » et corriger la cause, côté serveur ou côté application.
2. Corriger le blocage de l'écran de recherche Web et le basculement automatique vers les offres.
3. Fusionner les deux listes mobiles en une seule liste de cartes avec Intéressé et Confier à Bot, puis faire de même sur le Web.
4. Afficher des messages d'erreur précis avec une action de reprise.
5. Refaire la fiche Mission et le suivi Bot (état, dernière action, bouton de suite).
6. Faire le ménage visuel : espaces, un seul bouton principal par écran, textes courts.
7. Vérifier : tests automatiques sur le choix du bouton et des messages d'erreur, test Web en session réelle de la recherche jusqu'à l'ouverture de la Deal Room. L'application mobile devra être recompilée et testée sur votre téléphone.

## Détails techniques
- Mobile : `live_chat_search_screen.dart` (`_openManually` intercepte toutes les erreurs, et `_saleArticle` est appelé même pour un achat), fiche Mission, `premium_journey_contract.dart`.
- Web : `WaouhPremiumJourneyPage.tsx` (phase `understanding` sans transition), `WaouhGuidedProgress`.
- Serveur : l'action `open` de `waouh-deal-room` renvoie des codes (`own_offer`, `sale_article_required`, `unauthorized`) traduits en messages pour l'utilisateur, jamais affichés bruts.
- Limites : il faut deux comptes, un acheteur et un vendeur, pour tester jusqu'à l'accord. WhatsApp est toujours déconnecté.
