-- Keep active queue scans independent of the growing native ingestion history.
create index if not exists waouh_collection_active_jobs
  on public.waouh_collection_jobs(status, handler, priority desc, created_at, id)
  where status in ('queued','running');
create index if not exists waouh_collection_open_attempts
  on public.waouh_collection_attempts(job_id) where finished_at is null;

-- GUARDIAN must inspect the current common worker, not only retired schedulers.
-- Source and provider pauses remain authoritative. No provider is enabled here.
create or replace function guardian_private.collectors_enabled()
returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'site', (
    exists(select 1 from cron.job where jobname='waouh-radar-site-scraper-6h' and active)
    or exists(select 1 from cron.job where jobname='waouh-collection-worker-1m' and active)
  ) and exists(
    select 1 from public.waouh_collection_targets t
    join public.waouh_collection_policies p on p.provider=t.provider
    where t.enabled and not p.paused and t.handler in ('site','feed')
  ),
  'apify', (
    exists(select 1 from cron.job where jobname='waouh-radar-apify-6h' and active)
    or exists(select 1 from cron.job where jobname='waouh-collection-worker-1m' and active)
  ) and exists(
    select 1 from public.waouh_collection_targets t
    join public.waouh_collection_policies p on p.provider=t.provider
    where t.enabled and not p.paused and t.handler='apify'
  )
)$$;
revoke all on function guardian_private.collectors_enabled() from public,anon,authenticated;
grant execute on function guardian_private.collectors_enabled() to service_role;

-- A tick may process two bounded remote tasks, including a 65-second Apify run.
-- Retain Vault authentication and the operator's existing enabled/paused state.
do $$
declare worker cron.job; replacement text;
begin
  select * into strict worker from cron.job where jobname='waouh-collection-worker-1m';
  if worker.command not like '%/functions/v1/waouh-radar-site-scraper%'
    or worker.command not like '%collection.tick%'
    or worker.command not like '%vault.decrypted_secrets%' then
    raise exception 'Unexpected collection worker configuration';
  end if;
  if worker.command ~ 'timeout_milliseconds\s*:=' then
    replacement := regexp_replace(worker.command, 'timeout_milliseconds\s*:=\s*[0-9]+', 'timeout_milliseconds := 180000');
  else
    replacement := replace(worker.command, $body$'{"action":"collection.tick"}'::jsonb$body$,
      $body$'{"action":"collection.tick"}'::jsonb, timeout_milliseconds := 180000$body$);
  end if;
  if replacement not like '%timeout_milliseconds := 180000%' then
    raise exception 'Collection worker timeout update failed';
  end if;
  perform cron.alter_job(worker.jobid, command := replacement);
end;
$$;
