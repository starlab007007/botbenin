-- Opportunity OS worker scheduler.
-- Reuses WAOUH's existing internal tick secret (waouh_tel_internal_secret).
-- The worker is safe to schedule continuously: it executes no outreach unless
-- a user has created an explicit active Avatar mandate.

create or replace function public.waouh_schedule_opportunity_worker(
  p_base_url text default 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1'
) returns boolean
language plpgsql security definer set search_path = public, vault, extensions as $$
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null or to_regnamespace('vault') is null then
    raise notice 'pg_cron, pg_net ou vault absent : Opportunity OS non planifié';
    return false;
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'waouh_tel_internal_secret') then
    raise notice 'secret interne WAOUH absent du Vault : Opportunity OS non planifié';
    return false;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-opportunity-worker-10m';
  perform cron.schedule('waouh-opportunity-worker-10m', '*/10 * * * *', format($job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'waouh_tel_internal_secret'
          limit 1
        )
      ),
      body := '{"limit":20}'::jsonb
    );
  $job$, rtrim(p_base_url,'/') || '/waouh-opportunity-worker'));
  return true;
end;
$$;
revoke all on function public.waouh_schedule_opportunity_worker(text) from public, anon, authenticated;

create or replace function public.waouh_unschedule_opportunity_worker() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if to_regnamespace('cron') is null then return false; end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-opportunity-worker-10m';
  return true;
end;
$$;
revoke all on function public.waouh_unschedule_opportunity_worker() from public, anon, authenticated;

-- Extend the canonical WAOUH background-tick installer so Opportunity OS is
-- installed/removed together with the existing Avatar/NEXUS/Radar ticks.
create or replace function public.waouh_install_background_ticks(
  p_base_url text default 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1',
  p_public_key text default 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiJ9.placeholder'
) returns jsonb
language plpgsql security definer set search_path = public, vault, extensions as $$
declare
  v_jobs text[] := '{}';
  v_existing_public_key text := p_public_key;
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null or to_regnamespace('vault') is null then
    return jsonb_build_object('ok', false, 'reason', 'pg_cron, pg_net ou vault absent');
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'waouh_tel_internal_secret') then
    return jsonb_build_object('ok', false, 'reason', 'secret interne absent du Vault');
  end if;

  -- Preserve all canonical existing jobs. Public-key jobs keep the caller-supplied key.
  perform cron.unschedule(jobid) from cron.job where jobname in
    ('waouh-avatar-briefing-hourly','waouh-nexus-followup-hourly','waouh-opportunity-worker-10m',
     'waouh-radar-process-tick','waouh-radar-apify-6h','waouh-radar-site-scraper-6h');

  perform cron.schedule('waouh-avatar-briefing-hourly','23 * * * *',format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_internal_secret' limit 1)),
      body := '{"action":"tick","limit":100}'::jsonb);
  $job$, rtrim(p_base_url,'/') || '/waouh-avatar-briefing'));
  v_jobs := array_append(v_jobs,'waouh-avatar-briefing-hourly');

  perform cron.schedule('waouh-nexus-followup-hourly','7 * * * *',format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_internal_secret' limit 1)),
      body := '{"limit":100}'::jsonb);
  $job$, rtrim(p_base_url,'/') || '/waouh-nexus-followup'));
  v_jobs := array_append(v_jobs,'waouh-nexus-followup-hourly');

  perform cron.schedule('waouh-opportunity-worker-10m','*/10 * * * *',format($job$
    select net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_internal_secret' limit 1)),
      body := '{"limit":20}'::jsonb);
  $job$, rtrim(p_base_url,'/') || '/waouh-opportunity-worker'));
  v_jobs := array_append(v_jobs,'waouh-opportunity-worker-10m');

  -- Keep the existing Radar jobs only when a real public key was explicitly provided.
  if coalesce(v_existing_public_key,'') <> ''
     and v_existing_public_key not like '%.placeholder' then
    perform cron.schedule('waouh-radar-process-tick','*/5 * * * *',format($job$
      select net.http_post(url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := '{}'::jsonb);
    $job$, rtrim(p_base_url,'/') || '/waouh-radar-process', v_existing_public_key));
    v_jobs := array_append(v_jobs,'waouh-radar-process-tick');

    perform cron.schedule('waouh-radar-apify-6h','41 */6 * * *',format($job$
      select net.http_post(url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := '{}'::jsonb);
    $job$, rtrim(p_base_url,'/') || '/waouh-radar-apify', v_existing_public_key));
    v_jobs := array_append(v_jobs,'waouh-radar-apify-6h');

    perform cron.schedule('waouh-radar-site-scraper-6h','53 */6 * * *',format($job$
      select net.http_post(url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := '{}'::jsonb);
    $job$, rtrim(p_base_url,'/') || '/waouh-radar-site-scraper', v_existing_public_key));
    v_jobs := array_append(v_jobs,'waouh-radar-site-scraper-6h');
  end if;

  return jsonb_build_object('ok', true, 'jobs', to_jsonb(v_jobs));
end;
$$;
revoke all on function public.waouh_install_background_ticks(text,text) from public, anon, authenticated;

create or replace function public.waouh_uninstall_background_ticks() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from cron.job where jobname in
    ('waouh-avatar-briefing-hourly','waouh-nexus-followup-hourly','waouh-opportunity-worker-10m',
     'waouh-radar-process-tick','waouh-radar-apify-6h','waouh-radar-site-scraper-6h');
  perform cron.unschedule(jobid) from cron.job where jobname in
    ('waouh-avatar-briefing-hourly','waouh-nexus-followup-hourly','waouh-opportunity-worker-10m',
     'waouh-radar-process-tick','waouh-radar-apify-6h','waouh-radar-site-scraper-6h');
  return n;
end;
$$;
revoke all on function public.waouh_uninstall_background_ticks() from public, anon, authenticated;

-- Install only the Opportunity OS tick automatically. Existing jobs are left untouched.
-- If the internal secret or pg_cron/pg_net is unavailable, this returns false without failing the migration.
select public.waouh_schedule_opportunity_worker();
