create or replace function public.waouh_admin_nexus_control()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin')) then
    raise exception 'forbidden';
  end if;
  with f as (
    select lower(regexp_replace(split_part(regexp_replace(coalesce(source_url,''),'^https?://',''),'/',1),'^www\.','')) host,
           observed_at, (coalesce(price_min,price_max,0) > 0) priced, (coalesce(city,'') <> '') has_city,
           (jsonb_typeof(evidence->'photos')='array' and jsonb_array_length(evidence->'photos')>0) has_photo
    from public.waouh_signal_fabric
  ), s as (
    select case when host='' then 'WAOUH' else host end src,
      count(*) n_total,
      count(*) filter (where observed_at > now()-interval '24 hours') n_day,
      count(*) filter (where observed_at > now()-interval '7 days') n_week,
      round(100.0*count(*) filter (where priced)/greatest(count(*),1)) p_priced,
      round(100.0*count(*) filter (where has_city)/greatest(count(*),1)) p_city,
      round(100.0*count(*) filter (where has_photo)/greatest(count(*),1)) p_photo,
      count(*) filter (where observed_at < now()-interval '60 days') n_stale,
      max(observed_at) last_seen
    from f group by 1
  )
  select jsonb_build_object(
    'generated_at', now(),
    'totals', (select jsonb_build_object('total', sum(n_total), 'day', sum(n_day), 'priced_pct', round(sum(n_total*p_priced)/greatest(sum(n_total),1)), 'stale', sum(n_stale)) from s),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source',s.src,'label',coalesce(p.label,s.src),'engine',p.engine_key,'access',p.access_state,
        'total',n_total,'day',n_day,'week',n_week,'priced_pct',p_priced,'city_pct',p_city,'photo_pct',p_photo,'stale',n_stale,'last_seen',last_seen) order by n_day desc, n_total desc)
      from s left join public.waouh_collection_platforms p on lower(p.hostname)=s.src), '[]'::jsonb),
    'registry', (select jsonb_build_object('entries', count(*), 'tested_ok', count(*) filter (where test_status in ('passed','success','ok'))) from public.waouh_collection_entries),
    'engines', coalesce((select jsonb_agg(jsonb_build_object('engine',engine_key,'enabled',enabled,'version',installed_version,'last_test',last_test_status,'last_test_at',last_test_at)) from public.waouh_collection_engines), '[]'::jsonb),
    'deal_rooms', (select jsonb_build_object('total',count(*),'bot',count(*) filter (where control_mode='bot'),'paused',count(*) filter (where control_mode='paused'),'week',count(*) filter (where created_at>now()-interval '7 days')) from public.waouh_deal_room_links),
    'outbound_pending', (select count(*) from public.waouh_outbound_queue where status='pending')
  ) into v;
  return v;
end $$;
revoke all on function public.waouh_admin_nexus_control() from public, anon;
grant execute on function public.waouh_admin_nexus_control() to authenticated, service_role;