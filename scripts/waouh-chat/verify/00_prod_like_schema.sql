-- =============================================================================
-- BANC DE TEST LOCAL UNIQUEMENT — NE JAMAIS EXÉCUTER EN PRODUCTION.
-- Reproduit la forme de la base de production (au 27/09/2026) nécessaire aux
-- migrations du chat : colonnes déjà présentes en production (thread_id,
-- waouh_chat_threads) et rôles Supabase. Utilisé par run-sql-tests.sh.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

-- Comme Supabase : les nouvelles fonctions du schéma public sont exécutables
-- par anon/authenticated par défaut (c'est ce que les REVOKE doivent annuler).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role_name text) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT false $$;

CREATE TABLE public.waouh_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid, phone_number text, web_session_id text,
  display_name text, city text, channel text
);
CREATE TABLE public.waouh_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid, title text, price numeric, city text, photos jsonb,
  status text DEFAULT 'active', updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.waouh_conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);

-- Forme production (hors migration) de waouh_chat_threads.
CREATE TABLE public.waouh_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_key text NOT NULL UNIQUE,
  active_key text,
  thread_type text NOT NULL DEFAULT 'product_meet',
  article_id uuid, buyer_user_id uuid, seller_user_id uuid, owner_user_id uuid,
  search_request_id uuid,
  cycle_id uuid NOT NULL DEFAULT gen_random_uuid(),
  negotiation_id uuid, deal_id uuid, transaction_id uuid,
  source text, status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamptz, closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX waouh_chat_threads_active_key_prod ON public.waouh_chat_threads(active_key) WHERE active_key IS NOT NULL;

-- Forme production de waouh_messages : thread_id DÉJÀ présent (hors migration).
CREATE TABLE public.waouh_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.waouh_conversations(id),
  user_id uuid REFERENCES public.waouh_users(id),
  web_session_id text, phone_number text,
  channel text NOT NULL DEFAULT 'web',
  direction text NOT NULL CHECK (direction IN ('in','out')),
  text text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  article_id uuid,
  attachments jsonb DEFAULT '[]'::jsonb,
  thread_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.waouh_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid, buyer_user_id uuid, seller_user_id uuid, thread_id uuid,
  state text, last_offer_price numeric, last_actor text, transaction_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), closed_at timestamptz
);
CREATE TABLE public.waouh_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid, negotiation_id uuid, article_id uuid, buyer_user_id uuid, seller_user_id uuid,
  amount numeric, status text, commission_rate numeric, commission_amount numeric,
  commission_status text, pickup_address text, dropoff_address text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.waouh_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid, article_id uuid, seller_id uuid, buyer_id uuid, amount numeric,
  currency text, commission numeric, payment_method text, escrow_status text,
  negotiated_price numeric, status text, commission_rate numeric, commission_status text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.waouh_outbound_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone text, to_user_id uuid, template text, payload jsonb, web_session_id text,
  image_url text, channel text, message_id uuid, transaction_id uuid,
  dedupe_key text UNIQUE, event_type text, status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Même signature que la version de production (20260609221752).
CREATE OR REPLACE FUNCTION public.waouh_enqueue_outbound_v2(
  p_to_phone text, p_to_user_id uuid, p_template text, p_payload jsonb,
  p_web_session_id text DEFAULT NULL, p_image_url text DEFAULT NULL,
  p_channel text DEFAULT 'whatsapp', p_message_id uuid DEFAULT NULL,
  p_transaction_id uuid DEFAULT NULL, p_dedupe_key text DEFAULT NULL,
  p_event_type text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $fn$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.waouh_outbound_queue(to_phone,to_user_id,template,payload,web_session_id,
    image_url,channel,message_id,transaction_id,dedupe_key,event_type)
  VALUES (p_to_phone,p_to_user_id,p_template,p_payload,p_web_session_id,p_image_url,
    p_channel,p_message_id,p_transaction_id,p_dedupe_key,p_event_type)
  ON CONFLICT (dedupe_key) DO NOTHING RETURNING id INTO v_id;
  RETURN v_id;
END $fn$;
