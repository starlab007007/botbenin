# Audit base de données — 19/10/2026 (lecture seule)

Supabase `mvynepqulhflxtyymtzs`. Aucune donnée modifiée.

## Garder (aucun changement)
auth.users (247), profiles, user_roles, user_profiles, subscriptions, subscription_plans,
payment_transactions, waouh_partner_*, local_businesses, waouh_commerce_entities, waouh_entity_contacts (1 880),
waouh_lid_phone_map (3 638), apresbac_*, fa_*, waouh_ai_agents, waouh_bi_*, waouh_attendance_*, waouh_admin_module_controls.

## Chat — à évaluer
| Table | Lignes | Proposition |
|---|---|---|
| waouh_messages | 9 369 (16 Mo) | garder ; purger les messages de test (11) et ceux des fenêtres purgées |
| waouh_chat_threads | 427 (383 fermées) | purger 147 fermées depuis +90 j sans vente |
| waouh_negotiations | 388 | purger celles des fenêtres purgées |
| waouh_deals | 148 | garder (ventes réelles) sauf ventes d'articles de test |
| waouh_notifications | 2 768 | purger celles liées aux éléments purgés |
| waouh_outbound_queue | 3 710 | purger 1 247 échecs de +30 j ; garder 18 en attente |
| waouh_users sans compte | 13 759 | purger 13 582 visiteurs sans aucun message |

## Test à purger
- Articles : 97 titres « test / audit / e2e » + 9 « Bic » (à confirmer) — 105 au total.
- 5 comptes au nom de test (test/audit/e2e/demo) : compte conservé, données à confirmer.
- waouh_e2e_test_runs : 45.

## Inutilisées (vides mais lourdes, place à libérer)
whatsapp_messages 35 Mo, video_frames 31 Mo, apresbac_program_records 10 Mo, generated_videos 5,7 Mo,
documents / ants_documents 1,6 Mo, chat_messages 1,4 Mo.

## Ordre de nettoyage (après accord)
notifications → messages → fenêtres → négociations/ventes → intérêts → articles de test → tests e2e →
file WhatsApp → visiteurs anonymes → photos de test du stockage → libération d'espace.

## Sauvegarde préalable
L'export direct n'est pas disponible depuis cet environnement : faire l'export via
Supabase → Database → Backups (ou exports CSV des tables ci-dessus) avant la purge.
