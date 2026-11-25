-- A successful preview or a live target is not proof of end-to-end collection.
-- Read-only, no provider calls, credentials, contact values or permission changes.
create or replace function public.waouh_collection_connection_audit()
returns jsonb language sql stable set search_path='' as $$
with records as (
 select distinct j.target_id,s.id,s.source_url,s.product_name,s.intent,s.price_min,s.city,s.model,
  s.photo_urls,s.evidence,s.contactability_level,s.contact_consent_basis,
  coalesce(origin.config->>'media_reuse_authorized'='true',false) as photos_required,
  s.status='active' and s.expires_at>now() and o.last_checked_at>now()-interval '24 hours' as fresh,
  d.fabric_id is not null as indexed
 from public.waouh_collection_observations o
 join public.waouh_collection_jobs j on j.id=o.job_id
 join public.waouh_external_commerce_signals s on s.id=o.record_id
 join public.waouh_collection_targets target on target.id=j.target_id
 left join public.waouh_radar_sources origin on origin.id=target.radar_source_id
 left join public.waouh_search_documents d on d.fabric_id='external:'||s.id::text
 where o.record_kind='commerce'
), facts as (
 select target_id,count(*) as collected,
  count(*) filter(where fresh) as fresh,
  count(*) filter(where fresh and indexed) as indexed,
  count(*) filter(where fresh and cardinality(photo_urls)>0 and nullif(evidence->>'photo_attribution','') is not null) as photos,
  count(*) filter(where fresh and price_min>0) as prices,
  count(*) filter(where fresh and nullif(btrim(city),'') is not null) as cities,
  count(*) filter(where fresh and nullif(btrim(model),'') is not null) as models,
  count(*) filter(where fresh and contactability_level in ('C1','C2','C3') and contact_consent_basis='public_business') as public_contacts,
  count(*) filter(where fresh and evidence->>'availability_confirmed'='true') as availability_confirmed,
  count(*) filter(where fresh and indexed and length(product_name)>=5 and source_url like 'https://%'
    and coalesce(nullif(evidence->>'source_attribution',''),nullif(evidence->>'organization','')) is not null
    and (intent in ('ANNOUNCE','RFQ') or evidence->>'provider_profile'='true' or (price_min>0 and nullif(btrim(city),'') is not null))) as useful,
  count(*) filter(where fresh and indexed and length(product_name)>=5 and source_url like 'https://%'
    and coalesce(nullif(evidence->>'source_attribution',''),nullif(evidence->>'organization','')) is not null
    and (not photos_required or (cardinality(photo_urls)>0 and nullif(evidence->>'photo_attribution','') is not null))
    and (intent in ('ANNOUNCE','RFQ') or ((evidence->>'provider_profile'='true' or (price_min>0 and nullif(btrim(city),'') is not null))
      and contactability_level in ('C1','C2','C3') and contact_consent_basis='public_business'))) as actionable
 from records group by target_id
), targets as (
 select t.id,t.label,t.enabled,t.handler,t.provider,t.radar_source_id,t.last_outcome,t.last_success_at,t.last_useful_at,
  coalesce(s.config->>'collection_transport',case when t.provider='public_feed' then 'direct' else t.provider end) as actual_transport,
  s.config->>'collection_format' as actual_adapter,
  coalesce(s.active,true) as source_active,
  coalesce(s.config->>'automation_authorized'='true',t.handler in ('feed','web')) as source_authorized,
  j.finished_at as last_attempt_at,j.status as last_job_status,j.report->>'reason' as last_reason,
  coalesce(to_jsonb(f)-'target_id','{"collected":0,"fresh":0,"indexed":0,"photos":0,"prices":0,"cities":0,"models":0,"public_contacts":0,"availability_confirmed":0,"useful":0,"actionable":0}'::jsonb) as facts
 from public.waouh_collection_targets t
 left join public.waouh_radar_sources s on s.id=t.radar_source_id
 left join facts f on f.target_id=t.id
 left join lateral (
  select j.finished_at,j.status,j.report from public.waouh_collection_jobs j where j.target_id=t.id
   and j.finished_at is not null and j.status<>'cancelled'
  order by j.finished_at desc,j.id desc limit 1
 ) j on true
), checks as (
 select e.entry_no,e.label,e.platform_key,e.alias_of,e.target_id,
  t.actual_transport,t.actual_adapter,t.last_job_status,t.last_reason,t.last_attempt_at,t.facts,
  array_remove(array[
   case when e.target_id is null then 'target_missing' end,
   case when e.target_id is not null and t.id is null then 'target_missing' end,
   case when t.enabled=false or t.source_active=false then 'target_paused' end,
   case when t.source_authorized=false then 'source_permission_missing' end,
   case when p.adapter_key='none' then 'adapter_missing' end,
   case when p.access_state<>'authorized' or length(btrim(p.rights_reference))<5 then 'platform_access_required' end,
   case when t.id is not null and (p.transport is distinct from t.actual_transport or p.adapter_key is distinct from t.actual_adapter) then 'configuration_mismatch' end,
   case when e.test_status is distinct from 'passed' or e.test_at is null or e.test_at<now()-interval '24 hours' or e.test_at<p.updated_at or e.test_config_hash is null then 'extraction_test_required' end,
   case when e.test_report->>'discovery_only'='true' then 'discovery_only' end,
   case when t.id is not null and (t.last_attempt_at is null or t.last_attempt_at<now()-interval '24 hours') then 'recent_run_required' end,
   case when t.last_job_status in ('blocked','failed','partial') then coalesce(t.last_reason,'collection_incomplete') end,
   case when coalesce((t.facts->>'fresh')::integer,0)=0 then 'fresh_records_missing' end,
   case when coalesce((t.facts->>'indexed')::integer,0)=0 then 'indexed_records_missing' end,
   case when coalesce((t.facts->>'useful')::integer,0)=0 then 'useful_records_missing' end,
   case when coalesce((t.facts->>'actionable')::integer,0)=0 then 'actionable_records_missing' end,
   case when p.media_authorized and coalesce((t.facts->>'photos')::integer,0)=0 then 'attributed_photos_missing' end
  ],null) as blockers
 from public.waouh_collection_entries e
 join public.waouh_collection_platforms p using(platform_key)
 left join targets t on t.id=e.target_id
), entries as (
 select c.entry_no,jsonb_build_object('entry_no',c.entry_no,'label',c.label,'platform_key',c.platform_key,
  'alias_of',c.alias_of,'target_id',coalesce(c.target_id,parent.target_id),
  'validated',cardinality(coalesce(parent.blockers,c.blockers))=0,
  'blockers',coalesce(parent.blockers,c.blockers),'facts',coalesce(parent.facts,c.facts),
  'actual_transport',coalesce(parent.actual_transport,c.actual_transport),
  'last_job_status',coalesce(parent.last_job_status,c.last_job_status),
  'last_reason',coalesce(parent.last_reason,c.last_reason),
  'last_attempt_at',coalesce(parent.last_attempt_at,c.last_attempt_at)) as report
 from checks c left join checks parent on parent.entry_no=c.alias_of
)
select jsonb_build_object('checked_at',now(),'window_hours',24,
 'entries',coalesce((select jsonb_agg(report order by entry_no) from entries),'[]'::jsonb),
 'targets',coalesce((select jsonb_agg(to_jsonb(t) order by t.label) from targets t),'[]'::jsonb));
$$;
revoke all on function public.waouh_collection_connection_audit() from public,anon,authenticated;
grant execute on function public.waouh_collection_connection_audit() to service_role;
