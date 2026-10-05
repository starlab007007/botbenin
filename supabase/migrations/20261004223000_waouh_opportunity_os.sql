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


-- ---------------------------------------------------------------------------
-- Canonical commerce -> Opportunity OS synchronization
-- ---------------------------------------------------------------------------
-- These triggers NEVER create a new Opportunity Journey. They only advance an
-- existing Journey already bound to the canonical thread/negotiation/deal.
-- This preserves the invariant:
-- catalog_id -> article_id -> thread_id -> negotiation_id -> deal_id
-- with the SAME thread_id through agreement, delivery and payment.

create or replace function public.waouh_sync_opportunity_from_negotiation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row record;
  v_has_live_deal boolean := false;
  v_ref text;
begin
  if new.thread_id is null then return new; end if;
  if tg_op='UPDATE'
     and new.state is not distinct from old.state
     and new.last_offer_price is not distinct from old.last_offer_price
     and new.last_actor is not distinct from old.last_actor then
    return new;
  end if;

  if new.state='accepted' then
    -- The atomic acceptance RPC creates the deal before setting accepted.
    -- Let the deal trigger own the agreed phase when that canonical deal exists.
    select exists(
      select 1 from public.waouh_deals d
      where d.negotiation_id=new.id and d.status <> 'cancelled'
    ) into v_has_live_deal;
    if v_has_live_deal then return new; end if;
  elsif new.state='closed' then
    select exists(
      select 1 from public.waouh_deals d
      where d.negotiation_id=new.id and d.status <> 'cancelled'
    ) into v_has_live_deal;
    if v_has_live_deal then return new; end if;
  elsif new.state <> 'countered' then
    return new;
  end if;

  for v_row in
    update public.waouh_opportunity_journeys j
       set stage=case
             when new.state='countered'
              and (
                (j.mode in ('buy','ask') and new.last_actor='seller')
                or (j.mode='sell' and new.last_actor='buyer')
              ) then 'negotiating'
             when new.state='countered' then j.stage
             when new.state='accepted' then 'agreed'
             when new.state='closed' then 'cancelled'
             else j.stage
           end,
           contactability_level=case
             when new.state='accepted'
               or (
                 new.state='countered'
                 and (
                   (j.mode in ('buy','ask') and new.last_actor='seller')
                   or (j.mode='sell' and new.last_actor='buyer')
                 )
               ) then 'C5'
             else j.contactability_level end,
           readiness_level=case
             when new.state='accepted'
               or (
                 new.state='countered'
                 and (
                   (j.mode in ('buy','ask') and new.last_actor='seller')
                   or (j.mode='sell' and new.last_actor='buyer')
                 )
               ) then 'R5'
             else j.readiness_level end,
           readiness_score=case
             when new.state='accepted'
               or (
                 new.state='countered'
                 and (
                   (j.mode in ('buy','ask') and new.last_actor='seller')
                   or (j.mode='sell' and new.last_actor='buyer')
                 )
               ) then 100
             else j.readiness_score end,
           actionability_score=case
             when new.state='accepted'
               or (
                 new.state='countered'
                 and (
                   (j.mode in ('buy','ask') and new.last_actor='seller')
                   or (j.mode='sell' and new.last_actor='buyer')
                 )
               ) then 100
             else j.actionability_score end,
           next_best_action=case
             when new.state='countered'
               and (
                 (j.mode in ('buy','ask') and new.last_actor='seller')
                 or (j.mode='sell' and new.last_actor='buyer')
               ) then 'NEGOTIATE'
             when new.state='countered' then j.next_best_action
             when new.state='accepted' then 'EXECUTE'
             when new.state='closed' then 'DROP_LOW_QUALITY'
             else j.next_best_action end,
           negotiation_id=new.id,
           article_id=coalesce(j.article_id,new.article_id),
           thread_id=coalesce(j.thread_id,new.thread_id),
           last_action=case
             when new.state='countered'
               and (
                 (j.mode in ('buy','ask') and new.last_actor='seller')
                 or (j.mode='sell' and new.last_actor='buyer')
               ) then 'canonical_counterparty_counterproposal'
             when new.state='countered' then 'canonical_owner_offer_updated'
             when new.state='accepted' then 'canonical_agreement'
             when new.state='closed' then 'canonical_negotiation_closed'
             else j.last_action end,
           next_action=case
             when new.state='countered'
               and (
                 (j.mode in ('buy','ask') and new.last_actor='seller')
                 or (j.mode='sell' and new.last_actor='buyer')
               ) then 'NEGOTIATE'
             when new.state='accepted' then 'EXECUTE'
             when new.state='closed' then 'DROP_LOW_QUALITY'
             else j.next_action end,
           last_message=case
             when new.state='countered'
               and (
                 (j.mode in ('buy','ask') and new.last_actor='seller')
                 or (j.mode='sell' and new.last_actor='buyer')
               ) then 'Contre-proposition reçue dans le Deal Room. La négociation continue.'
             when new.state='countered' then 'Votre nouvelle proposition a été transmise. Réponse de la contrepartie en attente.'
             when new.state='accepted' then 'Accord conclu sur le même fil canonique.'
             when new.state='closed' then 'Négociation clôturée sans accord.'
             else j.last_message end,
           timeline=coalesce(j.timeline,'[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'at',now(),
               'stage',case
                 when new.state='countered'
                   and (
                     (j.mode in ('buy','ask') and new.last_actor='seller')
                     or (j.mode='sell' and new.last_actor='buyer')
                   ) then 'negotiating'
                 when new.state='accepted' then 'agreed'
                 when new.state='closed' then 'cancelled'
                 else j.stage end,
               'action','canonical_negotiation_update',
               'thread_id',new.thread_id,
               'negotiation_id',new.id,
               'negotiation_state',new.state,
               'last_actor',new.last_actor,
               'last_offer_price',new.last_offer_price
             )
           ),
           last_activity_at=now(),
           completed_at=case when new.state='closed' then coalesce(j.completed_at,now()) else j.completed_at end,
           updated_at=now()
     where j.stage not in ('completed','cancelled')
       and (
         j.thread_id=new.thread_id
         or j.negotiation_id=new.id
       )
     returning j.*
  loop
    v_ref := 'negotiation:' || new.id::text || ':' || new.state || ':' ||
      coalesce(new.last_actor,'') || ':' || coalesce(new.last_offer_price::text,'') ||
      ':journey:' || v_row.id::text;
    if v_row.fabric_id is not null then
      update public.waouh_contact_packs
         set contactability_level=case when v_row.stage in ('negotiating','agreed') then 'C5' else contactability_level end,
             readiness_level=case when v_row.stage in ('negotiating','agreed') then 'R5' else readiness_level end,
             readiness_score=case when v_row.stage in ('negotiating','agreed') then 100 else readiness_score end,
             actionability_score=case when v_row.stage in ('negotiating','agreed') then 100 else actionability_score end,
             next_best_action=v_row.next_best_action,
             last_verified_at=case when v_row.stage in ('negotiating','agreed') then now() else last_verified_at end,
             updated_at=now()
       where fabric_id=v_row.fabric_id;
    end if;
    perform public.waouh_append_conversation_bus_event(
      v_row.owner_id,
      case new.state
        when 'countered' then 'commerce.negotiation_countered'
        when 'accepted' then 'commerce.agreement_reached'
        else 'commerce.negotiation_closed'
      end,
      'waouh',
      'system',
      v_row.fabric_id,
      v_row.id,
      v_row.mandate_id,
      coalesce(v_row.article_id,new.article_id),
      new.thread_id,
      new.id,
      v_row.deal_id,
      v_ref,
      jsonb_build_object(
        'thread_id',new.thread_id,
        'negotiation_id',new.id,
        'state',new.state,
        'last_offer_price',new.last_offer_price,
        'last_actor',new.last_actor,
        'journey_stage',v_row.stage
      )
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists waouh_opportunity_sync_negotiation
on public.waouh_negotiations;
create trigger waouh_opportunity_sync_negotiation
after insert or update of state,last_offer_price,last_actor on public.waouh_negotiations
for each row execute function public.waouh_sync_opportunity_from_negotiation();

create or replace function public.waouh_sync_opportunity_from_deal()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_stage text;
  v_action text;
  v_message text;
  v_nba text;
  v_changed boolean := true;
  v_row record;
  v_ref text;
  v_event_type text;
begin
  if new.thread_id is null then return new; end if;

  if tg_op='UPDATE' then
    v_changed :=
      new.status is distinct from old.status
      or new.payment_status is distinct from old.payment_status
      or new.seller_confirmed_at is distinct from old.seller_confirmed_at
      or new.buyer_payment_selected_at is distinct from old.buyer_payment_selected_at
      or new.courier_user_id is distinct from old.courier_user_id
      or new.eta_at is distinct from old.eta_at;
    if not v_changed then return new; end if;
  end if;

  if new.status='cancelled' then
    v_stage := 'cancelled';
    v_action := 'deal_cancelled';
    v_message := 'Le deal a été annulé.';
    v_nba := 'DROP_LOW_QUALITY';
    v_event_type := 'commerce.deal_cancelled';
  elsif new.status='completed' or new.payment_status='paid' then
    v_stage := 'completed';
    v_action := 'payment_completed';
    v_message := 'Paiement confirmé. Parcours terminé.';
    v_nba := 'COMPLETE';
    v_event_type := 'commerce.completed';
  elsif new.status='delivered' then
    v_stage := 'executing';
    v_action := 'delivery_completed';
    v_message := 'Livraison effectuée. Confirmation du paiement en attente.';
    v_nba := 'EXECUTE';
    v_event_type := 'commerce.delivered';
  elsif new.status='picked_up' then
    v_stage := 'executing';
    v_action := 'courier_picked_up';
    v_message := 'Le livreur a récupéré le colis. Livraison en cours.';
    v_nba := 'EXECUTE';
    v_event_type := 'commerce.picked_up';
  elsif new.status='assigned' then
    v_stage := 'executing';
    v_action := 'courier_assigned';
    v_message := 'Livreur assigné. Suivi de la livraison en cours.';
    v_nba := 'EXECUTE';
    v_event_type := 'commerce.courier_assigned';
  elsif new.status='pending_assignment' then
    v_stage := 'executing';
    v_action := 'preparation_ready_for_courier';
    v_message := 'Préparation confirmée. Attribution du livreur en cours.';
    v_nba := 'EXECUTE';
    v_event_type := 'commerce.preparation_ready';
  elsif new.seller_confirmed_at is not null then
    v_stage := 'agreed';
    v_action := 'seller_confirmed';
    v_message := 'Le vendeur a confirmé. Préparation du deal en cours.';
    v_nba := 'EXECUTE';
    v_event_type := 'commerce.seller_confirmed';
  else
    v_stage := 'agreed';
    v_action := 'agreement_reached';
    v_message := 'Accord conclu. Confirmation vendeur et préparation en attente.';
    v_nba := 'EXECUTE';
    v_event_type := 'commerce.agreement_reached';
  end if;

  for v_row in
    update public.waouh_opportunity_journeys j
       set stage=v_stage,
           contactability_level=case when v_stage in ('agreed','executing','completed') then 'C5' else j.contactability_level end,
           readiness_level=case when v_stage in ('agreed','executing','completed') then 'R5' else j.readiness_level end,
           readiness_score=case when v_stage in ('agreed','executing','completed') then 100 else j.readiness_score end,
           actionability_score=case when v_stage in ('agreed','executing','completed') then 100 else j.actionability_score end,
           next_best_action=v_nba,
           deal_id=new.id,
           negotiation_id=coalesce(j.negotiation_id,new.negotiation_id),
           article_id=coalesce(j.article_id,new.article_id),
           thread_id=coalesce(j.thread_id,new.thread_id),
           last_action=v_action,
           next_action=case
             when v_stage='completed' then 'COMPLETE'
             when v_stage='cancelled' then 'DROP_LOW_QUALITY'
             else 'EXECUTE' end,
           last_message=v_message,
           timeline=coalesce(j.timeline,'[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'at',now(),
               'stage',v_stage,
               'action',v_action,
               'thread_id',new.thread_id,
               'negotiation_id',new.negotiation_id,
               'deal_id',new.id,
               'deal_status',new.status,
               'payment_status',new.payment_status
             )
           ),
           last_activity_at=now(),
           completed_at=case
             when v_stage in ('completed','cancelled') then coalesce(j.completed_at,now())
             else j.completed_at end,
           updated_at=now()
     where j.stage not in ('completed','cancelled')
       and (
         j.thread_id=new.thread_id
         or j.negotiation_id=new.negotiation_id
         or j.deal_id=new.id
       )
     returning j.*
  loop
    v_ref := 'deal:' || new.id::text || ':' ||
      coalesce(new.status,'') || ':' ||
      coalesce(new.payment_status,'') || ':' ||
      coalesce(new.seller_confirmed_at::text,'') || ':' ||
      coalesce(new.buyer_payment_selected_at::text,'') || ':' ||
      coalesce(new.courier_user_id::text,'') || ':journey:' || v_row.id::text;
    if v_row.fabric_id is not null then
      update public.waouh_contact_packs
         set contactability_level=case when v_stage in ('agreed','executing','completed') then 'C5' else contactability_level end,
             readiness_level=case when v_stage in ('agreed','executing','completed') then 'R5' else readiness_level end,
             readiness_score=case when v_stage in ('agreed','executing','completed') then 100 else readiness_score end,
             actionability_score=case when v_stage in ('agreed','executing','completed') then 100 else actionability_score end,
             next_best_action=v_nba,
             last_verified_at=case when v_stage in ('agreed','executing','completed') then now() else last_verified_at end,
             updated_at=now()
       where fabric_id=v_row.fabric_id;
    end if;
    perform public.waouh_append_conversation_bus_event(
      v_row.owner_id,
      v_event_type,
      'waouh',
      'system',
      v_row.fabric_id,
      v_row.id,
      v_row.mandate_id,
      coalesce(v_row.article_id,new.article_id),
      new.thread_id,
      coalesce(v_row.negotiation_id,new.negotiation_id),
      new.id,
      v_ref,
      jsonb_build_object(
        'thread_id',new.thread_id,
        'negotiation_id',new.negotiation_id,
        'deal_id',new.id,
        'status',new.status,
        'payment_status',new.payment_status,
        'seller_confirmed',new.seller_confirmed_at is not null,
        'payment_preference_selected',new.buyer_payment_selected_at is not null,
        'courier_assigned',new.courier_user_id is not null,
        'eta_at',new.eta_at,
        'delivered_at',new.delivered_at,
        'paid_at',new.paid_at
      )
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists waouh_opportunity_sync_deal
on public.waouh_deals;
create trigger waouh_opportunity_sync_deal
after insert or update of
  status,payment_status,seller_confirmed_at,buyer_payment_selected_at,courier_user_id,eta_at
on public.waouh_deals
for each row execute function public.waouh_sync_opportunity_from_deal();

comment on function public.waouh_sync_opportunity_from_negotiation() is
  'Advances existing Opportunity OS journeys from canonical negotiation state without creating parallel threads.';
comment on function public.waouh_sync_opportunity_from_deal() is
  'Advances existing Opportunity OS journeys through agreement, preparation, courier, delivery, payment and closure on the same thread_id.';
