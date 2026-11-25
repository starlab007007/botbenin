# Pilotage NEXUS : des 50 sources aux parcours Recherche, Achat, Vente, Opportunité, Service, Trouver

## Diagnostic (données de production, base commune)
- 1 524 fiches dans la base commune. 1 201 viennent de WAOUH (annonces internes), 323 de sources externes.
- **Une seule source externe produit vraiment** : CoinAfrique, avec 75 nouvelles fiches en 24 h, presque toutes avec prix et ville.
- Google (137 fiches), GoAfricaOnline (30), OpenStreetMap (15) : **0 nouvelle fiche en 24 h**. Les données vieillissent.
- Facebook : 7 nouvelles fiches en 24 h, mais presque jamais de prix. BCEAO, BOAD et les bourses donnent des opportunités, sans prix, ce qui est normal.
- **Seulement 12 % des fiches ont un prix.** C'est ce qui limite le verdict marché et le prix conseillé.
- Vos chiffres le confirment : 33 cibles activées, 10 utiles en 24 h. SerpAPI, 8 cibles, n'a rien produit d'utile. Firecrawl est inactif.
- Les 6 moteurs de lecture sont installés et testés. Mais un moteur installé ne veut pas dire un site raccordé : c'est la production de fiches qui compte.

## Réponse à la question : qui assure quoi
```text
Fonction              Sources qui l'alimentent               Service qui l'exploite         Indicateur de pilotage
Produits / Achat      CoinAfrique, BambaAd, WAOUH, Afribaba  Recherche NEXUS, Market Ref IA  fiches avec prix + photo / 24 h
Vente / Acheteurs     Demandes WAOUH, Radar, Facebook        Radar, Commerce Action          acheteurs joignables par annonce
Prestataires/Service  GoAfricaOnline, OSM, Google Maps       Recherche NEXUS, Agent Ingest   fiches avec téléphone / ville
Opportunités          BCEAO, BOAD, bourses, emplois          NEXUS Follow-up                 nouvelles opportunités / semaine
Objets rares          toutes sources + Radar urgence         Radar, SerpAPI Scout            délai avant 1re piste
Négociation / Accord  fiches ci-dessus + prix marché         Deal Room, Price Compare, Bot   accords / Deal Rooms ouvertes
Communication         WhatsApp (WAHA)                        WAHA Readiness, file d'envoi    messages en attente (18, bloqué)
```

## Recommandations de pilotage (par ordre d'impact)
1. **Un seul tableau « Tour de contrôle »** dans l'administration. Pour chaque source : outil utilisé, fiches du jour, part avec prix, photo et contact, dernière réussite, alerte si rien depuis 24 h. Pour chaque parcours : le tableau ci-dessus, en direct.
2. **Choisir le bon outil par site**, au lieu de les empiler : flux publics ou Cheerio pour les pages simples, Playwright ou Crawlee pour les sites qui se chargent en JavaScript, Apify seulement pour ce qui est bloqué. Couper SerpAPI là où il ne produit rien, pour économiser le crédit.
3. **Règle de qualité à l'entrée** : une fiche n'est montrée en tête de résultats que si elle a un titre, une ville et une provenance, plus un prix ou un contact. Les autres restent en réserve, sans polluer la recherche.
4. **Fraîcheur** : une fiche de plus de 30 jours sans nouvelle lecture est déclassée, et masquée après 60 jours pour les produits.
5. **Mise en valeur dans les résultats** : badge de provenance (« CoinAfrique », « WAOUH »), « vu il y a 2 h », photo, prix et verdict marché. La fiche joignable dans l'appli passe avant la fiche à joindre par l'extérieur.
6. **Priorité de raccordement** : BambaAd, Afribaba et Niosso ensuite, car ce sont des annonces avec prix. C'est ce qui fait monter les 12 %.
7. **Recette** : pour chaque ligne « à valider » de votre tableau, un scénario automatique réel par parcours (produit, prestataire, opportunité, acheteur, objet rare, accord, clôture), lancé chaque jour, avec son résultat affiché dans la Tour de contrôle. La parité Web/Flutter et l'APK restent à certifier à la main.
8. **Débloquants hors code** : reconnecter WhatsApp, recharger Apify, et confirmer le retour de la connexion Google sur Android.

## Ce que je construirai si vous approuvez
- La page « Tour de contrôle NEXUS » (points 1 et 7), en lecture seule, avec des messages simples.
- La règle de qualité et de fraîcheur dans le classement des résultats (points 3 et 4), et le badge de provenance avec « vu il y a… » (point 5), sur le Web et sur Flutter.
- Le rapport de pilotage complet dans le dossier docs.

## Détails techniques
- Données : `waouh_signal_fabric` (`source_url`, `observed_at`, `price_min`, `city`, `evidence`), `waouh_collection_platforms` et `waouh_collection_entries`, `cron.job_run_details`.
- Une fonction de vue en sécurité définie et réservée aux admins, qui agrège par source et par parcours. Aucune donnée brute ni nom technique n'est montré à l'écran.
- Classement : pénalité de fraîcheur et seuil de complétude dans la recherche NEXUS existante. Tests pour les seuils de 30 et 60 jours et pour la complétude minimale.
- Les scénarios quotidiens réutilisent `waouh-e2e-test`.
