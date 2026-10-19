# Audit base de données — 19/10/2026 (lecture seule)

Supabase `mvynepqulhflxtyymtzs`. Aucune donnée modifiée.

## Nettoyage exécuté le 19/10/2026 après confirmation de la sauvegarde

Le texte ci-dessous décrit l'audit initial ; les chiffres de ce bilan remplacent ses estimations pour le nettoyage effectué.

- Sauvegarde confirmée par le propriétaire avant suppression.
- 96 articles de test supprimés : marques explicites test/audit/E2E et noms de simulation comme test13 ou Produit test2. Aucun simple titre « Bic » supprimé.
- 371 messages, 70 fenêtres, 71 négociations, 60 ventes de simulation et 780 notifications retirés dans le périmètre des articles de test.
- 45 résultats de tests automatiques retirés.
- 1 247 anciens échecs WhatsApp retirés, ainsi que des envois non en attente liés aux messages de test (1 393 entrées retirées au total).
- 247 comptes conservés ; profils, rôles, abonnements, paiements et modules métier non nettoyés.
- Tous les articles associés à une transaction, une offre signée ou un paiement constaté ont été protégés. L'article « Stylo Bic TEST RECETTE A0310 » reste pour cette raison.
- Contrôles transactionnels : nombre de comptes, nombre de ventes hors périmètre de test et nombre d'envois en attente inchangés lors de chaque suppression.

### État contrôlé après nettoyage

| Élément | Restant |
|---|---:|
| Comptes | 247 |
| Articles | 405 |
| Messages | 8 998 |
| Fenêtres | 357 |
| Négociations | 317 |
| Ventes hors périmètre supprimé | 88 |
| Notifications | 1 988 |
| File d'envoi | 2 317 |
| Envois en attente | 18 |
| Résultats de tests automatiques | 0 |

Les 244 tests du chat passent. Aucun message ne référence une fenêtre inexistante. 286 messages avaient encore une référence à un article absent lors du contrôle après la première opération ; les exemples incluent des produits réels, donc ils ne sont pas supprimés comme tests et ce point n'est pas déclaré corrigé.

### Éléments volontairement non supprimés / restant à traiter

- Les anciennes discussions réelles et les visiteurs anonymes : leur ancienneté ou leur absence de message ne prouve pas qu'il s'agit de tests. Leur suppression dépasse la demande « uniquement tests ».
- Les données des comptes nommés test sont conservées sauf celles rattachées aux articles de test identifiés ; aucun compte supprimé.
- Photos physiques : aucune suppression dans le stockage, faute d'identification fiable des fichiers exclusivement de test et d'accès de suppression au stockage. Les photos peuvent être partagées avec des produits réels.
- Pas de suppression de table, pas de changement du schéma unifié, pas de compactage forcé des anciennes tables ; aucun gain d'espace disque physique affirmé.
- Aucun essai authentifié web/Flutter/WhatsApp exécuté dans cette opération de nettoyage ; les contrôles portent sur la base et les tests automatisés du chat.

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
