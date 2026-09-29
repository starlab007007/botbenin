# Projet Supabase de test — botbj-test-e2e (`ljzwqyzaovnandpyfpgc`)

Projet distinct de la production (`mvynepqulhflxtyymtzs`), créé le 29/09/2026, Postgres 17, eu-central-1.
Aucune donnée de production copiée. Ne jamais y brancher WhatsApp ni un jeton de production.

## Construction (29/09/2026)
1. `scripts/waouh-chat/test-project/01_bootstrap_core_tables.sql` : 11 tables noyau du chat, colonnes relevées en lecture seule sur la production.
2. Migrations du dépôt appliquées, dans l'ordre : command center (partiel, voir écarts), commerce E2E v3, thread base, backfill, garde-fou V3 **dans son état de production**, verrouillage RLS, puis correctif `uuid_min`, puis réconciliation.
3. Drapeaux du chat V3 créés comme en production ; `chat_whatsapp` et `outbound` désactivés.

## Résultats sur Supabase réel (SQL)
| Étape | Résultat |
|---|---|
| Garde-fou de production, message article+utilisateur sans thread | **ERREUR** `function min(uuid) does not exist` (défaut reproduit) |
| Même insertion après `20260929130000_…_uuid_min` | thread résolu (J1) |
| Écrivain canonique acheteur → miroir vendeur | rôle `buyer`, ligne vendeur créée (J2) |
| Acceptation atomique | `awaiting_confirmation`, article `reserved`, chaîne thread→négociation→deal→transaction complète, montant 130000 (J3) |
| Rejeu de l'acceptation | `idempotent: true` (J4) |
| Événements du registre commerce | 2 (J5) |
| Réconciliation en mode `report` | `ok: true` (J6) |

## Écarts assumés avec la production (SIMULÉ)
- `has_role()` renvoie `false` (pas de rôle admin) ; `waouh_admin_set_module_control` non créée.
- `waouh_enqueue_outbound_v2` : version simplifiée (même signature).
- Migration command center : contrainte de clés et fonction admin omises (la production a d'autres clés).
- Pas de FK vers `auth.users` sur `waouh_users`.

## Complément (29/09/2026, soir)
- 12 tables supplémentaires (profiles, waouh_commerce_actions, waouh_external_listings, waouh_interests, waouh_lid_phone_map, waouh_notifications, waouh_partners, waouh_partner_businesses, waouh_radar_signals, waouh_statuses, waouh_trace_events, waouh_unified_catalog) + enums `waouh_catalog_source/type`, RLS activée sans politique. Colonnes relevées en lecture seule sur la production.
- Comptes Auth de test créés par SQL (réseau vers l'API Auth bloqué) : `vendeur.a.test@botbj-test.invalid` et `acheteur.b.test@botbj-test.invalid`, e-mails confirmés, liés à `profiles` et `waouh_users`. Mots de passe aléatoires, hors dépôt.
- Fonctions non déployées : recopier ~200 Ko (21 fichiers) à la main sans pouvoir les appeler ensuite serait risqué ; à faire par CLI (`supabase functions deploy`, `supabase secrets set GEMINI_API_KEY`) une fois `*.supabase.co` / `api.supabase.com` autorisés et un jeton d'accès fourni.

## Parcours avec les VRAIES edge functions (29/09/2026, soir)
Fonctions déployées sur le projet de test (CLI `supabase functions deploy --use-api`, mêmes fichiers que le dépôt) : `waouh-commerce-action`, `waouh-negotiation-router`, `waouh-deal-ops`, `waouh-match-history`, `waouh-history`, `waouh-channel-in-secure`.
Secrets posés : `GEMINI_API_KEY`, `WAOUH_COMMISSION_RATE=0.05`. **Aucun secret WAHA** : aucun envoi WhatsApp possible.
Script : `scripts/waouh-chat/test-project/journey-real-functions.mjs` (refuse tout autre projet ; secrets par variables d'environnement).

| Étape | Résultat | Nature |
|---|---|---|
| S0 connexion Auth vendeur A / acheteur B | PASS | réel |
| Publication de l'article par A | insertion SQL | **simulé** (aucune de ces fonctions ne publie) |
| S1 B contacte le vendeur (`open_deal`) | PASS — thread + négociation créés | réel |
| S2 B propose 130 000 (`offer`) | PASS — `offer_sent` | réel |
| S3 A accepte | PASS — deal créé | réel |
| S4 rejeu de la même clé `idem` | PASS — même réponse, `replayed: true` | réel |
| S5 A confirme la disponibilité | PASS | réel |
| S6 B choisit le paiement à la livraison | PASS — étape `preparation`, tour `courier` | réel |
| S7 le vendeur ne peut pas confirmer le paiement | PASS (refus `out_of_stage`) | réel |
| S8 paiement refusé avant livraison | PASS (refus `out_of_stage`) | réel |
| Livraison par le livreur | `status='delivered'` en SQL | **simulé** |
| S9 B confirme le paiement | PASS — « Vente terminée » | réel |
| S10 historique du fil, côté vendeur et acheteur | PASS (8 et 12 messages) | réel |

État final en base : thread `concluded` (clé active libérée), chaîne thread→négociation→deal→transaction complète, deal `completed` / `paid` / cash, 130 000 dont commission 6 500 (`earned`), 20 messages dont 0 sans thread, 7 types d'événements dans le registre, 2 notifications au vendeur, 8 lignes en file sortante `pending` (rien envoyé).

Écarts / constats :
- L'article reste `reserved` sur le projet de test : le trigger `trg_waouh_sync_article_after_deal` (migration `20260925130000_waouh_deal_graph_e2e`) n'y est pas installé. Il est présent et actif en production.
- Un acceptation avant correction du routeur interne (`waouh-negotiation-router`, `waouh-deal-ops` absents) renvoyait `out_of_stage` : c'était une dépendance de déploiement, pas un défaut de logique.
- `waouh-match-history` identifie le lecteur par `auth_user_id` fourni dans le corps de la requête, avec la clé service : voir la note de sécurité dans `DEPLOYED_MANIFEST.md` à traiter avant tout déploiement large.
- Non testé : Web `/app/chat` et application Flutter sur ce projet, publication réelle, WhatsApp.

## Test « le vendeur vend un produit » — publication réelle (29/09/2026)
Ajouts sur le projet de test : fonction `waouh-status-publish` (chemin de publication du Web et de Flutter) et triggers `trg_waouh_guard_new_deal_reservation` / `trg_waouh_sync_article_after_deal` (migration `20260925130000`, déjà actifs en production).

| Étape | Résultat | Nature |
|---|---|---|
| A publie « Samsung Galaxy S23 », 320 000 (`waouh-status-publish`) | PASS — article `active`, statut 24 h lié | **réel** |
| B contacte, propose 130 000, A accepte, rejeu `idem`, A confirme, B choisit cash, garde-fous | PASS (12/12) | réel |
| Livraison par le livreur | `status='delivered'` en SQL | **simulé** |
| B confirme le paiement | PASS — « Vente terminée » | réel |
| Article après la vente | `sold` (trigger) | réel |
| Deuxième achat sur l'article vendu | refusé (`article_reserved`, « Article déjà réservé ») | réel |

État final : deal `completed` / `paid` / cash, 130 000 dont commission 6 500, fil `concluded` (clé active libérée, 0 fil actif), 20 messages dont 0 sans thread, 1 seul deal pour l'article.

Constats :
- L'offre du script (130 000) est codée en dur : l'article affichait 320 000, ce qui n'est pas réaliste mais valide le montant négocié (montant du deal = dernière offre).
- Message inexact : un article **vendu** répond « Article déjà réservé » (statuts `sold` et `reserved` traités par la même clé `article_reserved` dans `waouh-deal-open`). À corriger côté catalogue de messages si on veut afficher « vendu ».
- Le fan-out vers les acheteurs (`waouh-notify-buyers`, appel « fire & forget » de `waouh-status-publish`) n'est pas déployé sur le projet de test : non testé.

## Reste à faire
Faire pointer le Web et Flutter vers le projet de test, installer le trigger de synchronisation d'article, tester la publication réelle.
