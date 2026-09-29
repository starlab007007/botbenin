-- =============================================================================
-- PROJET SUPABASE DE TEST UNIQUEMENT (botbj-test-e2e, ref ljzwqyzaovnandpyfpgc).
-- NE JAMAIS EXÉCUTER EN PRODUCTION (mvynepqulhflxtyymtzs).
-- Tables noyau du chat WAOUH : colonnes relevées en lecture seule sur la
-- production le 29/09/2026 (types, défauts, NOT NULL). Sans données, sans FK
-- vers des tables hors périmètre. Les migrations réelles du dépôt s'appliquent
-- ensuite par-dessus.
-- =============================================================================
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.waouh_users (
  id uuid primary key default gen_random_uuid(),
  phone_number text, display_name text,
  location extensions.geography(Point,4326), city text,
  country text not null default 'BJ',
  reputation numeric(2,1) not null default 5.0,
  sales_count integer not null default 0, purchases_count integer not null default 0,
  preferred_payment text not null default 'momo', is_verified boolean not null default false,
  auth_user_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  channel text not null default 'whatsapp', web_session_id text
);
create table public.waouh_articles (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null, title text not null, description text, category text not null,
  brand text, model text, condition text not null default 'good',
  price numeric(12,2) not null, currency text not null default 'XOF',
  photos text[] not null default '{}', location extensions.geography(Point,4326), city text,
  address_description text, radius_km integer not null default 30, status text not null default 'active',
  market_price_min numeric(12,2), market_price_max numeric(12,2),
  views_count integer not null default 0, interests_count integer not null default 0,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  origin text not null default 'chat', origin_signal_id uuid, source_channel text default 'waouh_app',
  contact_whatsapp text, partner_id uuid, ai_canonical_key text,
  ai_attributes jsonb not null default '{}', ai_quality_score numeric, last_verified_at timestamptz,
  gtin text, barcode_type text, ai_visual_fingerprint jsonb not null default '{}'
);
create table public.waouh_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, phone_number text not null, state text not null default 'idle',
  context jsonb not null default '{}', last_message text, last_intent text,
  current_article_id uuid, current_transaction_id uuid, updated_at timestamptz not null default now(),
  channel text not null default 'whatsapp', unread_count integer not null default 0,
  last_inbound_at timestamptz, last_direction text
);
create table public.waouh_chat_threads (
  id uuid primary key default gen_random_uuid(),
  thread_key text not null unique, active_key text, thread_type text not null default 'product_meet',
  article_id uuid, buyer_user_id uuid, seller_user_id uuid, owner_user_id uuid, search_request_id uuid,
  cycle_id uuid not null default gen_random_uuid(), negotiation_id uuid, deal_id uuid, transaction_id uuid,
  source text, status text not null default 'active', metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  last_message_at timestamptz, closed_at timestamptz
);
create unique index waouh_chat_threads_active_key_prod on public.waouh_chat_threads(active_key) where active_key is not null;
create table public.waouh_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid, user_id uuid, web_session_id text, phone_number text,
  channel text not null default 'web', direction text not null, text text not null,
  meta jsonb default '{}', created_at timestamptz not null default now(),
  attachments jsonb default '[]', article_id uuid, thread_id uuid
);
create table public.waouh_negotiations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid, article_id uuid, buyer_user_id uuid, seller_user_id uuid,
  state text not null default 'proposed', last_offer_price numeric, last_actor text, transaction_id uuid,
  meta jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  closed_at timestamptz, contact_shared_at timestamptz, thread_id uuid
);
create table public.waouh_deals (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid, article_id uuid, buyer_user_id uuid not null, seller_user_id uuid not null,
  courier_user_id uuid, amount numeric not null default 0, status text not null default 'pending_assignment',
  eta_minutes integer, pickup_address text, dropoff_address text, notes text,
  assigned_at timestamptz, picked_up_at timestamptz, delivered_at timestamptz, cancelled_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  payment_status text not null default 'pending', payment_method text, paid_at timestamptz, eta_at timestamptz,
  courier_name text, courier_phone text, thread_id uuid, seller_confirmed_at timestamptz,
  buyer_payment_selected_at timestamptz, fulfillment_mode text not null default 'waouh_delivery',
  commission_rate numeric default 0.05, commission_amount numeric, commission_status text not null default 'pending',
  settlement_completed_at timestamptz
);
create table public.waouh_transactions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null, seller_id uuid not null, buyer_id uuid not null,
  amount numeric(12,2) not null, currency text not null default 'XOF', commission numeric(12,2) not null,
  payment_method text not null, payment_ref text, escrow_status text not null default 'pending',
  negotiated_price numeric(12,2), meeting_location text, meeting_time timestamptz,
  seller_confirmed boolean not null default false, buyer_confirmed boolean not null default false,
  status text not null default 'initiated', created_at timestamptz not null default now(), completed_at timestamptz,
  status_history jsonb default '[]', contacts_exchanged_at timestamptz, thread_id uuid,
  commission_rate numeric default 0.05, commission_status text not null default 'pending', settled_at timestamptz
);
create table public.waouh_outbound_queue (
  id uuid primary key default gen_random_uuid(),
  to_phone text, to_user_id uuid, channel text not null default 'whatsapp', template text not null,
  payload jsonb not null default '{}', status text not null default 'pending', attempts integer not null default 0,
  last_error text, sent_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  web_session_id text, image_url text, message_id uuid, transaction_id uuid, read_at timestamptz,
  dedupe_key text unique, event_type text, next_attempt_at timestamptz, max_attempts integer not null default 5,
  circuit_open_until timestamptz
);
create table public.waouh_admin_module_controls (
  module_key text primary key, label text not null, description text,
  enabled boolean not null default true, automation_enabled boolean not null default true,
  maintenance_message text, metadata jsonb not null default '{}', updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.waouh_commerce_events (
  id uuid primary key default gen_random_uuid(),
  correlation_id text, event_type text not null, entity_type text not null, entity_id uuid,
  thread_id uuid, article_id uuid, negotiation_id uuid, deal_id uuid, transaction_id uuid,
  actor_user_id uuid, actor_role text, previous_state text, next_state text,
  payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create or replace function public.has_role(_user_id uuid, _role_name text) returns boolean
language sql stable as $$ select false $$;  -- SIMULÉ : pas de rôle admin sur le projet de test
create or replace function public.waouh_enqueue_outbound_v2(
  p_to_phone text, p_to_user_id uuid, p_template text, p_payload jsonb,
  p_web_session_id text default null, p_image_url text default null, p_channel text default 'whatsapp',
  p_message_id uuid default null, p_transaction_id uuid default null, p_dedupe_key text default null,
  p_event_type text default null
) returns uuid language plpgsql as $fn$
declare v_id uuid;
begin
  insert into public.waouh_outbound_queue(to_phone,to_user_id,template,payload,web_session_id,image_url,channel,message_id,transaction_id,dedupe_key,event_type)
  values (p_to_phone,p_to_user_id,p_template,p_payload,p_web_session_id,p_image_url,p_channel,p_message_id,p_transaction_id,p_dedupe_key,p_event_type)
  on conflict (dedupe_key) do nothing returning id into v_id;
  return v_id;
end $fn$;
