create table public.waouh_collection_engines(
 engine_key text primary key check(engine_key in ('cheerio','crawlee','playwright','scrapy','beautifulsoup','crawl4ai')),
 enabled boolean not null default true,
 timeout_seconds integer not null default 20 check(timeout_seconds between 5 and 30),
 max_document_kb integer not null default 1200 check(max_document_kb between 64 and 1200),
 installed_version text, checked_at timestamptz,
 last_check_status text check(last_check_status in ('available','unavailable')),
 last_test_status text check(last_test_status in ('passed','failed')),
 last_test_at timestamptz, updated_at timestamptz not null default now()
);
insert into public.waouh_collection_engines(engine_key) values
 ('cheerio'),('crawlee'),('playwright'),('scrapy'),('beautifulsoup'),('crawl4ai');
alter table public.waouh_collection_targets add column engine_key text not null default 'cheerio'
 references public.waouh_collection_engines(engine_key);
create table public.waouh_collection_engine_runs(
 id uuid primary key default gen_random_uuid(),
 engine_key text not null references public.waouh_collection_engines(engine_key),
 job_id uuid references public.waouh_collection_jobs(id) on delete set null,
 target_id uuid references public.waouh_collection_targets(id) on delete set null,
 actor_id uuid, purpose text not null check(purpose in ('collection','demo')),
 status text not null check(status in ('passed','failed')),
 duration_ms integer not null check(duration_ms between 0 and 120000),
 error_code text check(error_code ~ '^[a-z_]{2,80}$'),
 created_at timestamptz not null default now()
);
create index waouh_collection_engine_runs_recent on public.waouh_collection_engine_runs(created_at desc);
alter table public.waouh_collection_engines enable row level security;
alter table public.waouh_collection_engine_runs enable row level security;
revoke all on public.waouh_collection_engines,public.waouh_collection_engine_runs from public,anon,authenticated;
grant all on public.waouh_collection_engines,public.waouh_collection_engine_runs to service_role;

-- A dedicated service-only credential, never returned by the admin gateway.
do $$begin
 if not exists(select 1 from vault.secrets where name='waouh_collection_engine_secret') then
  perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'waouh_collection_engine_secret');
 end if;
end$$;
create function public.waouh_collection_engine_token() returns text
language sql security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='waouh_collection_engine_secret' limit 1
$$;
revoke all on function public.waouh_collection_engine_token() from public,anon,authenticated;
grant execute on function public.waouh_collection_engine_token() to service_role;
