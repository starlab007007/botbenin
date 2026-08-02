
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 1. waouh_payments (Qosic Mobile Money tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waouh_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.waouh_transactions(id) ON DELETE CASCADE,
  user_id uuid,
  msisdn text NOT NULL,
  operator text NOT NULL CHECK (operator IN ('mtn','moov','sbin')),
  amount numeric NOT NULL,
  qosic_transref text UNIQUE,
  qosic_response jsonb,
  payment_type text NOT NULL DEFAULT 'request' CHECK (payment_type IN ('request','deposit')),
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','pending','success','failed','cancelled')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waouh_payments_tx ON public.waouh_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_waouh_payments_user ON public.waouh_payments(user_id);

ALTER TABLE public.waouh_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all payments" ON public.waouh_payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their own payments" ON public.waouh_payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 2. waouh_external_listings (SerpAPI / scraped listings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waouh_external_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_url text UNIQUE NOT NULL,
  title text,
  description text,
  category text,
  price numeric,
  currency text DEFAULT 'XOF',
  city text,
  condition text,
  seller_phone text,
  seller_name text,
  image_url text,
  raw jsonb,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  matched_buyer_ids uuid[] DEFAULT ARRAY[]::uuid[],
  status text NOT NULL DEFAULT 'new'
);
CREATE INDEX IF NOT EXISTS idx_external_listings_scraped ON public.waouh_external_listings(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_listings_city ON public.waouh_external_listings(city);

ALTER TABLE public.waouh_external_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage external listings" ON public.waouh_external_listings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view external listings" ON public.waouh_external_listings
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 3. Radar tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waouh_radar_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('site','fb_marketplace','fb_page','fb_group','wa_group','telegram','serpapi')),
  identifier text NOT NULL,
  label text,
  active boolean NOT NULL DEFAULT true,
  scan_freq_min integer NOT NULL DEFAULT 60,
  last_scan_at timestamptz,
  last_signal_count integer DEFAULT 0,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_radar_sources_unique ON public.waouh_radar_sources(type, identifier);

ALTER TABLE public.waouh_radar_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage radar sources" ON public.waouh_radar_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.waouh_radar_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.waouh_radar_sources(id) ON DELETE CASCADE,
  source_type text,
  raw_text text,
  raw_url text,
  raw_payload jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  intent text CHECK (intent IN ('SELL','BUY','NEGOTIATE','UNKNOWN')),
  product jsonb,
  category text,
  price numeric,
  city text,
  contact_phone text,
  contact_handle text,
  confidence numeric DEFAULT 0,
  embedding vector(768),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','extracted','matched','notified','ignored'))
);
CREATE INDEX IF NOT EXISTS idx_radar_signals_captured ON public.waouh_radar_signals(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_signals_intent ON public.waouh_radar_signals(intent);
CREATE INDEX IF NOT EXISTS idx_radar_signals_status ON public.waouh_radar_signals(status);

ALTER TABLE public.waouh_radar_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage radar signals" ON public.waouh_radar_signals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.waouh_radar_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone text UNIQUE,
  contact_handle text,
  display_name text,
  role text NOT NULL DEFAULT 'unknown' CHECK (role IN ('seller','buyer','both','unknown')),
  categories text[] DEFAULT ARRAY[]::text[],
  cities text[] DEFAULT ARRAY[]::text[],
  avg_price numeric,
  signals_count integer DEFAULT 0,
  reliability_score numeric DEFAULT 0.5,
  last_seen_at timestamptz,
  opt_in boolean DEFAULT false,
  invited_at timestamptz,
  joined_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_radar_profiles_phone ON public.waouh_radar_profiles(contact_phone);

ALTER TABLE public.waouh_radar_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage radar profiles" ON public.waouh_radar_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.waouh_radar_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES public.waouh_radar_signals(id) ON DELETE CASCADE,
  target_user_id uuid,
  target_buyer_profile_id uuid REFERENCES public.waouh_buyer_profiles(id) ON DELETE CASCADE,
  score numeric NOT NULL,
  notified_at timestamptz,
  notification_channel text,
  response text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_radar_matches_signal ON public.waouh_radar_matches(signal_id);

ALTER TABLE public.waouh_radar_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage radar matches" ON public.waouh_radar_matches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view their own matches" ON public.waouh_radar_matches
  FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

-- ============================================================
-- 4. Forget RPC (RGPD-like)
-- ============================================================
CREATE OR REPLACE FUNCTION public.waouh_radar_forget(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.waouh_radar_signals WHERE contact_phone = p_phone;
  DELETE FROM public.waouh_radar_profiles WHERE contact_phone = p_phone;
END;
$$;

-- ============================================================
-- 5. Updated_at trigger for payments
-- ============================================================
CREATE OR REPLACE FUNCTION public.waouh_payments_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waouh_payments_updated ON public.waouh_payments;
CREATE TRIGGER trg_waouh_payments_updated
BEFORE UPDATE ON public.waouh_payments
FOR EACH ROW EXECUTE FUNCTION public.waouh_payments_set_updated_at();
;
