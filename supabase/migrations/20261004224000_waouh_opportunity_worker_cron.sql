-- Opportunity OS worker scheduler.
-- Reuses WAOUH's existing internal tick secret (waouh_tel_internal_secret).
-- The worker is safe to schedule continuously: it executes no outreach unless
-- a user has created an explicit active Avatar mandate.
-- Existing Avatar/NEXUS/Radar cron jobs are not modified.
-- Production is at the Edge Function quota: the worker reuses the historical
-- waouh-e2e-v3-relay slot, previously a disabled 410 stub.

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

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'waouh-opportunity-worker-10m';

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
  $job$, rtrim(p_base_url,'/') || '/waouh-e2e-v3-relay'));
  return true;
end;
$$;
revoke all on function public.waouh_schedule_opportunity_worker(text)
from public, anon, authenticated;

create or replace function public.waouh_unschedule_opportunity_worker() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if to_regnamespace('cron') is null then return false; end if;
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'waouh-opportunity-worker-10m';
  return true;
end;
$$;
revoke all on function public.waouh_unschedule_opportunity_worker()
from public, anon, authenticated;

-- Enable the worker when this migration is deployed. This only wakes the worker;
-- the worker itself requires a user-owned active mandate before any outreach.
select public.waouh_schedule_opportunity_worker();
