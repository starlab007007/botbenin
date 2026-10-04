-- Opportunity OS worker scheduler installer.
-- Does NOT activate itself. Requires Vault secrets:
--   waouh_opportunity_worker_url = https://<project>.supabase.co/functions/v1/waouh-opportunity-worker
--   waouh_service_key            = service role key
-- Then run: select public.waouh_schedule_opportunity_worker();

create or replace function public.waouh_schedule_opportunity_worker() returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null or to_regnamespace('vault') is null then
    raise notice 'pg_cron, pg_net ou vault absent : Opportunity OS non planifié';
    return false;
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'waouh_opportunity_worker_url')
     or not exists (select 1 from vault.decrypted_secrets where name = 'waouh_service_key') then
    raise notice 'secrets Vault waouh_opportunity_worker_url / waouh_service_key manquants : Opportunity OS non planifié';
    return false;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-opportunity-worker-10m';
  perform cron.schedule('waouh-opportunity-worker-10m', '*/10 * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_opportunity_worker_url' limit 1),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_service_key' limit 1)
      ),
      body := '{"limit":20}'::jsonb
    );
  $job$);
  return true;
end;
$$;
revoke all on function public.waouh_schedule_opportunity_worker() from public, anon, authenticated;

create or replace function public.waouh_unschedule_opportunity_worker() returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if to_regnamespace('cron') is null then return false; end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-opportunity-worker-10m';
  return true;
end;
$$;
revoke all on function public.waouh_unschedule_opportunity_worker() from public, anon, authenticated;
