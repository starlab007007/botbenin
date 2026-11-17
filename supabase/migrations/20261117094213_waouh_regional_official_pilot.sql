-- Extend the same free source worker to first-party regional tender notices.
insert into public.waouh_discovery_sources
  (source_key, label, family, connector_mode, operational_state, supports_buy,
   supports_sell, supports_business, supports_contact, default_contactability,
   trust_weight, metadata)
values
  ('waemu_boad_procurement', 'BOAD — Appels d’offres', 'b2b',
   'public_feed', 'live', false, false, true, false, 'C0', .95,
   '{"official_index":true,"index_url":"https://www.boad.org/fr/opportunites/appels-doffre","market":"UEMOA"}')
on conflict (source_key) do nothing;

update public.waouh_discovery_sources
set operational_state = 'live'
where source_key = 'waemu_bceao_procurement' and metadata->>'official_index' = 'true';

update public.waouh_collection_targets t
set enabled = true, next_due_at = now()
from public.waouh_discovery_sources s
where s.source_key = 'waemu_bceao_procurement' and t.url = s.metadata->>'index_url'
  and t.provider = 'public_feed' and t.handler = 'feed';

insert into public.waouh_collection_targets
  (provider, handler, label, enabled, adaptive, interval_minutes, next_due_at, url)
select 'public_feed', 'feed', s.label, true, false, 480, now(), s.metadata->>'index_url'
from public.waouh_discovery_sources s
where s.source_key = 'waemu_boad_procurement'
  and s.operational_state = 'live'
  and not exists (select 1 from public.waouh_collection_targets t
    where t.provider = 'public_feed' and t.handler = 'feed' and t.url = s.metadata->>'index_url');
