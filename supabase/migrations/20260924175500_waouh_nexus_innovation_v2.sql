-- WAOUH NEXUS v2 — multimodal identification, GTIN/barcode, field scouts and source intelligence.
-- Payments remain intentionally outside this layer.

alter table public.waouh_articles
  add column if not exists gtin text,
  add column if not exists barcode_type text,
  add column if not exists ai_visual_fingerprint jsonb not null default '{}'::jsonb;

alter table public.waouh_unified_catalog
  add column if not exists gtin text,
  add column if not exists barcode_type text,
  add column if not exists ai_visual_fingerprint jsonb not null default '{}'::jsonb;

create index if not exists waouh_articles_gtin_idx
  on public.waouh_articles(gtin)
  where gtin is not null;

create index if not exists waouh_unified_catalog_gtin_idx
  on public.waouh_unified_catalog(gtin)
  where gtin is not null;

create table if not exists public.waouh_scout_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.waouh_articles(id) on delete set null,
  catalog_id uuid references public.waouh_unified_catalog(id) on delete set null,
  title text not null check (char_length(title) between 2 and 240),
  category text,
  observed_price numeric check (observed_price is null or observed_price >= 0),
  currency text not null default 'XOF' check (currency='XOF'),
  city text,
  place_name text,
  latitude numeric,
  longitude numeric,
  source_type text not null default 'field'
    check (source_type in ('field','shop','market','barcode','photo','receipt','partner')),
  photo_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(photo_urls)='array'),
  gtin text,
  availability text default 'unknown'
    check (availability in ('available','low_stock','out_of_stock','unknown')),
  note text check (note is null or char_length(note) <= 2000),
  trust_state text not null default 'pending'
    check (trust_state in ('pending','verified','rejected')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists waouh_scout_reports_gtin_idx
  on public.waouh_scout_reports(gtin, observed_at desc);
create index if not exists waouh_scout_reports_title_trgm_idx
  on public.waouh_scout_reports using gin (lower(title) gin_trgm_ops);
create index if not exists waouh_scout_reports_owner_idx
  on public.waouh_scout_reports(owner_id, created_at desc);

alter table public.waouh_scout_reports enable row level security;
revoke all on table public.waouh_scout_reports from anon, authenticated;
grant select, insert on table public.waouh_scout_reports to authenticated;
grant all on table public.waouh_scout_reports to service_role;

drop policy if exists "owners read scout reports" on public.waouh_scout_reports;
create policy "owners read scout reports"
  on public.waouh_scout_reports for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "owners create scout reports" on public.waouh_scout_reports;
create policy "owners create scout reports"
  on public.waouh_scout_reports for insert to authenticated
  with check ((select auth.uid()) = owner_id);

comment on table public.waouh_scout_reports is
  'Crowdsourced WAOUH Scout observations used as price/freshness evidence. Reports are private to their contributor until server-side verification/promotion.';
