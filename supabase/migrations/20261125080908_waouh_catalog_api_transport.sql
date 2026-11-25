-- Site API work uses the common queue with the correct provider budget.
do $wrap$ begin
 if to_regprocedure('public.waouh_collection_enqueue(text,text,text,text,jsonb,uuid,uuid,uuid,boolean)') is not null then
  alter function public.waouh_collection_enqueue(text,text,text,text,jsonb,uuid,uuid,uuid,boolean) rename to waouh_collection_enqueue_before_catalog;
 end if;
end;$wrap$;
create or replace function public.waouh_collection_enqueue(
 p_provider text,p_handler text,p_lane text,p_key text,p_payload jsonb default '{}'::jsonb,
 p_owner uuid default null,p_dossier uuid default null,p_target uuid default null,p_inline boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.waouh_collection_jobs;
begin
 if p_handler='site' and p_provider in('apify','serpapi') then
  if p_owner is not null or p_dossier is not null or p_inline or not exists(
   select 1 from public.waouh_collection_targets t join public.waouh_radar_sources s on s.id=t.radar_source_id
   where t.id=p_target and t.enabled and s.active and s.type='site' and s.config->>'automation_authorized'='true'
    and s.config->>'collection_transport'=p_provider) then raise exception 'api_site_source_required';end if;
  insert into public.waouh_collection_jobs(dedupe_key,handler,provider,lane,payload,target_id,inline,priority,max_calls,max_pages,max_items)
  values(p_key,p_handler,p_provider,p_lane,public.waouh_data_sanitize(p_payload),p_target,false,40,1,3,3)
  on conflict(dedupe_key) do nothing;
  select * into j from public.waouh_collection_jobs where dedupe_key=p_key;return to_jsonb(j);
 end if;
 return public.waouh_collection_enqueue_before_catalog(p_provider,p_handler,p_lane,p_key,p_payload,p_owner,p_dossier,p_target,p_inline);
end;$$;

create or replace function public.waouh_collection_schedule(p_handler text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare t public.waouh_collection_targets;n integer:=0;
begin
 insert into public.waouh_collection_targets(provider,handler,radar_source_id,label,enabled,interval_minutes)
 select case when type='site' then case config->>'collection_transport' when 'direct' then 'public_feed' when 'apify' then 'apify' when 'serpapi' then 'serpapi' else 'firecrawl' end else 'apify' end,
  case when type='site' then 'site' else 'apify' end,id,coalesce(nullif(label,''),type||' · '||left(id::text,8)),active,greatest(30,least(10080,scan_freq_min))
 from public.waouh_radar_sources where type in('site','fb_group','fb_marketplace') on conflict(radar_source_id) do nothing;
 update public.waouh_collection_targets x set enabled=s.active,
  provider=case when s.type='site' then case s.config->>'collection_transport' when 'direct' then 'public_feed' when 'apify' then 'apify' when 'serpapi' then 'serpapi' else 'firecrawl' end else 'apify' end
 from public.waouh_radar_sources s where x.radar_source_id=s.id;
 for t in select x.* from public.waouh_collection_targets x join public.waouh_collection_policies p on p.provider=x.provider
  where x.enabled and not p.paused and x.next_due_at<=now() and(p_handler is null or x.handler=p_handler)
  for update of x skip locked loop
  if exists(select 1 from public.waouh_collection_jobs where dedupe_key='target:'||t.id||':'||extract(epoch from t.next_due_at)::bigint) then continue;end if;
  perform public.waouh_collection_enqueue(t.provider,t.handler,'watch','target:'||t.id||':'||extract(epoch from t.next_due_at)::bigint,
   jsonb_build_object('source_id',t.radar_source_id,'query',t.query),null,null,t.id,false);n:=n+1;
 end loop;
 return n;
end;$$;

create or replace function public.waouh_collection_api_preview(p_entry integer,p_provider text)
returns jsonb language plpgsql set search_path='' as $$
declare j public.waouh_collection_jobs;
begin
 if p_provider not in('apify','serpapi') or not exists(select 1 from public.waouh_collection_entries e
  join public.waouh_collection_platforms p using(platform_key) where e.entry_no=p_entry and e.alias_of is null and p.transport=p_provider)
 then raise exception 'invalid_api_preview';end if;
 insert into public.waouh_collection_jobs(dedupe_key,handler,provider,lane,payload,status,inline,priority,max_calls,max_pages,max_items,lease_token,lease_until)
 values('catalog-preview:'||gen_random_uuid(),'site',p_provider,'enrichment',jsonb_build_object('entry_no',p_entry),
  'running',true,70,1,3,3,gen_random_uuid(),now()+interval '2 minutes') returning * into j;
 return to_jsonb(j);
end;$$;

create or replace function public.waouh_collection_reserve_api_site(p_job uuid,p_token uuid,p_config uuid,p_pages integer)
returns boolean language plpgsql set search_path='' as $$
declare j public.waouh_collection_jobs;p public.waouh_collection_policies;used integer;
begin
 if p_pages not between 1 and 3 then return false;end if;
 select * into j from public.waouh_collection_jobs where id=p_job for update;
 if j.handler<>'site' or j.provider not in('apify','serpapi') or j.reserved_pages+p_pages>j.max_pages then return false;end if;
 select * into p from public.waouh_collection_policies where provider=j.provider for update;
 select coalesce(sum(reserved_pages),0) into used from public.waouh_collection_usage where day=(now() at time zone 'UTC')::date and provider=j.provider;
 if p.daily_page_limit is not null and used+p_pages>p.daily_page_limit then return false;end if;
 if not public.waouh_collection_reserve(p_job,p_token,p_config,1) then return false;end if;
 update public.waouh_collection_jobs set reserved_pages=reserved_pages+p_pages-1 where id=p_job;
 update public.waouh_collection_usage set reserved_pages=reserved_pages+p_pages-1
 where day=(now() at time zone 'UTC')::date and provider=j.provider and lane=case when j.attempts>1 then 'retry' else j.lane end;
 return true;
end;$$;

revoke all on function public.waouh_collection_enqueue(text,text,text,text,jsonb,uuid,uuid,uuid,boolean),public.waouh_collection_schedule(text),
 public.waouh_collection_api_preview(integer,text),public.waouh_collection_reserve_api_site(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.waouh_collection_enqueue(text,text,text,text,jsonb,uuid,uuid,uuid,boolean),public.waouh_collection_schedule(text),
 public.waouh_collection_api_preview(integer,text),public.waouh_collection_reserve_api_site(uuid,uuid,uuid,integer) to service_role;
