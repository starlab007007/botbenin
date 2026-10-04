-- WAOUH Opportunity OS 2026-10-04
-- Autonomous but bounded commercial operating layer:
-- Contact Pack, readiness R0-R5, Actionability Score, Next Best Action,
-- Avatar mandates, persistent intents and universal conversation bus.
-- Additive migration. No external contact is sent by this migration.

create table if not exists public.waouh_avatar_mandates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('buy','sell','ask')),
  autonomy_mode text not null default 'semi_autonomous'
    check (autonomy_mode in ('assisted','semi_autonomous','autonomous')),
  goal text not null,
  normalized_query text,
  city text,
  budget_max numeric check (budget_max is null or budget_max >= 0),
  max_contacts integer not null default 3 check (max_contacts between 1 and 20),
  max_followups integer not null default 1 check (max_followups between 0 and 5),
  allow_waouh boolean not null default true,
  allow_whatsapp boolean not null default true,
  allow_public_business boolean not null default true,
  allow_blind_message boolean not null default true,
  allow_email boolean not null default false,
  allow_sms_rcs boolean not null default false,
  require_approval_for_c1 boolean not null default true,
  min_match_score numeric not null default 70 check (min_match_score between 0 and 100),
  min_actionability_score numeric not null default 65 check (min_actionability_score between 0 and 100),
  status text not null default 'active' check (status in ('draft','active','paused','completed','cancelled','expired')),
  contacted_count integer not null default 0,
  replied_count integer not null default 0,
  qualified_count integer not null default 0,
  last_run_at timestamptz,
  next_run_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waouh_avatar_mandates_owner_active_idx
  on public.waouh_avatar_mandates(owner_id,status,next_run_at,created_at desc);

create table if not exists public.waouh_persistent_intents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mandate_id uuid references public.waouh_avatar_mandates(id) on delete set null,
  mode text not null check (mode in ('find_sellers','find_buyers','auto')),
  query_text text not null,
  city text,
  budget_max numeric check (budget_max is null or budget_max >= 0),
  min_match_score numeric not null default 75 check (min_match_score between 0 and 100),
  min_actionability_score numeric not null default 65 check (min_actionability_score between 0 and 100),
  scan_interval_minutes integer not null default 60 check (scan_interval_minutes between 15 and 10080),
  status text not null default 'active' check (status in ('active','paused','completed','cancelled','expired')),
  last_scan_at timestamptz,
  next_scan_at timestamptz not null default now(),
  last_result_count integer not null default 0,
  last_actionable_count integer not null default 0,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waouh_persistent_intents_due_idx
  on public.waouh_persistent_intents(status,next_scan_at)
  where status='active';

create table if not exists public.waouh_contact_packs (
  fabric_id text primary key,
  entity_id uuid references public.waouh_commerce_entities(id) on delete set null,
  source_key text,
  contactability_level text not null default 'C0'
    check (contactability_level in ('C0','C1','C2','C3','C4','C5')),
  readiness_level text not null default 'R0'
    check (readiness_level in ('R0','R1','R2','R3','R4','R5')),
  readiness_score numeric not null default 0 check (readiness_score between 0 and 100),
  actionability_score numeric not null default 0 check (actionability_score between 0 and 100),
  next_best_action text not null default 'ENRICH'
    check (next_best_action in (
      'ENRICH','CONTACT_NOW','REQUEST_APPROVAL','OPEN_DEAL_ROOM',
      'WAIT_REPLY','FOLLOW_UP','NEGOTIATE','EXECUTE','COMPLETE','DROP_LOW_QUALITY'
    )),
  best_channel text,
  available_channels jsonb not null default '[]'::jsonb check (jsonb_typeof(available_channels)='array'),
  masked_contacts jsonb not null default '[]'::jsonb check (jsonb_typeof(masked_contacts)='array'),
  verification jsonb not null default '{}'::jsonb check (jsonb_typeof(verification)='object'),
  message_template text,
  fallback_channels jsonb not null default '[]'::jsonb check (jsonb_typeof(fallback_channels)='array'),
  last_enriched_at timestamptz,
  last_verified_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waouh_contact_packs_actionability_idx
  on public.waouh_contact_packs(actionability_score desc,readiness_score desc,updated_at desc);

create table if not exists public.waouh_conversation_bus_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  counterparty_auth_user_id uuid references auth.users(id) on delete set null,
  fabric_id text,
  journey_id uuid references public.waouh_opportunity_journeys(id) on delete set null,
  mandate_id uuid references public.waouh_avatar_mandates(id) on delete set null,
  article_id uuid references public.waouh_articles(id) on delete set null,
  thread_id uuid references public.waouh_chat_threads(id) on delete set null,
  negotiation_id uuid references public.waouh_negotiations(id) on delete set null,
  deal_id uuid references public.waouh_deals(id) on delete set null,
  channel text not null default 'waouh',
  direction text not null default 'system' check (direction in ('in','out','system')),
  event_type text not null,
  external_ref text,
  status text not null default 'recorded',
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'),
  created_at timestamptz not null default now()
);

create index if not exists waouh_conversation_bus_owner_idx
  on public.waouh_conversation_bus_events(owner_id,created_at desc);
create index if not exists waouh_conversation_bus_fabric_idx
  on public.waouh_conversation_bus_events(fabric_id,created_at desc);
create index if not exists waouh_conversation_bus_thread_idx
  on public.waouh_conversation_bus_events(thread_id,created_at desc)
  where thread_id is not null;
create unique index if not exists waouh_conversation_bus_dedupe_uq
  on public.waouh_conversation_bus_events(event_type,external_ref)
  where external_ref is not null;

alter table public.waouh_entity_contacts
  add column if not exists verification_status text not null default 'unknown',
  add column if not exists last_success_at timestamptz,
  add column if not exists last_failure_at timestamptz,
  add column if not exists sent_count integer not null default 0,
  add column if not exists reply_count integer not null default 0,
  add column if not exists failure_count integer not null default 0,
  add column if not exists avg_reply_delay_seconds numeric,
  add column if not exists is_whatsapp_reachable boolean,
  add column if not exists preferred_rank numeric not null default 0,
  add column if not exists metrics jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.waouh_entity_contacts'::regclass
      and conname='waouh_entity_contacts_verification_status_ck'
  ) then
    alter table public.waouh_entity_contacts
      add constraint waouh_entity_contacts_verification_status_ck
      check (verification_status in ('unknown','observed','verified','reachable','unreachable','revoked'));
  end if;
end $$;

alter table public.waouh_opportunity_journeys
  add column if not exists mandate_id uuid references public.waouh_avatar_mandates(id) on delete set null,
  add column if not exists readiness_level text not null default 'R0',
  add column if not exists readiness_score numeric not null default 0,
  add column if not exists actionability_score numeric not null default 0,
  add column if not exists next_best_action text not null default 'ENRICH',
  add column if not exists contact_pack jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.waouh_opportunity_journeys'::regclass
      and conname='waouh_opportunity_journeys_readiness_ck'
  ) then
    alter table public.waouh_opportunity_journeys
      add constraint waouh_opportunity_journeys_readiness_ck
      check (readiness_level in ('R0','R1','R2','R3','R4','R5'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.waouh_opportunity_journeys'::regclass
      and conname='waouh_opportunity_journeys_nba_ck'
  ) then
    alter table public.waouh_opportunity_journeys
      add constraint waouh_opportunity_journeys_nba_ck
      check (next_best_action in (
        'ENRICH','CONTACT_NOW','REQUEST_APPROVAL','OPEN_DEAL_ROOM',
        'WAIT_REPLY','FOLLOW_UP','NEGOTIATE','EXECUTE','COMPLETE','DROP_LOW_QUALITY'
      ));
  end if;
end $$;

create or replace function public.waouh_opportunity_os_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists waouh_avatar_mandates_updated on public.waouh_avatar_mandates;
create trigger waouh_avatar_mandates_updated before update on public.waouh_avatar_mandates
for each row execute function public.waouh_opportunity_os_updated_at();

drop trigger if exists waouh_persistent_intents_updated on public.waouh_persistent_intents;
create trigger waouh_persistent_intents_updated before update on public.waouh_persistent_intents
for each row execute function public.waouh_opportunity_os_updated_at();

drop trigger if exists waouh_contact_packs_updated on public.waouh_contact_packs;
create trigger waouh_contact_packs_updated before update on public.waouh_contact_packs
for each row execute function public.waouh_opportunity_os_updated_at();

create or replace function public.waouh_append_conversation_bus_event(
  p_owner_id uuid,
  p_event_type text,
  p_channel text default 'waouh',
  p_direction text default 'system',
  p_fabric_id text default null,
  p_journey_id uuid default null,
  p_mandate_id uuid default null,
  p_article_id uuid default null,
  p_thread_id uuid default null,
  p_negotiation_id uuid default null,
  p_deal_id uuid default null,
  p_external_ref text default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  insert into public.waouh_conversation_bus_events(
    owner_id,event_type,channel,direction,fabric_id,journey_id,mandate_id,
    article_id,thread_id,negotiation_id,deal_id,external_ref,payload
  ) values (
    p_owner_id,p_event_type,coalesce(nullif(p_channel,''),'waouh'),
    case when p_direction in ('in','out','system') then p_direction else 'system' end,
    p_fabric_id,p_journey_id,p_mandate_id,p_article_id,p_thread_id,p_negotiation_id,p_deal_id,
    p_external_ref,coalesce(p_payload,'{}'::jsonb)
  )
  on conflict (event_type,external_ref) where external_ref is not null
  do update set payload=excluded.payload
  returning id into v_id;
  return v_id;
end $$;

alter table public.waouh_avatar_mandates enable row level security;
alter table public.waouh_persistent_intents enable row level security;
alter table public.waouh_contact_packs enable row level security;
alter table public.waouh_conversation_bus_events enable row level security;

drop policy if exists "mandate_owner_select" on public.waouh_avatar_mandates;
create policy "mandate_owner_select" on public.waouh_avatar_mandates
  for select to authenticated using (auth.uid()=owner_id);
drop policy if exists "mandate_owner_insert" on public.waouh_avatar_mandates;
create policy "mandate_owner_insert" on public.waouh_avatar_mandates
  for insert to authenticated with check (auth.uid()=owner_id);
drop policy if exists "mandate_owner_update" on public.waouh_avatar_mandates;
create policy "mandate_owner_update" on public.waouh_avatar_mandates
  for update to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);

drop policy if exists "intent_owner_select" on public.waouh_persistent_intents;
create policy "intent_owner_select" on public.waouh_persistent_intents
  for select to authenticated using (auth.uid()=owner_id);
drop policy if exists "intent_owner_insert" on public.waouh_persistent_intents;
create policy "intent_owner_insert" on public.waouh_persistent_intents
  for insert to authenticated with check (auth.uid()=owner_id);
drop policy if exists "intent_owner_update" on public.waouh_persistent_intents;
create policy "intent_owner_update" on public.waouh_persistent_intents
  for update to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);

drop policy if exists "conversation_bus_owner_select" on public.waouh_conversation_bus_events;
create policy "conversation_bus_owner_select" on public.waouh_conversation_bus_events
  for select to authenticated using (auth.uid()=owner_id or auth.uid()=counterparty_auth_user_id);

revoke all on public.waouh_contact_packs from anon,authenticated;
grant all on public.waouh_contact_packs to service_role;
grant select,insert,update on public.waouh_avatar_mandates to authenticated;
grant select,insert,update on public.waouh_persistent_intents to authenticated;
grant select on public.waouh_conversation_bus_events to authenticated;
grant all on public.waouh_avatar_mandates,public.waouh_persistent_intents,public.waouh_conversation_bus_events to service_role;
grant execute on function public.waouh_append_conversation_bus_event(uuid,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb) to service_role;

comment on table public.waouh_contact_packs is
  'Masked operational Contact Packs: readiness R0-R5, actionability, channel routing and Next Best Action.';
comment on table public.waouh_avatar_mandates is
  'Bounded user mandate for assisted, semi-autonomous or autonomous Avatar commercial work.';
comment on table public.waouh_persistent_intents is
  'Persistent BUY/SELL/RFQ intent monitored by NEXUS instead of one-shot search.';
comment on table public.waouh_conversation_bus_events is
  'Cross-channel normalized events linking NEXUS contact, WAOUH chat and Deal Room continuity.';
