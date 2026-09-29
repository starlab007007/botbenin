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

## Reste à faire
Edge functions (`waouh-commerce-action`, `waouh-match-history`, `waouh-history`, `waouh-channel-in-secure`), secrets, comptes Auth vendeur A / acheteur B, puis parcours Web et Flutter sur ce projet.
