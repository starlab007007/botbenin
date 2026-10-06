-- WAOUH admin deduplicated WAHA directory — 2026-10-06.
create or replace function public.waouh_admin_waha_directory(
  p_q text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  id uuid,
  lid text,
  jid text,
  phone_e164 text,
  display_name text,
  pushname text,
  session text,
  source text,
  last_synced_at timestamptz,
  total_count bigint
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with latest as (
    select distinct on (m.phone_e164)
      m.id,m.lid,m.jid,m.phone_e164,m.display_name,m.pushname,m.session,m.source,m.last_synced_at
    from public.waouh_lid_phone_map m
    where m.phone_e164 is not null
      and (
        nullif(trim(coalesce(p_q,'')), '') is null
        or concat_ws(' ',m.phone_e164,m.display_name,m.pushname,m.session,m.source)
             ilike '%' || trim(p_q) || '%'
      )
    order by m.phone_e164, m.last_synced_at desc nulls last, m.id
  ),
  counted as (
    select latest.*, count(*) over() as total_count
    from latest
  )
  select *
  from counted
  order by last_synced_at desc nulls last, phone_e164
  limit greatest(1, least(coalesce(p_limit,100),300))
  offset greatest(0, coalesce(p_offset,0));
$$;

revoke all on function public.waouh_admin_waha_directory(text,integer,integer) from public, anon, authenticated;
grant execute on function public.waouh_admin_waha_directory(text,integer,integer) to service_role;
