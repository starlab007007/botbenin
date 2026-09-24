-- WAOUH agentic commerce core (payments intentionally excluded).
-- Client mutations go through the authenticated waouh-agentic-core Edge Function.

create extension if not exists pgcrypto;

create schema if not exists waouh_private;
revoke all on schema waouh_private from public, anon, authenticated, service_role;

create table if not exists waouh_private.offer_signing_keys (
  key_id smallint primary key check (key_id > 0),
  key_material bytea not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  retired_at timestamptz
);
alter table waouh_private.offer_signing_keys enable row level security;
revoke all on table waouh_private.offer_signing_keys from public, anon, authenticated, service_role;
insert into waouh_private.offer_signing_keys (key_id, key_material)
values (1, gen_random_bytes(32))
on conflict (key_id) do nothing;

create table public.waouh_agent_missions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal text not null check (char_length(goal) between 3 and 2000),
  channel text not null default 'web' check (channel in ('web', 'mobile', 'whatsapp')),
  locale text not null default 'fr-BJ' check (char_length(locale) between 2 and 20),
  status text not null default 'planning'
    check (status in ('planning', 'active', 'paused', 'completed', 'cancelled', 'failed')),
  constraints jsonb not null default '{}'::jsonb check (jsonb_typeof(constraints) = 'object'),
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  current_plan_id uuid,
  next_run_at timestamptz,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waouh_agent_intents (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.waouh_agent_missions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  intent_type text not null check (char_length(intent_type) between 2 and 80),
  normalized_query text not null check (char_length(normalized_query) between 2 and 2000),
  slots jsonb not null default '{}'::jsonb check (jsonb_typeof(slots) = 'object'),
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  source_message_id uuid,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (mission_id, version)
);

create table public.waouh_agent_plans (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.waouh_agent_missions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'superseded', 'completed', 'failed')),
  rationale text check (rationale is null or char_length(rationale) <= 4000),
  activated_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mission_id, version)
);

alter table public.waouh_agent_missions
  add constraint waouh_agent_missions_current_plan_fk
  foreign key (current_plan_id) references public.waouh_agent_plans(id) on delete set null;

create table public.waouh_agent_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.waouh_agent_plans(id) on delete cascade,
  mission_id uuid not null references public.waouh_agent_missions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  tool_name text not null check (
    char_length(tool_name) between 2 and 100
    and tool_name !~* '(payment|checkout|purchase|payer|paiement|momo|stripe|kkiapay|fedapay)'
  ),
  status text not null default 'blocked'
    check (status in ('blocked', 'queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')),
  input jsonb not null default '{}'::jsonb check (jsonb_typeof(input) = 'object'),
  output jsonb not null default '{}'::jsonb check (jsonb_typeof(output) = 'object'),
  requires_approval boolean not null default false,
  idempotency_key text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, sequence_no),
  unique (idempotency_key)
);

create table public.waouh_watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.waouh_articles(id) on delete set null,
  query text not null check (char_length(query) between 2 and 1000),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  target_amount numeric(14,2) check (target_amount is null or target_amount >= 0),
  currency text not null default 'XOF' check (currency = 'XOF'),
  status text not null default 'active' check (status in ('active', 'paused', 'triggered', 'expired')),
  check_interval_minutes integer not null default 60 check (check_interval_minutes between 15 and 10080),
  last_observed_amount numeric(14,2) check (last_observed_amount is null or last_observed_amount >= 0),
  last_checked_at timestamptz,
  next_check_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waouh_price_observations (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.waouh_watchlists(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.waouh_articles(id) on delete set null,
  source text not null check (source in ('catalog', 'partner_api', 'browser', 'manual')),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  amount numeric(14,2) not null check (amount >= 0),
  previous_amount numeric(14,2) check (previous_amount is null or previous_amount >= 0),
  currency text not null default 'XOF' check (currency = 'XOF'),
  available boolean not null default true,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.waouh_watch_events (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.waouh_watchlists(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  observation_id uuid references public.waouh_price_observations(id) on delete set null,
  event_type text not null check (event_type in ('price_drop', 'target_reached', 'back_in_stock', 'source_error')),
  title text not null check (char_length(title) between 2 and 200),
  body text check (body is null or char_length(body) <= 2000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.waouh_seller_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.waouh_articles(id) on delete cascade,
  business_id uuid references public.waouh_partner_businesses(id) on delete cascade,
  mode text not null default 'manual' check (mode in ('manual', 'assisted', 'automatic')),
  min_price_amount numeric(14,2) check (min_price_amount is null or min_price_amount >= 0),
  max_discount_percent numeric(5,2) check (max_discount_percent is null or max_discount_percent between 0 and 100),
  allow_counteroffers boolean not null default true,
  auto_expire_minutes integer not null default 1440 check (auto_expire_minutes between 15 and 43200),
  delivery_zones text[] not null default '{}'::text[],
  rules jsonb not null default '{}'::jsonb check (
    jsonb_typeof(rules) = 'object'
    and rules::text !~* '(payment|checkout|paiement|momo|stripe|kkiapay|fedapay)'
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index waouh_seller_policy_scope_uq
  on public.waouh_seller_policies (
    owner_id,
    coalesce(article_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) where active;

create table public.waouh_signed_offers (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.waouh_agent_missions(id) on delete cascade,
  article_id uuid not null references public.waouh_articles(id) on delete restrict,
  seller_policy_id uuid references public.waouh_seller_policies(id) on delete set null,
  parent_offer_id uuid references public.waouh_signed_offers(id) on delete set null,
  issuer_id uuid not null references auth.users(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'XOF' check (currency = 'XOF'),
  quantity integer not null default 1 check (quantity > 0),
  terms jsonb not null default '{}'::jsonb check (
    jsonb_typeof(terms) = 'object'
    and terms::text !~* '(payment|checkout|paiement|momo|stripe|kkiapay|fedapay)'
  ),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired')),
  signature_payload jsonb not null default '{}'::jsonb,
  signature_key_id smallint not null default 1 references waouh_private.offer_signing_keys(key_id) on delete restrict,
  signature_hash text not null default '',
  response_note text check (response_note is null or char_length(response_note) <= 1000),
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  check (issuer_id = buyer_id or issuer_id = seller_id),
  check (expires_at > created_at)
);

create table public.waouh_offer_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.waouh_signed_offers(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('proposed', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create table public.waouh_agent_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references public.waouh_agent_missions(id) on delete cascade,
  step_id uuid references public.waouh_agent_steps(id) on delete cascade,
  action_type text not null check (action_type in (
    'external_browse', 'send_message', 'publish_listing', 'share_contact', 'negotiate_offer',
    'accept_offer', 'create_watch', 'access_location', 'use_media', 'seller_policy_change'
  )),
  action_summary text not null check (
    char_length(action_summary) between 3 and 500
    and action_summary !~* '(payment|checkout|payer|paiement|momo|stripe|kkiapay|fedapay)'
  ),
  context jsonb not null default '{}'::jsonb check (
    jsonb_typeof(context) = 'object'
    and context::text !~* '(payment|checkout|payer|paiement|momo|stripe|kkiapay|fedapay)'
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waouh_agent_audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'system' check (actor_type in ('user', 'agent', 'worker', 'system')),
  mission_id uuid references public.waouh_agent_missions(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 120),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.waouh_agent_outbox (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references public.waouh_agent_missions(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 3 and 120),
  aggregate_type text not null check (char_length(aggregate_type) between 2 and 80),
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  dedupe_key text not null unique check (char_length(dedupe_key) between 3 and 300),
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed', 'dead')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waouh_media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references public.waouh_agent_missions(id) on delete set null,
  article_id uuid references public.waouh_articles(id) on delete set null,
  business_id uuid references public.waouh_partner_businesses(id) on delete set null,
  storage_bucket text not null check (char_length(storage_bucket) between 2 and 100),
  storage_path text not null check (char_length(storage_path) between 3 and 1024),
  media_type text not null check (media_type in ('image', 'video', 'audio', 'document')),
  mime_type text not null check (char_length(mime_type) between 3 and 120),
  size_bytes bigint not null default 0 check (size_bytes between 0 and 20971520),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-fA-F]{64}$'),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'rejected', 'deleted')),
  scan_status text not null default 'pending' check (scan_status in ('pending', 'clean', 'rejected', 'failed')),
  visibility text not null default 'private' check (visibility in ('private', 'catalog')),
  alt_text text check (alt_text is null or char_length(alt_text) <= 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.waouh_domain_policies (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique check (
    domain = lower(domain)
    and domain !~ '[/ :]'
    and char_length(domain) between 3 and 253
  ),
  access_mode text not null check (access_mode in ('partner_api', 'browser_allowed', 'browser_blocked', 'merchant_opt_out')),
  api_base_url text check (api_base_url is null or api_base_url ~ '^https://'),
  agent_identity_required boolean not null default true,
  allowed_actions text[] not null default array['search', 'read_product', 'compare']::text[],
  rate_limit_per_minute integer not null default 20 check (rate_limit_per_minute between 1 and 600),
  terms_reviewed boolean not null default false,
  robots_reviewed boolean not null default false,
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  last_reviewed_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_to_string(allowed_actions, ',') !~* '(payment|checkout|purchase|payer|paiement|momo|stripe|kkiapay|fedapay)'),
  check (access_mode <> 'browser_allowed' or (terms_reviewed and robots_reviewed and agent_identity_required)),
  check (access_mode <> 'partner_api' or api_base_url is not null)
);

create index waouh_agent_missions_owner_created_idx on public.waouh_agent_missions(owner_id, created_at desc);
create index waouh_agent_missions_due_idx on public.waouh_agent_missions(next_run_at) where status = 'active';
create index waouh_agent_intents_mission_idx on public.waouh_agent_intents(mission_id, version desc);
create index waouh_agent_intents_owner_idx on public.waouh_agent_intents(owner_id, created_at desc);
create index waouh_agent_plans_mission_idx on public.waouh_agent_plans(mission_id, version desc);
create index waouh_agent_plans_owner_idx on public.waouh_agent_plans(owner_id, created_at desc);
create index waouh_agent_steps_queue_idx on public.waouh_agent_steps(status, created_at) where status in ('queued', 'running');
create index waouh_agent_steps_mission_idx on public.waouh_agent_steps(mission_id, sequence_no);
create index waouh_agent_steps_owner_idx on public.waouh_agent_steps(owner_id, created_at desc);
create index waouh_watchlists_owner_idx on public.waouh_watchlists(owner_id, created_at desc);
create index waouh_watchlists_due_idx on public.waouh_watchlists(next_check_at) where status = 'active';
create index waouh_price_observations_watch_idx on public.waouh_price_observations(watchlist_id, observed_at desc);
create index waouh_price_observations_owner_idx on public.waouh_price_observations(owner_id, observed_at desc);
create index waouh_watch_events_owner_idx on public.waouh_watch_events(owner_id, created_at desc);
create index waouh_watch_events_unread_idx on public.waouh_watch_events(owner_id, created_at desc) where read_at is null;
create index waouh_seller_policies_owner_idx on public.waouh_seller_policies(owner_id, updated_at desc);
create index waouh_signed_offers_buyer_idx on public.waouh_signed_offers(buyer_id, created_at desc);
create index waouh_signed_offers_seller_idx on public.waouh_signed_offers(seller_id, created_at desc);
create index waouh_signed_offers_mission_idx on public.waouh_signed_offers(mission_id, created_at desc);
create index waouh_signed_offers_expiry_idx on public.waouh_signed_offers(expires_at) where status = 'proposed';
create index waouh_offer_events_offer_idx on public.waouh_offer_events(offer_id, created_at);
create index waouh_offer_events_buyer_idx on public.waouh_offer_events(buyer_id, created_at desc);
create index waouh_offer_events_seller_idx on public.waouh_offer_events(seller_id, created_at desc);
create index waouh_agent_approvals_owner_idx on public.waouh_agent_approvals(owner_id, created_at desc);
create index waouh_agent_approvals_pending_idx on public.waouh_agent_approvals(expires_at) where status = 'pending';
create index waouh_agent_audit_owner_idx on public.waouh_agent_audit_log(owner_id, created_at desc);
create index waouh_agent_audit_mission_idx on public.waouh_agent_audit_log(mission_id, created_at desc);
create index waouh_agent_outbox_pending_idx on public.waouh_agent_outbox(next_attempt_at, created_at) where status in ('pending', 'failed');
create index waouh_media_assets_owner_idx on public.waouh_media_assets(owner_id, created_at desc);
create index waouh_media_assets_article_idx on public.waouh_media_assets(article_id, created_at desc) where status <> 'deleted';

create or replace function public.waouh_agentic_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.waouh_agentic_sign_offer()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  signing_key bytea;
  signing_key_id smallint;
begin
  new.signature_payload := jsonb_build_object(
    'offer_id', new.id,
    'mission_id', new.mission_id,
    'article_id', new.article_id,
    'parent_offer_id', new.parent_offer_id,
    'issuer_id', new.issuer_id,
    'buyer_id', new.buyer_id,
    'seller_id', new.seller_id,
    'amount', new.amount,
    'currency', new.currency,
    'quantity', new.quantity,
    'terms', new.terms,
    'expires_at', new.expires_at
  );
  select key_material, key_id
    into signing_key, signing_key_id
    from waouh_private.offer_signing_keys
   where active
   order by key_id desc
   limit 1;
  if signing_key is null then
    raise exception 'no active WAOUH offer signing key';
  end if;
  new.signature_key_id := signing_key_id;
  new.signature_hash := encode(hmac(convert_to(new.signature_payload::text, 'UTF8'), signing_key, 'sha256'), 'hex');
  return new;
end;
$$;

create or replace function public.waouh_agentic_protect_offer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.mission_id <> old.mission_id
    or new.article_id <> old.article_id
    or new.seller_policy_id is distinct from old.seller_policy_id
    or new.parent_offer_id is distinct from old.parent_offer_id
    or new.issuer_id <> old.issuer_id
    or new.buyer_id <> old.buyer_id
    or new.seller_id <> old.seller_id
    or new.amount <> old.amount
    or new.currency <> old.currency
    or new.quantity <> old.quantity
    or new.terms <> old.terms
    or new.signature_payload <> old.signature_payload
    or new.signature_key_id <> old.signature_key_id
    or new.signature_hash <> old.signature_hash
    or new.expires_at <> old.expires_at
    or new.created_at <> old.created_at
  then
    raise exception 'signed offer immutable fields cannot be changed';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger waouh_agent_missions_updated
  before update on public.waouh_agent_missions for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_agent_plans_updated
  before update on public.waouh_agent_plans for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_agent_steps_updated
  before update on public.waouh_agent_steps for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_watchlists_updated
  before update on public.waouh_watchlists for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_seller_policies_updated
  before update on public.waouh_seller_policies for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_agent_approvals_updated
  before update on public.waouh_agent_approvals for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_agent_outbox_updated
  before update on public.waouh_agent_outbox for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_media_assets_updated
  before update on public.waouh_media_assets for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_domain_policies_updated
  before update on public.waouh_domain_policies for each row execute function public.waouh_agentic_set_updated_at();
create trigger waouh_signed_offers_sign
  before insert on public.waouh_signed_offers for each row execute function public.waouh_agentic_sign_offer();
create trigger waouh_signed_offers_protect
  before update on public.waouh_signed_offers for each row execute function public.waouh_agentic_protect_offer();

alter table public.waouh_agent_missions enable row level security;
alter table public.waouh_agent_intents enable row level security;
alter table public.waouh_agent_plans enable row level security;
alter table public.waouh_agent_steps enable row level security;
alter table public.waouh_watchlists enable row level security;
alter table public.waouh_price_observations enable row level security;
alter table public.waouh_watch_events enable row level security;
alter table public.waouh_seller_policies enable row level security;
alter table public.waouh_signed_offers enable row level security;
alter table public.waouh_offer_events enable row level security;
alter table public.waouh_agent_approvals enable row level security;
alter table public.waouh_agent_audit_log enable row level security;
alter table public.waouh_agent_outbox enable row level security;
alter table public.waouh_media_assets enable row level security;
alter table public.waouh_domain_policies enable row level security;

revoke all on table
  public.waouh_agent_missions,
  public.waouh_agent_intents,
  public.waouh_agent_plans,
  public.waouh_agent_steps,
  public.waouh_watchlists,
  public.waouh_price_observations,
  public.waouh_watch_events,
  public.waouh_seller_policies,
  public.waouh_signed_offers,
  public.waouh_offer_events,
  public.waouh_agent_approvals,
  public.waouh_agent_audit_log,
  public.waouh_agent_outbox,
  public.waouh_media_assets,
  public.waouh_domain_policies
from anon, authenticated;

grant select on table
  public.waouh_agent_missions,
  public.waouh_agent_intents,
  public.waouh_agent_plans,
  public.waouh_agent_steps,
  public.waouh_watchlists,
  public.waouh_price_observations,
  public.waouh_watch_events,
  public.waouh_seller_policies,
  public.waouh_signed_offers,
  public.waouh_offer_events,
  public.waouh_agent_approvals,
  public.waouh_agent_audit_log,
  public.waouh_media_assets
to authenticated;

grant all on table
  public.waouh_agent_missions,
  public.waouh_agent_intents,
  public.waouh_agent_plans,
  public.waouh_agent_steps,
  public.waouh_watchlists,
  public.waouh_price_observations,
  public.waouh_watch_events,
  public.waouh_seller_policies,
  public.waouh_signed_offers,
  public.waouh_offer_events,
  public.waouh_agent_approvals,
  public.waouh_agent_audit_log,
  public.waouh_agent_outbox,
  public.waouh_media_assets,
  public.waouh_domain_policies
to service_role;

create policy "owners read missions" on public.waouh_agent_missions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read intents" on public.waouh_agent_intents
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read plans" on public.waouh_agent_plans
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read steps" on public.waouh_agent_steps
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read watchlists" on public.waouh_watchlists
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read price observations" on public.waouh_price_observations
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read watch events" on public.waouh_watch_events
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read seller policies" on public.waouh_seller_policies
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "participants read offers" on public.waouh_signed_offers
  for select to authenticated using ((select auth.uid()) = buyer_id or (select auth.uid()) = seller_id);
create policy "participants read offer events" on public.waouh_offer_events
  for select to authenticated using ((select auth.uid()) = buyer_id or (select auth.uid()) = seller_id);
create policy "owners read approvals" on public.waouh_agent_approvals
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read audit" on public.waouh_agent_audit_log
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners read media" on public.waouh_media_assets
  for select to authenticated using ((select auth.uid()) = owner_id);

revoke all on function public.waouh_agentic_set_updated_at() from public, anon, authenticated;
revoke all on function public.waouh_agentic_sign_offer() from public, anon, authenticated;
revoke all on function public.waouh_agentic_protect_offer() from public, anon, authenticated;
grant execute on function public.waouh_agentic_set_updated_at() to service_role;
grant execute on function public.waouh_agentic_sign_offer() to service_role;
grant execute on function public.waouh_agentic_protect_offer() to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'waouh_agent_missions') then
      alter publication supabase_realtime add table public.waouh_agent_missions;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'waouh_watch_events') then
      alter publication supabase_realtime add table public.waouh_watch_events;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'waouh_agent_approvals') then
      alter publication supabase_realtime add table public.waouh_agent_approvals;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'waouh_signed_offers') then
      alter publication supabase_realtime add table public.waouh_signed_offers;
    end if;
  end if;
end;
$$;

alter table public.waouh_agent_missions replica identity full;
alter table public.waouh_watch_events replica identity full;
alter table public.waouh_agent_approvals replica identity full;
alter table public.waouh_signed_offers replica identity full;

comment on table public.waouh_agent_outbox is 'Private durable event queue. No anon/authenticated grants.';
comment on table public.waouh_domain_policies is 'Explicit merchant consent registry. Missing domain means deny browser automation.';
comment on table public.waouh_signed_offers is 'Immutable HMAC-signed commercial offer snapshot. This table never initiates or records payment.';
