-- Gouverneur d'envoi WhatsApp : quotas, rythme, plage horaire, arrêt automatique.
-- Un seul point de décision pour tous les envois sortants du numéro central.

create table if not exists public.waouh_wa_governor_config (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  daily_cap int not null default 150 check (daily_cap between 0 and 5000),
  hourly_cap int not null default 40 check (hourly_cap between 0 and 1000),
  min_gap_s int not null default 8 check (min_gap_s between 0 and 600),
  max_gap_s int not null default 25 check (max_gap_s between 0 and 900),
  quiet_start int not null default 21 check (quiet_start between 0 and 23),
  quiet_end int not null default 7 check (quiet_end between 0 and 23),
  cold_share_pct int not null default 70 check (cold_share_pct between 0 and 100),
  per_contact_day int not null default 3 check (per_contact_day between 1 and 50),
  per_contact_week int not null default 5 check (per_contact_week between 1 and 200),
  failure_pause_pct int not null default 15 check (failure_pause_pct between 1 and 100),
  failure_min_sample int not null default 10 check (failure_min_sample between 3 and 500),
  paused_until timestamptz,
  pause_reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.waouh_wa_governor_config (id) values (true) on conflict do nothing;

create table if not exists public.waouh_wa_send_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  kind text not null check (kind in ('cold','transactional')),
  phone text,
  outcome text not null default 'reserved' check (outcome in ('reserved','sent','failed')),
  error text
);
create index if not exists waouh_wa_send_log_at_idx on public.waouh_wa_send_log (at desc);
create index if not exists waouh_wa_send_log_phone_idx on public.waouh_wa_send_log (phone, at desc);

alter table public.waouh_wa_governor_config enable row level security;
alter table public.waouh_wa_send_log enable row level security;
revoke all on public.waouh_wa_governor_config, public.waouh_wa_send_log from anon, authenticated;

-- Décision d'envoi. Réserve un créneau (outcome = 'reserved') si l'envoi est autorisé.
create or replace function public.waouh_wa_governor_take(p_kind text, p_phone text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.waouh_wa_governor_config;
  v_now timestamptz := now();
  v_local timestamp := (now() at time zone 'Africa/Lagos');
  v_hour int := extract(hour from (now() at time zone 'Africa/Lagos'))::int;
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Africa/Lagos')) at time zone 'Africa/Lagos';
  v_quiet boolean;
  v_total_today int; v_cold_today int; v_hour_n int; v_att int; v_fail int; v_n int;
  v_last timestamptz; v_gap numeric; v_target timestamp; v_id uuid; v_oldest timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('waouh_wa_governor'));
  select * into c from public.waouh_wa_governor_config where id;
  if p_kind not in ('cold','transactional') then p_kind := 'cold'; end if;

  if not c.enabled then
    insert into public.waouh_wa_send_log (kind, phone) values (p_kind, p_phone) returning id into v_id;
    return jsonb_build_object('allowed', true, 'id', v_id);
  end if;

  select count(*) into v_total_today from public.waouh_wa_send_log where at >= v_day_start;

  if p_kind = 'transactional' then
    if v_total_today >= c.daily_cap * 2 then
      return jsonb_build_object('allowed', false, 'reason', 'hard_cap', 'retry_after_s', 3600);
    end if;
    insert into public.waouh_wa_send_log (kind, phone) values ('transactional', p_phone) returning id into v_id;
    return jsonb_build_object('allowed', true, 'id', v_id);
  end if;

  -- Envois à froid -----------------------------------------------------------
  if c.paused_until is not null and c.paused_until > v_now then
    return jsonb_build_object('allowed', false, 'reason', 'paused',
      'retry_after_s', least(3600, greatest(60, ceil(extract(epoch from (c.paused_until - v_now)))::int)));
  end if;

  v_quiet := case when c.quiet_start = c.quiet_end then false
                  when c.quiet_start > c.quiet_end then (v_hour >= c.quiet_start or v_hour < c.quiet_end)
                  else (v_hour >= c.quiet_start and v_hour < c.quiet_end) end;
  if v_quiet then
    v_target := date_trunc('day', v_local) + make_interval(hours => c.quiet_end);
    if v_target <= v_local then v_target := v_target + interval '1 day'; end if;
    return jsonb_build_object('allowed', false, 'reason', 'quiet_hours',
      'retry_after_s', least(3600, greatest(60, ceil(extract(epoch from (v_target - v_local)))::int)));
  end if;

  select count(*) into v_cold_today from public.waouh_wa_send_log where kind = 'cold' and at >= v_day_start;
  if v_cold_today >= floor(c.daily_cap * c.cold_share_pct / 100.0) or v_total_today >= c.daily_cap then
    v_target := date_trunc('day', v_local) + interval '1 day' + make_interval(hours => c.quiet_end);
    return jsonb_build_object('allowed', false, 'reason', 'daily_cap',
      'retry_after_s', least(3600, greatest(60, ceil(extract(epoch from (v_target - v_local)))::int)));
  end if;

  select count(*), min(at) into v_hour_n, v_oldest from public.waouh_wa_send_log
    where kind = 'cold' and at > v_now - interval '1 hour';
  if v_hour_n >= c.hourly_cap then
    return jsonb_build_object('allowed', false, 'reason', 'hourly_cap',
      'retry_after_s', least(3600, greatest(60, ceil(extract(epoch from (v_oldest + interval '1 hour' - v_now)))::int)));
  end if;

  -- Arrêt automatique si les échecs de l'heure dépassent le seuil
  select count(*) filter (where outcome in ('sent','failed')), count(*) filter (where outcome = 'failed')
    into v_att, v_fail from public.waouh_wa_send_log where kind = 'cold' and at > v_now - interval '1 hour';
  if v_att >= c.failure_min_sample and v_fail * 100 >= c.failure_pause_pct * v_att then
    update public.waouh_wa_governor_config
      set paused_until = v_now + interval '24 hours',
          pause_reason = format('Taux d''échec %s%% sur %s envois (seuil %s%%)', round(v_fail * 100.0 / v_att), v_att, c.failure_pause_pct),
          updated_at = v_now
      where id;
    return jsonb_build_object('allowed', false, 'reason', 'paused', 'retry_after_s', 3600);
  end if;

  if p_phone is not null and length(p_phone) > 0 then
    select count(*) into v_n from public.waouh_wa_send_log where kind = 'cold' and phone = p_phone and at >= v_day_start;
    if v_n >= c.per_contact_day then
      return jsonb_build_object('allowed', false, 'reason', 'contact_day', 'retry_after_s', 3600);
    end if;
    select count(*) into v_n from public.waouh_wa_send_log where kind = 'cold' and phone = p_phone and at > v_now - interval '7 days';
    if v_n >= c.per_contact_week then
      return jsonb_build_object('allowed', false, 'reason', 'contact_week', 'retry_after_s', 3600);
    end if;
  end if;

  -- Rythme humain : écart aléatoire entre deux envois à froid
  select max(at) into v_last from public.waouh_wa_send_log where kind = 'cold';
  v_gap := c.min_gap_s + random() * greatest(0, c.max_gap_s - c.min_gap_s);
  if v_last is not null and v_last > v_now - make_interval(secs => v_gap) then
    return jsonb_build_object('allowed', false, 'reason', 'spacing',
      'retry_after_s', greatest(1, ceil(v_gap - extract(epoch from (v_now - v_last)))::int));
  end if;

  insert into public.waouh_wa_send_log (kind, phone) values ('cold', p_phone) returning id into v_id;
  return jsonb_build_object('allowed', true, 'id', v_id);
end;
$$;

-- Résultat d'un envoi réservé : sent | failed (erreur fournisseur) | released (jamais parti)
create or replace function public.waouh_wa_governor_record(p_id uuid, p_outcome text, p_error text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null then return; end if;
  if p_outcome = 'released' then
    delete from public.waouh_wa_send_log where id = p_id and outcome = 'reserved';
  else
    update public.waouh_wa_send_log
      set outcome = case when p_outcome = 'sent' then 'sent' else 'failed' end,
          error = left(p_error, 300)
      where id = p_id;
  end if;
end;
$$;

create or replace function public.waouh_wa_governor_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.waouh_wa_governor_config;
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Africa/Lagos')) at time zone 'Africa/Lagos';
  v_att int; v_fail int;
begin
  select * into c from public.waouh_wa_governor_config where id;
  select count(*) filter (where outcome in ('sent','failed')), count(*) filter (where outcome = 'failed')
    into v_att, v_fail from public.waouh_wa_send_log where kind = 'cold' and at > now() - interval '1 hour';
  return jsonb_build_object(
    'enabled', c.enabled, 'daily_cap', c.daily_cap, 'hourly_cap', c.hourly_cap,
    'min_gap_s', c.min_gap_s, 'max_gap_s', c.max_gap_s,
    'quiet_start', c.quiet_start, 'quiet_end', c.quiet_end, 'cold_share_pct', c.cold_share_pct,
    'per_contact_day', c.per_contact_day, 'per_contact_week', c.per_contact_week,
    'failure_pause_pct', c.failure_pause_pct,
    'paused_until', case when c.paused_until > now() then c.paused_until end,
    'pause_reason', case when c.paused_until > now() then c.pause_reason end,
    'sent_today', (select count(*) from public.waouh_wa_send_log where at >= v_day_start and outcome <> 'failed'),
    'cold_today', (select count(*) from public.waouh_wa_send_log where at >= v_day_start and kind = 'cold'),
    'sent_hour', (select count(*) from public.waouh_wa_send_log where at > now() - interval '1 hour'),
    'failure_rate_hour', case when v_att > 0 then round(v_fail * 100.0 / v_att) else 0 end
  );
end;
$$;

revoke all on function public.waouh_wa_governor_take(text, text) from public, anon, authenticated;
revoke all on function public.waouh_wa_governor_record(uuid, text, text) from public, anon, authenticated;
revoke all on function public.waouh_wa_governor_status() from public, anon, authenticated;
grant execute on function public.waouh_wa_governor_take(text, text) to service_role;
grant execute on function public.waouh_wa_governor_record(uuid, text, text) to service_role;
grant execute on function public.waouh_wa_governor_status() to service_role;
