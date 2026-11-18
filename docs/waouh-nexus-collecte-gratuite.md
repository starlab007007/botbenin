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

Le domaine doit aussi être autorisé côté serveur : les domaines raccordés sont intégrés au worker ; un nouveau domaine public vérifié s’ajoute à `WAOUH_COLLECTION_SITE_HOSTS`. Le format, l’attribution et les autorisations restent requis dans la configuration de la source. Une URL ajoutée seule au Radar n’active pas un collecteur.

Dans **Administration → WAOUH → Radar**, « Collecte gratuite » planifie uniquement les sources arrivées à échéance. Le message de mise en file ne signifie pas que les fiches sont déjà publiées. L’onglet Sources affiche le format et l’état ; « Voir les fiches NEXUS » ouvre la file commune. Les boutons SerpAPI et Apify sont explicitement identifiés comme des API à crédits.

## Recherche et qualité

Le domaine est déterminé avant classement : emploi, formation, service, véhicule, immobilier ou biens. La ville seule ne justifie pas un résultat. Les modèles de téléphone explicitement demandés doivent être présents dans le titre ou le modèle de l’offre. Un budget en FCFA est extrait même sans le mot « budget ».

Une mission de vente affiche séparément les demandes BUY/RFQ et les prix demandés par les vendeurs comparables. La comparaison impose le modèle déclaré, la devise et la ville lorsqu’elle est connue. Un résultat vide reste vide ; aucun acheteur ou prix n’est fabriqué.

Les annonces expirées sont écartées. Une date limite absente reste absente. Les disponibilités et les qualifications d’un prestataire référencé doivent encore être confirmées avec lui.

Les photos autorisées gardent leur attribution et leur lien original. Les annuaires et Telegram sont collectés sans réutiliser leurs photos. Les coordonnées téléphoniques sont chiffrées ; la lecture publique ne les révèle pas. Un contact public C1 permet de préparer le contact, sans accorder une autorisation automatique de prospection.

## Contrôles

Les tests de collecte et de classement sont dans `supabase/functions/_shared/waouh-free-collection-test.ts`. Le workflow Native les exécute avec les tests de collecte existants. Les contrôles Web et Flutter vérifient les parcours et l’affichage des références de prix. La santé et les rapports de chaque cible restent visibles dans la file commune et la configuration des sources.

## Pilotage et contrôle des données

Le panneau « Alimentation et fraîcheur NEXUS » est disponible dans `/admin/waouh/data-control` :

- Totaux exacts des fiches exploitables, contrôlées depuis sept jours, anciennes, sans date, nouvelles et externes expirées. Les éléments externes expirés restent dans l’historique et sont exclus des résultats.
- Qualité sur les 500 fiches les plus récemment contrôlées, avec effectif explicite : photos, prix et contacts manquants. Une absence de prix pour une prestation n’est pas remplacée par un montant inventé.
- Pause/reprise de chaque fournisseur, plafonds et motifs de blocage, cadence de chaque cible (30 minutes à 7 jours), dernier succès, échéance et dernières tâches. Une cadence choisie désactive l’adaptation pour cette cible.
- Les clés et quotas API restent dans la configuration Radar. Les réservations, contacts privés et baux de tâches ne sont pas modifiables depuis le navigateur. Toutes les commandes passent par la passerelle administrateur.

Le chat, le moteur interactif et le suivi utilisent le même chargeur de fiches et la date de clôture réelle. Le chat revérifie également les cartes historiques ; un ancien indicateur « exact » ne peut pas contourner le contrôle du modèle et du budget. Le parcours Flutter extrait la ville et le budget d’une phrase libre et les transmet à l’affichage et à l’ouverture de l’échange. Les prix comparables du vendeur restent séparés des budgets d’acheteurs.

Dans Radar → Sources, « Configurer la collecte gratuite » permet de choisir le modèle, l’URL publique sur le domaine déjà raccordé, la catégorie et l’attribution. Les nouvelles sources sont créées en pause. Enregistrer un modèle ne donne pas de permission de réutiliser les photos. Un nouveau domaine doit être ajouté à l’autorisation serveur avant toute collecte.

Une recherche simple n’envoie plus de message de prospection Radar. La prise de contact passe par le mandat explicite ou la Deal Room. Le moteur filtre avant d’enregistrer les positions des offres : « intéressé 1 » conserve la cible de la fiche n°1.
