# Pilotage NEXUS — sources, outils et parcours (26/11/2026)

## Constat de production
- 1 524 fiches dans la base commune, dont 1 201 annonces WAOUH et 323 fiches externes.
- CoinAfrique est la seule source externe vraiment productive : 75 nouvelles fiches en 24 h, avec prix et ville.
- Google, GoAfricaOnline et OpenStreetMap n'ont donné aucune nouvelle fiche en 24 h.
- Facebook donne de nouvelles fiches, mais presque jamais de prix.
- Seulement 12 % des fiches ont un prix : c'est ce qui limite le verdict marché et le prix conseillé.
- Sur 33 cibles activées, 10 ont produit des données utiles en 24 h. SerpAPI n'a rien produit d'utile, Firecrawl est inactif.

## Qui alimente quoi
| Parcours | Sources | Services | Indicateur |
|---|---|---|---|
| Produits / Achat | CoinAfrique, BambaAd, Afribaba, WAOUH | Recherche NEXUS, Market Reference IA | fiches avec prix et photo en 24 h |
| Vente / Acheteurs | demandes WAOUH, Radar, Facebook | Radar, Commerce Action | acheteurs joignables par annonce |
| Prestataires / Services | GoAfricaOnline, OpenStreetMap, Google Maps | Recherche NEXUS, Agent Ingest | fiches avec téléphone et ville |
| Opportunités | BCEAO, BOAD, bourses, emplois | NEXUS Follow-up | nouvelles opportunités par semaine |
| Objets rares | toutes sources, Radar urgence | Radar, SerpAPI Scout | délai avant la première piste |
| Négociation / Accord | sources ci-dessus et prix du marché | Deal Room, Price Compare, Bot | accords sur négociations ouvertes |
| Communication | WhatsApp | WAHA Readiness | messages en attente |

## Décisions appliquées
1. **Tour de contrôle** (/admin/waouh/tour-de-controle) : pour chaque source, la production en 24 h et sur 7 jours, la part de fiches avec prix, ville et photo, la date de dernière lecture et une alerte si rien n'est arrivé en 24 h. Elle montre aussi l'annuaire, les outils de lecture, les négociations et les messages en attente.
2. **Règle de qualité** : une fiche sans ville, ou sans prix ni contact joignable, est classée plus bas (×0,6).
3. **Fraîcheur** : un produit de plus de 30 jours est déclassé (×0,7) et masqué au-delà de 60 jours. Les opportunités et les services ne sont pas masqués.
4. **Résultats** : provenance (CoinAfrique, WAOUH…) et « Vu il y a … » affichés sur l'appli mobile et dans les sources de prix du site.

## Recommandations à suivre
- **Un seul outil par site** : Cheerio ou flux publics pour les pages simples, Playwright ou Crawlee pour les sites en JavaScript, Apify seulement si le site bloque. Couper les cibles SerpAPI qui ne produisent rien.
- **Priorité de raccordement** : BambaAd, Afribaba, Niosso, car ce sont des annonces avec prix.
- **Recette quotidienne réelle** par parcours, affichée dans la Tour de contrôle. Pas encore fait.
- **Hors code** : reconnecter WhatsApp, recharger Apify, vérifier le retour de la connexion Google sur Android.
