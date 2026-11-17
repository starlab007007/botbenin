-- A direct HTTP site job belongs to the free provider, independently of Firecrawl.
create or replace function public.waouh_collection_enqueue(
 p_provider text,p_handler text,p_lane text,p_key text,p_payload jsonb default '{}'::jsonb,
 p_owner uuid default null,p_dossier uuid default null,p_target uuid default null,p_inline boolean default false
) returns jsonb language plpgsql security definer set search_path to public
as $$declare j waouh_collection_jobs;begin
 if p_provider<>'public_feed' or p_handler not in ('feed','site') then
   return waouh_collection_enqueue_v1(p_provider,p_handler,p_lane,p_key,p_payload,p_owner,p_dossier,p_target,p_inline);
 end if;
 if p_dossier is not null and not exists(select 1 from waouh_mission_dossiers where id=p_dossier and owner_id=p_owner) then raise exception 'dossier_not_owned';end if;
 if not exists(select 1 from waouh_collection_targets where id=p_target and handler=p_handler and provider='public_feed') then raise exception 'free_target_required';end if;
 if p_handler='site' then
   if p_owner is not null or p_dossier is not null or p_inline then raise exception 'free_site_common_queue_only';end if;
   if not exists(select 1 from waouh_collection_targets t join waouh_radar_sources s on s.id=t.radar_source_id
      where t.id=p_target and t.enabled and s.active and s.config->>'automation_authorized'='true'
      and s.config->>'collection_transport'='direct') then raise exception 'free_site_source_required';end if;
 end if;
 insert into waouh_collection_jobs(dedupe_key,handler,provider,lane,payload,owner_id,dossier_id,target_id,inline,priority)
 values(p_key,p_handler,p_provider,p_lane,waouh_data_sanitize(p_payload),p_owner,p_dossier,p_target,p_inline,40)
 on conflict(dedupe_key) do nothing;
 select * into j from waouh_collection_jobs where dedupe_key=p_key;return to_jsonb(j);
end;$$;
revoke execute on function public.waouh_collection_enqueue(text,text,text,text,jsonb,uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.waouh_collection_enqueue(text,text,text,text,jsonb,uuid,uuid,uuid,boolean) to service_role;
