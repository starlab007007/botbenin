-- 4. Relances J+1 puis J+3 : le second rappel attend 48 h après le premier.
do $$
declare d text;
begin
  select pg_get_functiondef('public.waouh_room_tick(integer,uuid)'::regprocedure) into d;
  d := replace(d, 'created_at>now()-interval ''24 hours'')', 'created_at>now()-case when r.followups>=1 then interval ''48 hours'' else interval ''24 hours'' end)');
  d := replace(d, '(select max(created_at)+interval ''24 hours'' from public.waouh_room_events', '(select max(created_at)+case when r.followups>=1 then interval ''48 hours'' else interval ''24 hours'' end from public.waouh_room_events');
  if position('interval ''48 hours''' in d) = 0 then raise exception 'followup_cadence_patch_failed'; end if;
  execute d;
end $$;

-- 1. Fiche vendeur unique : un même numéro ou e-mail = un seul vendeur, avec toutes ses annonces et tous ses canaux.
create or replace function public.waouh_merge_duplicate_entities(p_limit integer default 100)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare grp record; keeper uuid; loser uuid; merged integer = 0;
begin
  for grp in
    select c.value_hash
    from public.waouh_entity_contacts c
    where c.value_hash is not null and c.channel in ('phone','whatsapp','email')
    group by c.value_hash having count(distinct c.entity_id) > 1
    limit greatest(p_limit, 1)
  loop
    select e.id into keeper from public.waouh_commerce_entities e
      where e.id in (select entity_id from public.waouh_entity_contacts where value_hash = grp.value_hash)
      order by e.created_at asc, e.id asc limit 1;
    for loser in
      select distinct entity_id from public.waouh_entity_contacts
      where value_hash = grp.value_hash and entity_id <> keeper
    loop
      -- Contact déjà connu du vendeur retenu : on garde le niveau le plus fort puis on retire le doublon.
      update public.waouh_entity_contacts k set
        contactability_level = greatest(k.contactability_level, l.contactability_level),
        consent_state = case when l.contactability_level > k.contactability_level then l.consent_state else k.consent_state end,
        is_public_business = k.is_public_business or l.is_public_business,
        is_whatsapp_reachable = coalesce(k.is_whatsapp_reachable, l.is_whatsapp_reachable)
      from public.waouh_entity_contacts l
      where k.entity_id = keeper and l.entity_id = loser and k.channel = l.channel and k.value_hash = l.value_hash;
      delete from public.waouh_entity_contacts l using public.waouh_entity_contacts k
        where l.entity_id = loser and k.entity_id = keeper and k.channel = l.channel and k.value_hash = l.value_hash;
      update public.waouh_entity_contacts set entity_id = keeper where entity_id = loser;
      update public.waouh_external_commerce_signals set entity_id = keeper where entity_id = loser;
      update public.waouh_opportunity_journeys set entity_id = keeper where entity_id = loser;
      update public.waouh_contact_packs set entity_id = keeper where entity_id = loser;
      begin
        update public.waouh_signal_entity_links set entity_id = keeper where entity_id = loser;
      exception when unique_violation then
        delete from public.waouh_signal_entity_links where entity_id = loser;
      end;
      update public.waouh_commerce_entities k set
        source_keys = (select coalesce(array_agg(distinct s), '{}') from unnest(coalesce(k.source_keys, '{}') || coalesce((select source_keys from public.waouh_commerce_entities where id = loser), '{}')) s),
        primary_name = coalesce(k.primary_name, (select primary_name from public.waouh_commerce_entities where id = loser))
      where k.id = keeper;
      delete from public.waouh_commerce_entities where id = loser;
      merged = merged + 1;
    end loop;
  end loop;
  return merged;
end $$;
revoke all on function public.waouh_merge_duplicate_entities(integer) from public, anon, authenticated;

-- 6. Entonnoir par source : de l'annonce à l'accord.
create or replace view public.waouh_source_funnel as
select
  f.source_key,
  count(distinct f.fabric_id) as signals,
  count(distinct f.fabric_id) filter (where f.contactability_level in ('C1','C2','C3','C4','C5')) as with_contact,
  count(distinct c.id) as rooms,
  count(distinct g.room_id) as contacted,
  count(distinct g.room_id) filter (where g.last_inbound_at is not null or g.joined_at is not null) as replied,
  count(distinct a.component_id) filter (where a.status in ('accepted','completed')) as agreed,
  round(avg(extract(epoch from (coalesce(g.last_inbound_at, g.joined_at) - g.contacted_at)) / 3600)::numeric, 1) as hours_to_reply
from public.waouh_signal_fabric f
left join public.waouh_convergence_components c on c.source_ref = f.fabric_id
left join public.waouh_room_guests g on g.room_id = c.id
left join public.waouh_convergence_agreements a on a.component_id = c.id
group by f.source_key;
revoke all on public.waouh_source_funnel from anon, authenticated;

do $$
begin
  if to_regnamespace('cron') is null then return; end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-merge-entities-hourly';
  perform cron.schedule('waouh-merge-entities-hourly', '41 * * * *', 'select public.waouh_merge_duplicate_entities(100);');
  -- 2. Collecte réseaux sociaux : reprise, bornée par le quota quotidien du fournisseur.
  perform cron.alter_job((select jobid from cron.job where jobname = 'waouh-radar-apify-6h'), active := true);
end $$;
