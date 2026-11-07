-- Collecte externe : cache des recherches (économie de quota), enrichissement des contacts, santé des sources.

create table if not exists public.waouh_search_cache (
  cache_key text primary key,
  created_at timestamptz not null default now()
);
alter table public.waouh_search_cache enable row level security;
revoke all on public.waouh_search_cache from anon, authenticated;
create index if not exists waouh_search_cache_created_idx on public.waouh_search_cache (created_at);

-- Fraîcheur de chaque source : dernière annonce, volume sur 7 jours, part d'annonces avec un contact utilisable.
create or replace view public.waouh_source_health as
select
  f.source_key,
  count(*) as total,
  count(*) filter (where f.observed_at > now() - interval '7 days') as last_7d,
  max(f.observed_at) as last_seen,
  round(extract(epoch from (now() - max(f.observed_at))) / 3600) as hours_since_last,
  count(*) filter (where f.contactability_level in ('C1','C2','C3','C4','C5')) as with_contact,
  case
    when max(f.observed_at) > now() - interval '2 days' then 'ok'
    when max(f.observed_at) > now() - interval '7 days' then 'slow'
    else 'silent'
  end as status
from public.waouh_signal_fabric f
group by f.source_key;
revoke all on public.waouh_source_health from anon, authenticated;

-- Enrichissement des contacts : toutes les 5 minutes, 12 annonces à la fois.
do $$
begin
  if to_regnamespace('cron') is null then return; end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-contact-enrich-5m';
  perform cron.schedule('waouh-contact-enrich-5m', '*/5 * * * *', $job$
    select net.http_post(
      url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-contact-enrich',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'X-Waouh-Internal',
        (select decrypted_secret from vault.decrypted_secrets where name='waouh_runtime_internal_secret' limit 1)
      ),
      body := '{"limit":12}'::jsonb
    );
  $job$);
  -- Purge du cache.
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-search-cache-purge';
  perform cron.schedule('waouh-search-cache-purge', '17 3 * * *', $job$
    delete from public.waouh_search_cache where created_at < now() - interval '2 days';
  $job$);
end $$;
