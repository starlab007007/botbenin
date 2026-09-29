-- Avatar guide : préférences de l'utilisateur (accueil à l'ouverture, points réguliers, heures calmes) et dernier point envoyé.
-- Chaque utilisateur ne lit et n'écrit que sa propre ligne ; la fonction waouh-avatar-briefing (service) met à jour last_*.
create table if not exists public.waouh_avatar_prefs (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  welcome boolean not null default true,
  cadence text not null default 'daily' check (cadence in ('off','hourly','every_4h','daily','weekly')),
  quiet_start smallint not null default 21 check (quiet_start between 0 and 23),
  quiet_end smallint not null default 7 check (quiet_end between 0 and 23),
  last_briefing_at timestamptz,
  last_digest text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.waouh_avatar_prefs enable row level security;
drop policy if exists waouh_avatar_prefs_select_own on public.waouh_avatar_prefs;
create policy waouh_avatar_prefs_select_own on public.waouh_avatar_prefs for select to authenticated using (auth.uid() = auth_user_id);
drop policy if exists waouh_avatar_prefs_insert_own on public.waouh_avatar_prefs;
create policy waouh_avatar_prefs_insert_own on public.waouh_avatar_prefs for insert to authenticated with check (auth.uid() = auth_user_id);
-- Les colonnes de suivi (last_*) ne sont pas modifiables par l'utilisateur : seul le service les écrit.
revoke update on public.waouh_avatar_prefs from authenticated;
grant update (welcome, cadence, quiet_start, quiet_end, updated_at) on public.waouh_avatar_prefs to authenticated;
drop policy if exists waouh_avatar_prefs_update_own on public.waouh_avatar_prefs;
create policy waouh_avatar_prefs_update_own on public.waouh_avatar_prefs for update to authenticated using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);
create index if not exists waouh_avatar_prefs_due_idx on public.waouh_avatar_prefs (cadence, last_briefing_at) where cadence <> 'off';

-- Planification des points réguliers (même principe que le suivi Nexus : rien n'est planifié automatiquement).
-- Secrets Vault requis : waouh_avatar_briefing_url, waouh_service_key. Puis : select public.waouh_schedule_avatar_briefing();
-- Arrêt : select cron.unschedule('waouh-avatar-briefing-hourly');
create or replace function public.waouh_schedule_avatar_briefing() returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null or to_regnamespace('vault') is null then
    raise notice 'pg_cron, pg_net ou vault absent : points de l''avatar non planifiés';
    return false;
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'waouh_avatar_briefing_url')
     or not exists (select 1 from vault.decrypted_secrets where name = 'waouh_service_key') then
    raise notice 'secrets Vault waouh_avatar_briefing_url / waouh_service_key manquants : non planifié';
    return false;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-avatar-briefing-hourly';
  perform cron.schedule('waouh-avatar-briefing-hourly', '23 * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_avatar_briefing_url' limit 1),
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_service_key' limit 1)),
      body := '{"action":"tick","limit":100}'::jsonb
    );
  $job$);
  return true;
end;
$$;
revoke all on function public.waouh_schedule_avatar_briefing() from public, anon, authenticated;
