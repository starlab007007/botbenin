-- The source dashboard and the common queue must show the same last attempt.
create or replace function public.waouh_collection_finish_with_source(p_job uuid,p_token uuid,p_report jsonb)
returns boolean language plpgsql set search_path to public
as $$
declare source uuid;begin
  if not waouh_collection_finish(p_job,p_token,p_report) then return false; end if;
  select t.radar_source_id into source from waouh_collection_jobs j
    join waouh_collection_targets t on t.id=j.target_id
    where j.id=p_job and j.lease_token=p_token and j.handler in ('site','apify');
  if source is not null then
    update waouh_radar_sources set last_scan_at=now(),config=
      (coalesce(config,'{}')-'last_error'-'last_error_code'-'retry_after')||
      jsonb_build_object('collection_status',case when p_report->>'status' in ('succeeded','empty') then 'live' else p_report->>'status' end,
        'last_collection_outcome',p_report->>'status','last_collection_at',now())||
      case when p_report->>'status' in ('succeeded','empty') then '{}'::jsonb
        else jsonb_build_object('last_error',left(coalesce(p_report->>'reason','source_collection_incomplete'),160)) end
    where id=source;
  end if;
  return true;
end;
$$;
revoke execute on function public.waouh_collection_finish_with_source(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.waouh_collection_finish_with_source(uuid,uuid,jsonb) to service_role;

-- Bring the already verified records into sync without starting another paid run.
update waouh_radar_sources s set last_scan_at=t.last_attempt_at,config=
 (coalesce(s.config,'{}')-'last_error'-'last_error_code'-'retry_after')||
 jsonb_build_object('collection_status','live','last_collection_outcome',t.last_outcome,'last_collection_at',t.last_attempt_at)
from waouh_collection_targets t where t.radar_source_id=s.id and t.last_outcome in ('succeeded','empty');
update waouh_discovery_sources set operational_state='live',supports_contact=true,default_contactability='C1'
where source_key in ('waouh_commercial_web','waouh_facebook_collection') and exists(
 select 1 from waouh_external_commerce_signals s where s.source_key=waouh_discovery_sources.source_key and s.status='active');
