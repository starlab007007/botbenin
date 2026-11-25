-- A legacy external listing without an expiry must not remain current forever.
-- These are freshness windows, never claims that an item was sold or a provider closed.
create or replace function public.waouh_collection_expire_stale()
returns integer language plpgsql set search_path='' as $$
declare changed integer;
begin
 update public.waouh_external_commerce_signals
 set expires_at=coalesce(observed_at,created_at)+case when actor_type='business' or evidence->>'provider_profile'='true' then interval '90 days' else interval '30 days' end,
     evidence=coalesce(evidence,'{}'::jsonb)||jsonb_build_object('freshness_policy','legacy_revalidation_required')
 where status='active' and expires_at is null;
 update public.waouh_external_commerce_signals set status='expired'
 where status='active' and expires_at<=now();
 get diagnostics changed=row_count;return changed;
end;$$;
revoke all on function public.waouh_collection_expire_stale() from public,anon,authenticated;
grant execute on function public.waouh_collection_expire_stale() to service_role;

-- Upgrade the existing, already authorized CoinAfrique root collector to document-level
-- revalidation. Keep its transport, media permissions, cadence and provider budgets.
update public.waouh_radar_sources s
set config=s.config||jsonb_build_object('managed_catalog',true)
where s.type='site' and s.identifier='https://bj.coinafrique.com/' and s.active
 and s.config->>'automation_authorized'='true' and s.config->>'collection_transport'='direct'
 and coalesce(s.config->>'managed_catalog','false')<>'true';
insert into public.waouh_collection_pages(target_id,url,kind)
select t.id,signal.source_url,'detail'
from public.waouh_collection_targets t
join public.waouh_radar_sources s on s.id=t.radar_source_id
join public.waouh_external_commerce_signals signal on signal.source_key='waouh_commercial_web'
 and signal.source_url ~ '^https://bj\.coinafrique\.com/annonce/'
 and length(signal.source_url)<=1800
where t.enabled and s.active and s.identifier='https://bj.coinafrique.com/'
 and s.config->>'automation_authorized'='true' and s.config->>'managed_catalog'='true'
on conflict(target_id,url) do nothing;
select public.waouh_collection_expire_stale();
