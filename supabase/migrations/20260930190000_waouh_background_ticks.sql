-- Tâches de fond (audit 2026-09-30) : point automatique de l'avatar, suivi des offres Nexus, traitement des signaux Radar.
-- AUCUN secret n'est créé ni copié : les appels sécurisés (avatar, suivi Nexus) utilisent le secret interne déjà présent dans le
-- Vault (`waouh_tel_internal_secret`, celui du worker de messagerie native), vérifié par `waouh_verify_tick_secret` (rôle service).
-- Les fonctions Radar sont conçues pour être appelées avec la clé publique (comme `waouh-outbound-dispatch-tick`, déjà en place).
-- Volontairement NON planifiés : campagnes Radar (`waouh-radar-campaign-tick`) et `waouh-radar-auto-control` — elles écrivent à des tiers
-- par WhatsApp et l'administrateur a mis l'automatisation en pause jusqu'au 30/09 23:53 ; SerpAPI est désactivé (configuration inactive).
-- Installation : select public.waouh_install_background_ticks();   Arrêt : select public.waouh_uninstall_background_ticks();

create or replace function public.waouh_verify_tick_secret(p_secret text) returns boolean
language sql stable security definer set search_path = public, vault as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'waouh_tel_internal_secret' and decrypted_secret = p_secret);
$$;
revoke all on function public.waouh_verify_tick_secret(text) from public, anon, authenticated;
grant execute on function public.waouh_verify_tick_secret(text) to service_role;

create or replace function public.waouh_install_background_ticks(
  p_base_url text default 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1',
  p_public_key text default 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8'
) returns jsonb
language plpgsql security definer set search_path = public, vault, extensions as $$
declare v_jobs text[] := '{}';
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null or to_regnamespace('vault') is null then
    return jsonb_build_object('ok', false, 'reason', 'pg_cron, pg_net ou vault absent');
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'waouh_tel_internal_secret') then
    return jsonb_build_object('ok', false, 'reason', 'secret interne absent du Vault');
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname in
    ('waouh-avatar-briefing-hourly', 'waouh-nexus-followup-hourly', 'waouh-radar-process-tick', 'waouh-radar-apify-6h', 'waouh-radar-site-scraper-6h');

  perform cron.schedule('waouh-avatar-briefing-hourly', '23 * * * *', format($job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_tel_internal_secret' limit 1)),
      body := '{"action":"tick","limit":100}'::jsonb);
  $job$, p_base_url || '/waouh-avatar-briefing'));
  v_jobs := v_jobs || 'waouh-avatar-briefing-hourly';

  perform cron.schedule('waouh-nexus-followup-hourly', '7 * * * *', format($job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_tel_internal_secret' limit 1)),
      body := '{"limit":100}'::jsonb);
  $job$, p_base_url || '/waouh-nexus-followup'));
  v_jobs := v_jobs || 'waouh-nexus-followup-hourly';

  perform cron.schedule('waouh-radar-process-tick', '*/5 * * * *', format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
      body := '{}'::jsonb);
  $job$, p_base_url || '/waouh-radar-process', p_public_key));
  v_jobs := v_jobs || 'waouh-radar-process-tick';

  -- Collecte externe (crédits Apify / Firecrawl) : toutes les 6 heures, prudemment.
  perform cron.schedule('waouh-radar-apify-6h', '41 */6 * * *', format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
      body := '{}'::jsonb);
  $job$, p_base_url || '/waouh-radar-apify', p_public_key));
  v_jobs := v_jobs || 'waouh-radar-apify-6h';

  perform cron.schedule('waouh-radar-site-scraper-6h', '53 */6 * * *', format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
      body := '{}'::jsonb);
  $job$, p_base_url || '/waouh-radar-site-scraper', p_public_key));
  v_jobs := v_jobs || 'waouh-radar-site-scraper-6h';

  return jsonb_build_object('ok', true, 'jobs', to_jsonb(v_jobs));
end;
$$;
revoke all on function public.waouh_install_background_ticks(text, text) from public, anon, authenticated;

create or replace function public.waouh_uninstall_background_ticks() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from cron.job where jobname in
    ('waouh-avatar-briefing-hourly', 'waouh-nexus-followup-hourly', 'waouh-radar-process-tick', 'waouh-radar-apify-6h', 'waouh-radar-site-scraper-6h');
  perform cron.unschedule(jobid) from cron.job where jobname in
    ('waouh-avatar-briefing-hourly', 'waouh-nexus-followup-hourly', 'waouh-radar-process-tick', 'waouh-radar-apify-6h', 'waouh-radar-site-scraper-6h');
  return n;
end;
$$;
revoke all on function public.waouh_uninstall_background_ticks() from public, anon, authenticated;
