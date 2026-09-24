-- WAOUH NEXUS — AI commerce graph and explainable market intelligence.
-- Payments remain intentionally outside this layer.

create extension if not exists pg_trgm;

alter table public.waouh_articles
  add column if not exists ai_canonical_key text,
  add column if not exists ai_attributes jsonb not null default '{}'::jsonb,
  add column if not exists ai_quality_score numeric,
  add column if not exists last_verified_at timestamptz;

alter table public.waouh_buyer_profiles
  add column if not exists ai_intent jsonb not null default '{}'::jsonb,
  add column if not exists ai_priority_score numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'waouh_articles_ai_quality_score_check'
  ) then
    alter table public.waouh_articles
      add constraint waouh_articles_ai_quality_score_check
      check (ai_quality_score is null or ai_quality_score between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'waouh_buyer_profiles_ai_priority_score_check'
  ) then
    alter table public.waouh_buyer_profiles
      add constraint waouh_buyer_profiles_ai_priority_score_check
      check (ai_priority_score is null or ai_priority_score between 0 and 100);
  end if;
end;
$$;

create table if not exists public.waouh_nexus_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'both' check (mode in ('buyer', 'seller', 'both')),
  price_weight numeric not null default 0.24 check (price_weight between 0 and 1),
  relevance_weight numeric not null default 0.30 check (relevance_weight between 0 and 1),
  trust_weight numeric not null default 0.18 check (trust_weight between 0 and 1),
  location_weight numeric not null default 0.10 check (location_weight between 0 and 1),
  freshness_weight numeric not null default 0.10 check (freshness_weight between 0 and 1),
  availability_weight numeric not null default 0.08 check (availability_weight between 0 and 1),
  contact_mode text not null default 'approval' check (contact_mode in ('manual', 'approval', 'auto_opted_in')),
  auto_negotiate boolean not null default false,
  max_auto_discount_percent numeric check (max_auto_discount_percent is null or max_auto_discount_percent between 0 and 100),
  preferred_city text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waouh_nexus_matches (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid not null references public.waouh_buyer_profiles(id) on delete cascade,
  article_id uuid not null references public.waouh_articles(id) on delete cascade,
  buyer_auth_id uuid references auth.users(id) on delete cascade,
  seller_auth_id uuid references auth.users(id) on delete cascade,
  relevance_score numeric not null default 0 check (relevance_score between 0 and 100),
  price_score numeric not null default 0 check (price_score between 0 and 100),
  trust_score numeric not null default 0 check (trust_score between 0 and 100),
  location_score numeric not null default 0 check (location_score between 0 and 100),
  freshness_score numeric not null default 0 check (freshness_score between 0 and 100),
  availability_score numeric not null default 0 check (availability_score between 0 and 100),
  total_score numeric not null default 0 check (total_score between 0 and 100),
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  status text not null default 'candidate'
    check (status in ('candidate','notified','interested','negotiating','accepted','dismissed','expired')),
  source text not null default 'nexus',
  last_evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_profile_id, article_id)
);

create table if not exists public.waouh_market_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  query text not null check (char_length(query) between 2 and 1000),
  canonical_key text,
  category text,
  city text,
  currency text not null default 'XOF' check (currency = 'XOF'),
  min_amount numeric check (min_amount is null or min_amount >= 0),
  median_amount numeric check (median_amount is null or median_amount >= 0),
  max_amount numeric check (max_amount is null or max_amount >= 0),
  average_amount numeric check (average_amount is null or average_amount >= 0),
  sample_count integer not null default 0 check (sample_count >= 0),
  source_mix jsonb not null default '{}'::jsonb check (jsonb_typeof(source_mix) = 'object'),
  observed_at timestamptz not null default now()
);

create index if not exists waouh_articles_title_trgm_idx
  on public.waouh_articles using gin (lower(title) gin_trgm_ops);
create index if not exists waouh_articles_brand_trgm_idx
  on public.waouh_articles using gin (lower(coalesce(brand,'')) gin_trgm_ops);
create index if not exists waouh_buyer_profiles_query_trgm_idx
  on public.waouh_buyer_profiles using gin (lower(query_text) gin_trgm_ops);
create index if not exists waouh_nexus_matches_buyer_idx
  on public.waouh_nexus_matches(buyer_auth_id, total_score desc, updated_at desc);
create index if not exists waouh_nexus_matches_seller_idx
  on public.waouh_nexus_matches(seller_auth_id, total_score desc, updated_at desc);
create index if not exists waouh_nexus_matches_article_idx
  on public.waouh_nexus_matches(article_id, total_score desc);
create index if not exists waouh_market_snapshots_query_idx
  on public.waouh_market_snapshots(canonical_key, city, observed_at desc);

create or replace function public.waouh_nexus_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists waouh_nexus_preferences_updated on public.waouh_nexus_preferences;
create trigger waouh_nexus_preferences_updated
  before update on public.waouh_nexus_preferences
  for each row execute function public.waouh_nexus_set_updated_at();

drop trigger if exists waouh_nexus_matches_updated on public.waouh_nexus_matches;
create trigger waouh_nexus_matches_updated
  before update on public.waouh_nexus_matches
  for each row execute function public.waouh_nexus_set_updated_at();

alter table public.waouh_nexus_preferences enable row level security;
alter table public.waouh_nexus_matches enable row level security;
alter table public.waouh_market_snapshots enable row level security;

revoke all on table
  public.waouh_nexus_preferences,
  public.waouh_nexus_matches,
  public.waouh_market_snapshots
from anon, authenticated;

grant select on table public.waouh_nexus_preferences to authenticated;
grant select on table public.waouh_nexus_matches to authenticated;
grant select on table public.waouh_market_snapshots to authenticated;

grant all on table
  public.waouh_nexus_preferences,
  public.waouh_nexus_matches,
  public.waouh_market_snapshots
to service_role;

drop policy if exists "owners read nexus preferences" on public.waouh_nexus_preferences;
create policy "owners read nexus preferences"
  on public.waouh_nexus_preferences for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "participants read nexus matches" on public.waouh_nexus_matches;
create policy "participants read nexus matches"
  on public.waouh_nexus_matches for select to authenticated
  using ((select auth.uid()) = buyer_auth_id or (select auth.uid()) = seller_auth_id);

drop policy if exists "authenticated read market snapshots" on public.waouh_market_snapshots;
create policy "owners read market snapshots"
  on public.waouh_market_snapshots for select to authenticated
  using (owner_id is null or (select auth.uid()) = owner_id);

revoke all on function public.waouh_nexus_set_updated_at() from public, anon, authenticated;
grant execute on function public.waouh_nexus_set_updated_at() to service_role;

comment on table public.waouh_nexus_matches is
  'Explainable buyer-to-offer graph generated by WAOUH NEXUS. Contact remains consent/approval controlled.';
comment on table public.waouh_market_snapshots is
  'Price intelligence snapshots across WAOUH, partner and Radar sources. No payment data.';
comment on table public.waouh_nexus_preferences is
  'Per-user NEXUS ranking and automation preferences. Auto contact is limited to opted-in recipients.';