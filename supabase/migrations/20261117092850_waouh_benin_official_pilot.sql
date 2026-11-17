-- Add only public, first-party notices and record the region separately.
insert into public.waouh_discovery_sources
  (source_key, label, family, connector_mode, operational_state, supports_buy,
   supports_sell, supports_business, supports_contact, default_contactability,
   trust_weight, metadata)
values
  ('benin_government_jobs', 'Gouvernement du Bénin — Emploi', 'web',
   'public_feed', 'live', false, false, true, false, 'C0', .95,
   '{"official_index":true,"index_url":"https://www.gouv.bj/opportunites/offres-emploi/","market":"BJ"}'),
  ('benin_government_procurement', 'Gouvernement du Bénin — Marchés publics', 'b2b',
   'public_feed', 'live', false, false, true, false, 'C0', .95,
   '{"official_index":true,"index_url":"https://www.gouv.bj/opportunites/marches-publics/","market":"BJ"}'),
  ('waemu_bceao_procurement', 'BCEAO — Marchés publics et achats', 'b2b',
   'public_feed', 'planned', false, false, true, false, 'C0', .95,
   '{"official_index":true,"index_url":"https://www.bceao.int/fr/appels-offres/appels-offres-marches-publics-achats","market":"UEMOA"}')
on conflict (source_key) do nothing;

insert into public.waouh_collection_targets
  (provider, handler, label, enabled, adaptive, interval_minutes, next_due_at, url)
select 'public_feed', 'feed', s.label, s.operational_state = 'live', false, v.interval_minutes,
       now(), s.metadata->>'index_url'
from (values
  ('benin_government_jobs', 240),
  ('benin_government_procurement', 180),
  ('waemu_bceao_procurement', 480)
) v(source_key, interval_minutes)
join public.waouh_discovery_sources s using (source_key)
where not exists (
  select 1 from public.waouh_collection_targets t
  where t.provider = 'public_feed' and t.handler = 'feed' and t.url = s.metadata->>'index_url'
);

-- The existing public-feed provider starts paused.
update public.waouh_collection_policies
set paused = false, cooldown_until = null, last_block_reason = null
where provider = 'public_feed';
