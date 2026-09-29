# Résultats Nexus sans article → Deal Room directe (2026-09-29)

## Problème
Un résultat Nexus « externe » (`fabric_id = external:<uuid>`, table `waouh_external_commerce_signals`) n'a ni article ni vendeur WAOUH.
La carte n'offrait qu'une fiche de contact : l'acheteur sortait du parcours (`catalog_id → article_id → thread_id → negotiation_id → deal_id`)
au lieu d'entrer dans la fenêtre de négociation.

## Décision
- Le serveur **matérialise** le signal en article (`origin = 'nexus_external'`) porté par un vendeur « stub » sans téléphone ni compte,
  puis ouvre la Deal Room **côté acheteur uniquement**. Aucune règle métier n'est dupliquée : c'est le même `openBuyerDeal`, le même contrat v3.
- **Le tiers n'est jamais contacté automatiquement.** Le bouton « Envoyer mon offre » (`envoyer-offre:<négociation>` → action `transmit_offer`)
  appelle `nexus.contact.send` avec le **jeton de l'acheteur** : consentement, niveau C0–C5 et contacts publics restent appliqués par le cœur agentique.
  C0 : jamais tenté (« Envoi non autorisé »). Invité sans jeton : refusé.
- Interrupteur `nexus_direct_deal` (module + automatisation, **fermé par défaut**). Coupé : le serveur répond `200 {code: nexus_direct_deal_disabled}`
  et les clients gardent la fiche de contact (le parcours v3 n'est pas coupé pour autant).

## Ce qui a été construit
| Couche | Fichier |
|---|---|
| Matérialisation, classement de la transmission, message d'accroche | `supabase/functions/_shared/waouh-nexus-deal.ts` (+14 tests) |
| Contrat : `fabric_id`, action `transmit_offer`, boutons « Envoyer mon offre » / « Modifier mon offre » | `_shared/waouh-commerce-contract.ts`, `waouh-commands.ts` (alias `envoyer-offre`) |
| Messages : `external_offer_ready`, `external_offer_sent`, `external_not_permitted`, `external_no_channel`, `external_unavailable` | `_shared/waouh-message-catalog.ts` |
| Pas de notification pour un vendeur externe | `_shared/waouh-deal-open.ts` |
| Orchestration | `waouh-commerce-action/index.ts` |
| Web | `src/lib/waouh/nexusDeal.ts`, `commerceAction.ts`, `WaouhProductCard.tsx` |
| Flutter | `live_commerce_action_client.dart`, `live_avatar_commerce_screen.dart` |

Sans migration : l'identité du vendeur stub est `waouh_users.web_session_id = 'nexus-ext|<signal_id>'` (unique → idempotence ; le `|` est refusé par le format de session
des clients, personne ne peut la revendiquer). `waouh_articles.origin_signal_id` n'est **pas** utilisé : il a une clé étrangère vers `waouh_radar_signals`.

## Sécurité / confidentialité
- Numéros et e-mails retirés de la description (`redactPublicContacts`) ; `contact_whatsapp` = NULL ; vendeur stub sans téléphone (vérifié en base).
- Seules les offres (`SELL`/`OFFER`) actives et non expirées sont matérialisées ; demandes d'achat, expirées, inconnues → « Annonce indisponible ».
- La question libre vers un vendeur externe est refusée proprement (personne à qui la relayer) : l'offre transmise ouvre l'échange.

## Vérifications (projet de test `botbj-test-e2e`, vraies fonctions)
`scripts/waouh-chat/test-project/scenarios-nexus.mjs` : **13/13** (ouverture C1, idempotence, question refusée, envoi sans faux succès, C0 refusé sans appel au tiers,
demande d'achat / expiré / inconnu / fabric_id invalide, sans jeton). Base : aucun numéro copié, aucune notification créée pour le vendeur stub.
Tests : Deno 225, Vitest 223, Flutter 155.

## Limites connues
- **L'envoi réel n'a pas été testé de bout en bout** : le cœur agentique (`waouh-studio-e2e-v21465`) n'est pas déployé sur le projet de test. Le test prouve
  seulement qu'un échec n'est jamais présenté comme un succès. À vérifier en production sur un signal C1–C4 réel avec un compte de test.
- Les articles `nexus_external` sont des lignes `waouh_articles` actives : ils peuvent réapparaître dans la recherche interne (doublon d'un résultat Nexus) et dans les
  alertes acheteur. À filtrer sur `origin` si cela gêne (non fait : hors périmètre demandé).
- Les niveaux C5 n'existent pas dans la contrainte de la table des signaux (C0–C4) ; ils viennent des journeys.
- Interface Web/Flutter non exécutée visuellement (tests unitaires et de rendu seulement).
