---
name: Parité Web ↔ Flutter (branche codex)
description: Le web doit utiliser exactement les mêmes tables, RPC et edge functions Supabase que l'app Flutter pour Présence QR, Stock et BI
type: feature
---
Projet Supabase partagé : `mvynepqulhflxtyymtzs`. Toute nouvelle fonctionnalité web doit consommer le même backend que l'app Flutter (branche `codex` de starlab007007/botbenin).

Repositories TS partagés : `src/lib/waouh/presenceRepository.ts`, `stockRepository.ts`, `biRepository.ts`.

- **Présence QR** : tables `waouh_presence_sites` / `_members` / `_events` ; RPC `waouh_presence_create_site_v5`, `_update_site_v5`, `_upsert_member_v5`, `_set_member_status_v5`, `_dashboard_v5`, `_claim_memberships_v5` ; edge functions `waouh-presence-qr-create`, `-qr-preview`, `-checkin` (payload `qr_payload`). Page publique : `/checkin/<qr_payload>`.
- **Stock** : `waouh_partners` → `waouh_partner_businesses` → `waouh_partner_products` (business_id NOT NULL, statut partenaire ∈ pending/active/suspended/rejected) ; mouvements via RPC `waouh_adjust_partner_stock` ; réappro `waouh_stock_reorder_requests` ; sources `waouh_stock_list_sources`. Route web unique `/app/agents/stock`.
- **BI** : `waouh_bi_sources` + `waouh_bi_source_rows`, import via RPC `waouh_bi_store_source`, question via `waouh-bi-query` avec `source_id` (le chemin legacy `datasource_id`/`waouh_bi_datasources` reste supporté mais est déprécié).

Tables web dépréciées à ne plus utiliser : `waouh_attendance_*`, `waouh_stock_items`, `waouh_stock_agents`, `waouh_bi_datasources`.
