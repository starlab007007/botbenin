# Canaux de collecte BOT.BJ / WAOUH — 24 novembre 2026

État vérifié en production le 24 novembre 2026 à 23 h 16 (Bénin). Projet BOT.BJ. Les statuts du registre décrivent une configuration ; ils ne prouvent pas à eux seuls une collecte récente.

## Gestion commune

Les annonces de l’application, partenaires et entrées externes alimentent les fiches communes de NEXUS. Les collecteurs automatiques utilisent une file, une politique par fournisseur, une cadence par cible, des baux de tâches, une déduplication et une publication contrôlée. Le worker commun est appelé chaque minute et traite au maximum deux tâches par appel. Une cadence adaptative ralentit les sources vides ou en erreur. Les recherches consultent les fiches qualifiées et excluent les annonces expirées.

Pilotage : [Administration des données](https://bot.bj/admin/waouh/data-control), Radar → Sources et [GUARDIAN](https://bot.bj/admin/waouh/guardian). Une source autorisée ne peut pas contourner la pause du fournisseur. Un contact collecté n’autorise pas une prospection automatique.

## Pause et remise en service

- Les cinq politiques fournisseurs étaient déjà à `paused=false`, et Radar/NEXUS autorisaient l’automatisation.
- Les anciens planificateurs site/Facebook toutes les six heures étaient désactivés. GUARDIAN les consultait encore, ce qui produisait `POLICY_PAUSED` malgré le worker commun actif.
- Le worker commun échouait sur `waouh_collection_claim_targeted` : le parcours de l’historique dépassait le délai SQL de 8 secondes. Les journaux de production confirment le dépassement.
- La migration `20261124221419_waouh_collector_resume_health.sql` ajoute les index des tâches actives et tentatives ouvertes, raccorde GUARDIAN au worker actuel et porte le délai HTTP de son appel à 180 secondes. Les permissions et pauses existantes sont conservées.
- La requête de sélection utilise désormais l’index des tâches actives et s’exécute en 2.161 ms sur le contrôle effectué. Le worker a répondu HTTP 200 et son heartbeat a repris.
- Les quinze cibles gratuites dont les anciennes tâches avaient expiré ont été remises à échéance immédiatement, avec une trace d’audit. Les neuf groupes Facebook autorisés restent gérés par leurs limites existantes.
- Première preuve de reprise : quatre tâches Facebook réussies et douze nouvelles fiches. Deux autres tâches ont été bloquées ; les plafonds restent appliqués. À 23 h 16, GUARDIAN indiquait `SOURCE_DELAYED` pendant le rattrapage, au lieu de `POLICY_PAUSED`.
- Apify : plafond conservé de 0,05 USD par appel et 0,20 USD par jour ; utilisation des crédits inclus seulement. Le contrôle du compte indiquait environ 0,37 USD de crédits inclus restants. Aucun achat ni relèvement de plafond effectué.

## Inventaire des 40 entrées du registre

| Canal | Clé | Mode | Configuration enregistrée |
| --- | --- | --- | --- |
| Web social public / Apify | `apify` | api | Déclaré actif |
| Demandes B2B / RFQ | `b2b_rfq` | hybrid | Ingestion uniquement |
| GTIN / code-barres | `barcode` | native | Déclaré actif |
| Annuaires entreprises Bénin | `benin_directory` | hybrid | Ingestion uniquement |
| Gouvernement du Bénin — Emploi | `benin_government_jobs` | public_feed | Déclaré actif |
| Gouvernement du Bénin — Marchés publics | `benin_government_procurement` | public_feed | Déclaré actif |
| © OpenStreetMap contributors · ODbL | `benin_open_places` | public_feed | Déclaré actif |
| Facebook Business | `facebook_business` | hybrid | Désactivé |
| Facebook public / groupes autorisés | `facebook_public` | hybrid | Déclaré actif |
| Sites Web / Firecrawl | `firecrawl` | api | Déclaré actif |
| Google Places / Maps | `google_places` | api | Déclaré actif |
| Instagram Business | `instagram_business` | hybrid | Désactivé |
| Instagram public / Web | `instagram_public` | hybrid | Déclaré actif |
| LinkedIn public / Web | `linkedin_public` | hybrid | Déclaré actif |
| Partenaires WAOUH | `partner` | partner | Déclaré actif |
| QR Commerce | `qr` | native | Ingestion uniquement |
| Radar IA | `radar_ia` | hybrid | Déclaré actif |
| Flux RSS / Atom publics | `rss_public` | public_feed | Déclaré actif |
| WAOUH Scouts / terrain | `scout` | share | Déclaré actif |
| Web public / SerpAPI | `serpapi` | api | Désactivé |
| Partager vers WAOUH | `share_to_waouh` | share | Déclaré actif |
| SMS / RCS WAOUH | `sms_rcs` | api | Configuration requise |
| Statuts WAOUH / Publications | `status` | native | Déclaré actif |
| Telegram public | `telegram_public` | public_feed | Désactivé |
| TikTok connecté | `tiktok_connected` | oauth | Désactivé |
| TikTok public / Web | `tiktok_public` | hybrid | Déclaré actif |
| USSD Commerce | `ussd` | api | Prévu |
| WAOUH Voice | `voice` | native | Déclaré actif |
| BCEAO — Marchés publics et achats | `waemu_bceao_procurement` | public_feed | Déclaré actif |
| BOAD — Appels d’offres | `waemu_boad_procurement` | public_feed | Déclaré actif |
| WAHA · Annuaire synchronisé | `waha_directory` | native | Déclaré actif |
| WAOUH App / Chat | `waouh_app` | native | Déclaré actif |
| Catalogues commerciaux autorisés | `waouh_commercial_web` | public_feed | Déclaré actif |
| Annonces issues de groupes autorisés | `waouh_facebook_collection` | api | Déclaré actif |
| Publications publiques · collecte gratuite | `waouh_public_social` | public_feed | Déclaré actif |
| Web social public | `web_social` | hybrid | Déclaré actif |
| WhatsApp WAOUH | `whatsapp` | native | Déclaré actif |
| WhatsApp groupes autorisés | `whatsapp_groups` | native | Déclaré actif |
| X / Twitter public | `x_public` | hybrid | Déclaré actif |
| YouTube public | `youtube_public` | hybrid | Déclaré actif |

Les réseaux sociaux « public / Web » utilisent les publications partagées, l’ingestion existante ou les résultats publics accessibles ; cette liste ne signifie pas qu’un robot autonome collecte chaque réseau. Facebook Business, Instagram Business et TikTok connecté restent désactivés. USSD est prévu ; SMS/RCS requiert sa configuration. WhatsApp et son annuaire sont déclarés actifs dans le registre mais la session centrale exige une reconnexion : aucune reprise WhatsApp n’est confirmée.

Le canal Telegram public L-frii est collecté par `waouh_public_social` et le transport direct. L’entrée générique `telegram_public` reste désactivée. L’annuaire ouvert utilise `benin_open_places` ; les annuaires et RFQ déclarés « ingestion uniquement » ne sont pas des robots indépendants.

## Inventaire des 35 cibles planifiées

Les cadences suivantes sont celles observées à 23 h 16 ; l’adaptation peut ensuite les modifier. « Activée » indique l’autorisation de la cible, sans garantir la disponibilité du fournisseur. Les huit recherches SerpAPI sont encore autorisées dans la table des cibles, mais le connecteur est désactivé et ses derniers essais étaient bloqués pour accès/facturation.

| Cible | Fournisseur | Type | Autorisation | Cadence observée |
| --- | --- | --- | --- | --- |
| Achat et vente de moto d'occasion | apify | apify | Activée | 1080 min |
| Achat et vente des motos d'occasion à hèvié | apify | apify | Activée | 2160 min |
| ACHAT/ VENTE/ TROC MOTO WAVE AU BENIN | apify | apify | Activée | 1080 min |
| chambrea louer a calavi godomey | apify | apify | Activée | 4320 min |
| CHAMBRES À LOUER À COTONOU ET ENVIRONS | apify | apify | Activée | 1080 min |
| COTONOU BUSINESS | apify | apify | Activée | 4320 min |
| FB achat vente portables | apify | apify | Désactivée | 8640 min |
| Groupe vente Cotonou | apify | apify | Désactivée | 480 min |
| Iphone occasion | apify | apify | Activée | 1080 min |
| La vente des motos occasion à cotonou | apify | apify | Activée | 8640 min |
| Vente de voiture d'occasion au Bénin | apify | apify | Activée | 2160 min |
| Martistore | firecrawl | site | Désactivée | 960 min |
| Annuaire ouvert du Bénin | public_feed | site | Activée | 2880 min |
| BCEAO — Marchés publics et achats | public_feed | feed | Activée | 480 min |
| BOAD — Appels d’offres | public_feed | feed | Activée | 480 min |
| CoinAfrique BJ | public_feed | site | Activée | 60 min |
| CoinAfrique · Emplois | public_feed | site | Activée | 720 min |
| CoinAfrique · Matériel professionnel | public_feed | site | Activée | 60 min |
| CoinAfrique · Services | public_feed | site | Activée | 1440 min |
| CoinAfrique · Téléphones et tablettes | public_feed | site | Activée | 480 min |
| CoinAfrique · Véhicules | public_feed | site | Activée | 60 min |
| DBAU · Bourses et formations | public_feed | site | Activée | 2880 min |
| Go Africa Online · Formation informatique | public_feed | site | Activée | 2880 min |
| Go Africa Online · Plomberie | public_feed | site | Activée | 2880 min |
| Gouvernement du Bénin — Emploi | public_feed | feed | Activée | 240 min |
| Gouvernement du Bénin — Marchés publics | public_feed | feed | Activée | 180 min |
| Telegram public · L-frii · Bénin | public_feed | site | Activée | 1440 min |
| Web · frigo | serpapi | web | Activée | 1440 min |
| Web · meuble | serpapi | web | Activée | 1440 min |
| Web · moto | serpapi | web | Activée | 1440 min |
| Web · ordinateur | serpapi | web | Activée | 1440 min |
| Web · smartphone | serpapi | web | Activée | 1440 min |
| Web · télévision | serpapi | web | Activée | 1440 min |
| Web · vêtement | serpapi | web | Activée | 2880 min |
| Web · voiture | serpapi | web | Activée | 1440 min |

Bilan des cibles : 15 gratuites (11 sites/flux/annuaire/Telegram et 4 index officiels), 9 groupes Facebook autorisés sur 11, 8 recherches Web SerpAPI et 1 cible Firecrawl désactivée. Un groupe WhatsApp est aussi enregistré dans Radar, sans scan confirmé ; il ne fait pas partie de ces 35 cibles de la file commune.

## Blocages conservés et suites

- **WhatsApp** : reconnecter la session centrale, puis vérifier la réception d’un message et l’ingestion d’un groupe autorisé. Les statuts « live » du registre ne suffisent pas.
- **SerpAPI / Firecrawl** : résoudre l’accès, les crédits ou la facturation avant tout nouvel essai utile. Aucune activation payante ajoutée.
- **Facebook** : la collecte a repris, mais la cadence réelle dépend du crédit inclus et du plafond journalier. Le groupe « Groupe vente Cotonou » attend une URL réelle ; « FB achat vente portables » n’a pas de données publiques exploitables.
- **Martistore** : reste désactivé, le domaine observé affichait une vente de domaine.
- **Réseaux connectés et téléphonie** : configuration dédiée et validation réelle encore nécessaires selon le canal ; aucune disponibilité nouvelle revendiquée.
- **Contrôle** : continuer à distinguer la configuration, le dernier passage réussi, le nombre de fiches publiées et la fraîcheur. Un passage sans nouvelle fiche est un résultat valide, distinct d’un échec.

## Validation

Tests SQL GUARDIAN passés : ancien et nouveau planificateur, pause fournisseur, pause cible, pause worker, idempotence et refus des rôles publics. Neuf tests Python et quatre tests Web GUARDIAN/notifications ont réussi. Vérification en production : heartbeat, réponse HTTP, temps SQL et nouvelles fiches publiées.

