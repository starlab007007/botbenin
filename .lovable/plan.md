# Analyse de marché IA dans l'appli mobile : audit et plan premium

## Ce que l'audit montre
- **Achat : l'IA est bien là.** Après une recherche, l'appli affiche une analyse du marché : prix bas, moyen et haut, offre conseillée, écart de chaque offre au prix moyen. Chaque constat de l'IA renvoie à des annonces réelles numérotées. Un constat sans source est écarté.
- **Dans la Deal Room :** la même carte d'analyse apparaît quand on cherche des offres.
- **Vente : pas d'IA.** Le vendeur voit seulement si son prix est en dessous ou au-dessus du marché (calcul simple, à partir de 2 annonces). Il n'a ni prix conseillé argumenté, ni conseil pour vendre plus vite.
- **Négociation : pas d'IA.** Quand une contre-offre arrive, rien ne dit si elle est bonne par rapport au marché.
- **Prix réel hors WAOUH :** la recherche de prix sur d'autres sites existe, mais elle n'est utilisée nulle part, ni sur le Web ni sur mobile.
- **Présentation :** cartes empilées, textes longs, peu de hiérarchie. Le rendu n'est pas encore celui d'une appli haut de gamme.

## Ce que je propose
1. **Carte « Verdict marché »** unique, au même endroit pour l'achat, la vente et la négociation :
   - un verdict en une ligne : Bonne affaire, Prix juste ou Trop cher ;
   - une jauge bas / moyen / haut qui montre où se place le prix ;
   - 2 ou 3 raisons courtes avec leur source, et « Voir les annonces comparées » à toucher.
2. **Vendeur :** un prix conseillé avec une fourchette et un bouton « Appliquer ce prix ». Si son prix est trop haut, un conseil pour vendre plus vite.
3. **Négociation :** à chaque contre-offre, une ligne du type « 4 500 F, c'est 10 % sous le marché : vous pouvez accepter ». Bot s'en sert aussi pour décider dans les limites que vous lui avez fixées.
4. **Prix hors WAOUH :** quand il y a moins de 3 annonces WAOUH comparables, ajouter les prix trouvés sur d'autres sites, avec leur nom.
5. **Finition premium :** même style de carte, coins et espacements partout, chiffres en gras, couleurs vert, ambre et rouge pour le verdict, chargement animé au lieu de l'écran vide, messages courts.
6. **Web :** même verdict et même jauge, pour que l'appli et le site restent identiques.

## Limites
- Je ne peux pas compiler l'appli ici : vous devrez générer l'APK pour voir le résultat.
- Les prix hors WAOUH dépendent du service de lecture des sites. Si son crédit est épuisé, seules les annonces WAOUH sont comparées.

## Détails techniques
- Sources IA existantes : `waouh-market-reference` (constats avec sources). `waouh-price-compare` existe mais n'est appelé nulle part.
- Mobile : un nouveau widget `LiveMarketVerdictCard`, utilisé dans `live_chat_market_brief.dart`, `live_seller_brief.dart` et `live_deal_room.dart` (contre-offres).
- Serveur : ajouter un mode `role: buy|sell|counter` et `amount` à `waouh-market-reference`, qui renvoie `verdict`, `suggested_range` et une ligne de conseil. Repli sur `waouh-price-compare` quand il y a moins de 3 annonces comparables.
- Web : un composant équivalent dans le chat et la Deal Room. Les tests chat existants doivent rester au vert.
- Ajouter des tests sur les seuils du verdict : jusqu'à -10 % = bonne affaire, au-delà de +15 % = trop cher.
