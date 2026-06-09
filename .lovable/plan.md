# Plan — Fiabilisation WAOUH end-to-end + harness de test admin

## 1. Tunnel partenaire (déblocage A2/B2/C2)

- **Nouvelle edge function utilitaire `_shared/waouh-promote.ts`** : `promoteCatalogToArticle(sb, catalog_id)` qui, si l'item `waouh_unified_catalog` (source=`partner`) n'a pas d'`article_id`, crée un `waouh_articles` (title, price, city, photos, `contact_whatsapp=vendeur_whatsapp`, `source_channel='partner'`, `seller_id=NULL`, `partner_id`) et écrit `catalog.article_id`.
- **`waouh-notify-dispatch/index.ts`** : si `article_id` manquant mais `catalog_id` fourni → appeler `promoteCatalogToArticle` puis continuer normalement. Plus de 400.
- **`waouh-notify-buyers/index.ts`** : passe désormais `article_id` (issu de la promotion) au dispatcher.
- **`waouh-buyer-interest/index.ts`** : si la cible est un `catalog_id` partenaire, promote puis ouvre négo avec l'article promu.

## 2. Fallback Radar IA (A3/C3)

- **`_shared/waouh-contact.ts` (resolveContact)** : en mode `radar_ia`, si `contact_whatsapp` vide, fallback en cascade :
  1. `waouh_radar_contacts.contact_whatsapp` par `seller_handle`
  2. `waouh_external_listings.seller_phone` ou `seller_handle` (extraction E.164)
  3. Marquer `needs_enrichment=true` dans `waouh_radar_signals` et créer une notif admin (`notification_type='radar_quality_warning'`) au lieu d'échouer silencieusement.
- **`waouh-outbound-dispatch`** : quand `failed: no WA contact` sur un payload `radar_*`, mettre `status='needs_enrichment'` (au lieu de `failed`) pour qu'un opérateur puisse compléter le numéro depuis Contacts Radar.

## 3. Harness de test E2E

- **Nouvelle edge function `waouh-e2e-test-runner`** (POST `{ scenario: 'A'|'B'|'C'|'ALL', source: 'chat'|'partner'|'radar'|'ALL' }`)
  - Crée 2 `waouh_users` éphémères (suffixe `e2e-<timestamp>`)
  - Joue : publication → recherche → intérêt → 2 contre-offres → OUI
  - Capture après chaque étape : `waouh_messages`, `waouh_outbound_queue`, `waouh_negotiations`, `waouh_deals`, `waouh_notifications`
  - Compare à un tableau d'attendus (en dur) et calcule `status: ok | mismatch | failed` par étape.
  - Insère un run dans nouvelle table `waouh_e2e_test_runs` (id, scenario, source, started_at, finished_at, summary jsonb, steps jsonb).
- **Migration** : table `waouh_e2e_test_runs` + GRANT + RLS (admin only via `has_role(auth.uid(),'admin')`).

## 4. Admin UI

- **Nouvel onglet** dans `WaouhWhatsAppOpsPage` : `Tests E2E`.
- **Composant `WaouhE2ETestsTab.tsx`** :
  - Bouton "Exécuter tests WhatsApp" (lance les 9 cellules en parallèle via l'edge function)
  - Liste des runs récents (sélecteur)
  - 3 tableaux (chat / partenaire / radar) × 3 colonnes (A/B/C) avec, pour chaque étape : message attendu, message reçu, statut écart (badge ✅/⚠️/❌).
  - Bouton "Exporter rapport" → télécharge le markdown généré par l'edge function.

## 5. Verrou

- Ajout d'invariants dans `waouhChatSyncLock.ts` v3 : `partnerCatalogPromotion`, `radarContactFallback`, `e2eRunnerCoverage`.
- Mise à jour `mem://features/whatsapp-end-to-end-flow` (v2) avec les nouveaux fallbacks.

## Technique

- Une seule migration (table runs + RLS + grants).
- Pas de modification du flux WaouhMatchChatWindow (verrouillé).
- Le runner s'auto-nettoie : marque les `waouh_users` créés avec `phone_number LIKE '229E2E%'` pour suppression facile.
- Coût credits : ~1 migration, 4 edge functions touchées, 1 nouvelle edge function, 2 composants React, 1 invariant lock.

