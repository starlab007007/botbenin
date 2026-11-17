-- Restore the deployed worker slot without issuing any requests to metered providers.
create or replace function public.waouh_collection_claim_feed()
returns jsonb
language plpgsql
set search_path to public
as $$
declare
  job_id uuid;
begin
  select j.id into job_id
  from waouh_collection_jobs j
  join waouh_collection_targets t on t.id = j.target_id and t.enabled
  join waouh_collection_policies p on p.provider = j.provider and not p.paused
  where j.provider = 'public_feed' and j.handler = 'feed' and not j.inline
    and (p.cooldown_until is null or p.cooldown_until <= now())
    and ((j.status = 'queued' and j.not_before <= now())
         or (j.status = 'running' and j.lease_until <= now()))
  order by j.priority desc, j.created_at, j.id
  for update of j skip locked limit 1;

  if job_id is null then
    return null;
  end if;
  return waouh_collection_claim(job_id);
end;
$$;

create or replace function public.waouh_collection_publish_official(
  p_job uuid, p_token uuid, p_hash text, p_row jsonb
)
returns text
language plpgsql
set search_path to public
as $$
declare
  job waouh_collection_jobs;
  target_url text;
  source_config waouh_discovery_sources;
  notice_key text;
  previous_hash text;
  record_id uuid;
  stored jsonb;
  observed timestamptz := now();
begin
  select * into job from waouh_collection_jobs
  where id = p_job and lease_token = p_token and status = 'running'
    and lease_until > observed and expires_at > observed
    and provider = 'public_feed' and handler = 'feed' and owner_id is null
    and not inline
  for update;
  if not found then raise exception 'collection_lease_invalid'; end if;

  select url into target_url from waouh_collection_targets where id = job.target_id and enabled;
  select * into source_config from waouh_discovery_sources
  where source_key = p_row->>'source_key' and metadata->>'index_url' = target_url
    and metadata->>'official_index' = 'true' and operational_state = 'live';
  if not found or (p_hash is null or p_hash !~ '^[0-9a-f]{64}$')
    or coalesce(p_row->>'intent', '') <> 'ANNOUNCE'
    or coalesce(p_row->>'source_external_id', '') = ''
    or coalesce(p_row->>'source_url', '') !~ '^https://[^/?#]+/'
    or split_part(p_row->>'source_url', '/', 3) <> split_part(target_url, '/', 3)
    or (p_row->>'expires_at')::timestamptz is null
    or (p_row->>'expires_at')::timestamptz <= observed then
    raise exception 'unverified_official_notice';
  end if;

  notice_key := 'official:' || source_config.source_key || ':' || (p_row->>'source_external_id');
  perform pg_advisory_xact_lock(hashtextextended(notice_key, 0));
  select o.content_hash into previous_hash
  from waouh_collection_observations o where o.identity_key = notice_key;
  select s.id into record_id from waouh_external_commerce_signals s
  where s.source_key = source_config.source_key and s.source_external_id = p_row->>'source_external_id';

  if record_id is not null and previous_hash = p_hash then
    update waouh_collection_observations o set last_checked_at = observed, job_id = p_job
    where o.identity_key = notice_key;
    update waouh_external_commerce_signals set observed_at = observed where id = record_id;
    return 'unchanged';
  end if;

  stored := waouh_collection_ingest_commerce(
    p_job, p_token,
    (p_row - array['submitted_by','status','entity_id','actor_handle','raw_text',
                   'ai_extraction','price_min','price_max','quantity','unit']) ||
    jsonb_build_object('source_id', source_config.id, 'contactability_level', 'C0',
                       'contact_consent_basis', 'unknown', 'observed_at', observed)
  );
  insert into waouh_collection_observations as o(identity_key, record_kind, record_id, content_hash, job_id)
  values (notice_key, 'commerce', (stored->>'id')::uuid, p_hash, p_job)
  on conflict on constraint waouh_collection_observations_pkey do update
    set content_hash = excluded.content_hash, last_checked_at = observed, job_id = excluded.job_id;
  return case when record_id is null then 'inserted' else 'updated' end;
end;
$$;

revoke execute on function public.waouh_collection_claim_feed() from public, anon, authenticated;
revoke execute on function public.waouh_collection_publish_official(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.waouh_collection_claim_feed() to service_role;
grant execute on function public.waouh_collection_publish_official(uuid, uuid, text, jsonb) to service_role;

do $$
declare
  current_job cron.job;
  replacement text;
begin
  select * into strict current_job from cron.job where jobname = 'waouh-collection-worker-1m';
  if current_job.command not like '%/functions/v1/waouh-radar-site-scraper%'
    or current_job.command not ilike '%x-waouh-internal%' then
    raise exception 'Unexpected WAOUH collection cron configuration';
  end if;
  if position('collection.tick' in current_job.command) > 0 then return; end if;
  replacement := replace(current_job.command, $empty$'{}'::jsonb$empty$,
    $body$'{"action":"collection.tick"}'::jsonb$body$);
  if replacement = current_job.command then raise exception 'Collection request body not found'; end if;
  perform cron.alter_job(current_job.jobid, command := replacement);
end;
$$;
