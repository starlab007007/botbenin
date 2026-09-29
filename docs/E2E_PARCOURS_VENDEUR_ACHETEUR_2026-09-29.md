# Test de bout en bout : vendeur A / acheteur B — 29/09/2026

Environnement : PostgreSQL 16 **local et jetable** (schéma façon production + vraies migrations). Aucune écriture en
production, aucun message WhatsApp, aucune application lancée. Rejouer :
`PSQL="psql -h /tmp -p 55432 -U postgres" ./scripts/waouh-chat/verify/run-journey-e2e.sh`

| Étape | Nature | Résultat |
|---|---|---|
| J1 A publie un article | simulé | passé |
| J2 B cherche et trouve | simulé | passé |
| J3 B se dit intéressé : Deal Room ouverte, pas de doublon | simulé | passé |
| J4 B écrit à A : message miroir chez A + notification en file | **réel** (`waouh_record_chat_message`) | passé |
| J5 A répond : notification acheteur, fil unique | **réel** | passé |
| J6 offre 200 000 puis contre-offre 230 000 | simulé | (écritures directes) |
| J7 B accepte : deal + transaction atomiques, commission 5 %, idempotent | **réel** (`waouh_accept_negotiation_atomic`) | passé |
| J8 paiement, livraison, vente : article vendu, fil conclu | simulé | passé |
| J9 garde-fou du 29/09 : rattachement au fil canonique, refus si ambigu | **réel** | **échec avant correctif**, passé après |
| J10 réconciliation en mode rapport : aucune divergence | **réel** | passé |

## Défaut trouvé : `waouh_resolve_message_thread` (migration 20260929065700, en production)
`min(id)` sur une colonne `uuid` : PostgreSQL n'a pas cet agrégat (« function min(uuid) does not exist »), en 16 comme en 15.8
(version de production). Le trigger `BEFORE INSERT` sur `waouh_messages` fait alors **échouer l'insertion** de tout message
portant `article_id` et `user_id` sans `thread_id` ni contexte résolvable (`meta.thread_id`, `negotiation_id`, `deal_id`).
Constaté dans les journaux de production : 9 erreurs entre 07:27 et 07:38 UTC le 29/09 (dont une rafale de 7 en 30 s).
Correctif prêt, **non appliqué** : `supabase/migrations/20260929131943_waouh_v3_thread_guard_fix_uuid_min.sql`
(`(array_agg(id order by id))[1]`, même comportement).

## Ce que ce test ne couvre pas
Fonctions Edge réellement déployées, PostgREST, authentification, WhatsApp, interfaces Web et Flutter, temps réel,
notifications dans l'application (`waouh_notifications` n'existe pas dans le banc), recherche réelle (catalogue unifié),
paiement réel. Ces parties exigent un projet de test ou un accord explicite pour écrire en production.
