-- Un seul outil par site : la cible suit toujours l'outil choisi pour sa plateforme.
create or replace function public.waouh_collection_target_engine_sync() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_engine text;
begin
  select p.engine_key into v_engine from waouh_collection_entries e join waouh_collection_platforms p on p.platform_key=e.platform_key
   where e.target_id=new.id limit 1;
  if v_engine is not null then new.engine_key:=v_engine; end if;
  return new;
end $$;
drop trigger if exists waouh_collection_target_engine_sync on public.waouh_collection_targets;
create trigger waouh_collection_target_engine_sync before insert or update of engine_key on public.waouh_collection_targets
for each row execute function public.waouh_collection_target_engine_sync();

create or replace function public.waouh_collection_platform_engine_propagate() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update waouh_collection_targets t set engine_key=new.engine_key
   from waouh_collection_entries e where e.platform_key=new.platform_key and e.target_id=t.id and t.engine_key is distinct from new.engine_key;
  return new;
end $$;
drop trigger if exists waouh_collection_platform_engine_propagate on public.waouh_collection_platforms;
create trigger waouh_collection_platform_engine_propagate after update of engine_key on public.waouh_collection_platforms
for each row execute function public.waouh_collection_platform_engine_propagate();
revoke all on function public.waouh_collection_target_engine_sync() from public, anon, authenticated;
revoke all on function public.waouh_collection_platform_engine_propagate() from public, anon, authenticated;

-- Arrêt automatique des cibles de recherche web qui ne produisent rien d'utile depuis 7 jours.
create or replace function public.waouh_collection_stop_unproductive() returns integer
language plpgsql security definer set search_path=public as $$
declare v_ids uuid[];
begin
  select coalesce(array_agg(id),'{}') into v_ids from waouh_collection_targets
   where provider='serpapi' and enabled
     and coalesce(last_useful_at,'-infinity'::timestamptz) < now()-interval '7 days'
     and coalesce(last_attempt_at,now()) < now()-interval '1 day' + interval '1 day';
  if array_length(v_ids,1) is null then return 0; end if;
  update waouh_collection_targets set enabled=false where id=any(v_ids);
  insert into waouh_collection_admin_events(action,details)
   values('target.auto_stop',jsonb_build_object('reason','aucune donnée utile depuis 7 jours','targets',to_jsonb(v_ids)));
  return array_length(v_ids,1);
end $$;
revoke all on function public.waouh_collection_stop_unproductive() from public, anon, authenticated;

select public.waouh_collection_stop_unproductive();

do $$ begin
  perform cron.unschedule('waouh-collection-stop-unproductive') where exists(select 1 from cron.job where jobname='waouh-collection-stop-unproductive');
  perform cron.schedule('waouh-collection-stop-unproductive','23 4 * * *','select public.waouh_collection_stop_unproductive();');
end $$;

-- Raccordement Niosso (lecture directe des pages publiques) et Afribaba (site qui bloque la lecture directe : passage par Apify).
update public.waouh_collection_platforms set access_state='authorized',
  rights_reference='Pages publiques uniquement, autorisé par le propriétaire WAOUH, robots.txt respecté',
  attribution='Niosso', engine_key='cheerio', transport='direct', adapter_key='classifieds',
  media_authorized=true, media_hosts=array['niosso.com'], updated_at=now()
 where platform_key='niosso.com';
update public.waouh_collection_platforms set access_state='authorized',
  rights_reference='Pages publiques uniquement, autorisé par le propriétaire WAOUH',
  attribution='Afribaba', engine_key='cheerio', transport='apify', adapter_key='classifieds',
  media_authorized=true, media_hosts=array['bj.afribaba.com','afribaba.com'], updated_at=now()
 where platform_key='bj.afribaba.com';
update public.waouh_collection_entries set test_status=null,test_config_hash=null where platform_key in ('niosso.com','bj.afribaba.com');
update public.waouh_collection_targets t set engine_key=p.engine_key from waouh_collection_entries e join waouh_collection_platforms p on p.platform_key=e.platform_key where e.target_id=t.id and t.engine_key is distinct from p.engine_key;