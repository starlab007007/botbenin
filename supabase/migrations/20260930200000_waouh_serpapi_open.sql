-- Ouverture des sources (demande du 30/09) : SerpAPI activé (test de clé « ok », plan gratuit : il s'arrête de lui-même à la fin du quota,
-- aucune facturation) et planifié une fois par jour ; la source de découverte passe en « live ».
-- Redéfinit l'installeur des tâches de fond pour y inclure SerpAPI (mêmes règles que la migration 20260930190000).
update public.waouh_radar_api_configs set active = true where provider = 'serpapi' and api_key is not null;
update public.waouh_discovery_sources set operational_state = 'live' where source_key = 'serpapi' and exists (
  select 1 from public.waouh_radar_api_configs c where c.provider = 'serpapi' and c.active);

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
    ('waouh-avatar-briefing-hourly', 'waouh-nexus-followup-hourly', 'waouh-radar-process-tick', 'waouh-radar-apify-6h', 'waouh-radar-site-scraper-6h', 'waouh-serpapi-daily');

  perform cron.schedule('waouh-avatar-briefing-hourly', '23 * * * *', format($job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_tel_internal_secret' limit 1)),
      body := '{"action":"tick","limit":100}'::jsonb);
  $job$, p_base_url || '/waouh-avatar-briefing'));
  v_jobs := array_append(v_jobs, 'waouh-avatar-briefing-hourly');

  perform cron.schedule('waouh-nexus-followup-hourly', '7 * * * *', format($job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_tel_internal_secret' limit 1)),
      body := '{"limit":100}'::jsonb);
  $job$, p_base_url || '/waouh-nexus-followup'));
  v_jobs := array_append(v_jobs, 'waouh-nexus-followup-hourly');

  perform cron.schedule('waouh-radar-process-tick', '*/5 * * * *', format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
      body := '{}'::jsonb);
  $job$, p_base_url || '/waouh-radar-process', p_public_key));
  v_jobs := array_append(v_jobs, 'waouh-radar-process-tick');

  -- Collecte externe (crédits Apify / Firecrawl) : toutes les 6 heures, prudemment.
  perform cron.schedule('waouh-radar-apify-6h', '41 */6 * * *', format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
      body := '{}'::jsonb);
  $job$, p_base_url || '/waouh-radar-apify', p_public_key));
  v_jobs := array_append(v_jobs, 'waouh-radar-apify-6h');

  perform cron.schedule('waouh-radar-site-scraper-6h', '53 */6 * * *', format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
      body := '{}'::jsonb);
  $job$, p_base_url || '/waouh-radar-site-scraper', p_public_key));
  v_jobs := array_append(v_jobs, 'waouh-radar-site-scraper-6h');

  -- SerpAPI (plan gratuit, quota journalier 50 fixé par l'administrateur) : une fois par jour.
  perform cron.schedule('waouh-serpapi-daily', '17 5 * * *', format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
      body := '{}'::jsonb);
  $job$, p_base_url || '/waouh-serpapi-scout', p_public_key));
  v_jobs := array_append(v_jobs, 'waouh-serpapi-daily');

  return jsonb_build_object('ok', true, 'jobs', to_jsonb(v_jobs));
end;
$$;
revoke all on function public.waouh_install_background_ticks(text, text) from public, anon, authenticated;

create or replace function public.waouh_uninstall_background_ticks() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from cron.job where jobname in
    ('waouh-avatar-briefing-hourly', 'waouh-nexus-followup-hourly', 'waouh-radar-process-tick', 'waouh-radar-apify-6h', 'waouh-radar-site-scraper-6h', 'waouh-serpapi-daily');
  perform cron.unschedule(jobid) from cron.job where jobname in
    ('waouh-avatar-briefing-hourly', 'waouh-nexus-followup-hourly', 'waouh-radar-process-tick', 'waouh-radar-apify-6h', 'waouh-radar-site-scraper-6h', 'waouh-serpapi-daily');
  return n;
end;
$$;
revoke all on function public.waouh_uninstall_background_ticks() from public, anon, authenticated;
