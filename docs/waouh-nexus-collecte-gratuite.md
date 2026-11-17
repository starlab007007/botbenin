# Collecte gratuite de NEXUS

Le parcours de recherche et les mandats utilisent les fiches communes et la collecte HTTP publique par défaut. Ils ne téléchargent aucun modèle et ne nécessitent ni abonnement à une API de scraping, ni appel à un LLM pour préparer la recherche. Les sources payantes restent une option explicite de l’API (`use_paid_sources: true`), conservée dans le mandat et transmise au suivi.

## Sources raccordées

| Source | Données collectées |
| --- | --- |
| CoinAfrique Bénin | Services, emplois, téléphones, véhicules, matériel professionnel |
| Go Africa Online Bénin | Professionnels de plomberie, centres de formation informatique |
| Flux officiel DBAU | Bourses, allocations universitaires, formations et séminaires |
| Canal Telegram public L-frii | Publications récentes concernant le Bénin, recrutements notamment |

Ces neuf nouvelles cibles utilisent `collection_transport: "direct"`, le fournisseur de file `public_feed` et le worker existant. Elles partagent les protections de déduplication, de bail, de publication atomique, de reprise et de révocation des contacts. La première collecte a inséré 55 fiches et actualisé 4 fiches existantes.

## Modèles de collecte réutilisables

La configuration d’une source publique autorisée peut choisir `collection_format` parmi :

- `rss_atom` : flux RSS ou Atom, avec lien original du même site et publication datée ;
- `schema_org` : données JSON-LD Product, Service, LocalBusiness, JobPosting ou Course ;
- `telegram_public` : page publique `https://t.me/s/canal`, chaque publication étant rattachée au même canal ;
- `goafrica` : cartes d’entreprises de l’annuaire, contacts limités à leur carte ;
- `coinafrique` : catégories et fiches originales, avec identité du produit et contact du vendeur ;
- `catalog_json` : catalogue structuré fourni par un site raccordé.

Exemple de configuration pour le flux officiel existant :

```json
{
  "collection_format": "rss_atom",
  "collection_transport": "direct",
  "canonical_url": "https://bourses.enseignementsuperieur.gouv.bj/feed/",
  "category": "Formation et bourses",
  "automation_authorized": true,
  "media_reuse_authorized": false,
  "attribution": "DBAU · Ministère de l’Enseignement supérieur du Bénin"
}
```

Une nouvelle source doit être vérifiée avant activation : URL réelle, format public, conditions de collecte, attribution et portée des contacts. Le moteur n’ouvre pas les groupes privés et ne contourne aucune connexion. Facebook conserve son connecteur existant à crédits plafonnés ; il ne devient pas illimité ou gratuit du fait de cette extension.

## Recherche et qualité

Le domaine est déterminé avant classement : emploi, formation, service, véhicule, immobilier ou biens. La ville seule ne justifie pas un résultat. Les modèles de téléphone explicitement demandés doivent être présents dans le titre ou le modèle de l’offre. Un budget en FCFA est extrait même sans le mot « budget ».

Une mission de vente affiche séparément les demandes BUY/RFQ et les prix demandés par les vendeurs comparables. La comparaison impose le modèle déclaré, la devise et la ville lorsqu’elle est connue. Un résultat vide reste vide ; aucun acheteur ou prix n’est fabriqué.

Les annonces expirées sont écartées. Une date limite absente reste absente. Les disponibilités et les qualifications d’un prestataire référencé doivent encore être confirmées avec lui.

Les photos autorisées gardent leur attribution et leur lien original. Les annuaires et Telegram sont collectés sans réutiliser leurs photos. Les coordonnées téléphoniques sont chiffrées ; la lecture publique ne les révèle pas. Un contact public C1 permet de préparer le contact, sans accorder une autorisation automatique de prospection.

## Contrôles

Les tests de collecte et de classement sont dans `supabase/functions/_shared/waouh-free-collection-test.ts`. Le workflow Native les exécute avec les tests de collecte existants. Les contrôles Web et Flutter vérifient les parcours et l’affichage des références de prix. La santé et les rapports de chaque cible restent visibles dans la file commune et la configuration des sources.
