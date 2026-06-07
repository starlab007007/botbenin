
-- 1. Radar API configs
CREATE TABLE public.waouh_radar_api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE CHECK (provider IN ('serpapi','apify')),
  api_key text,
  active boolean NOT NULL DEFAULT false,
  extra_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  daily_quota integer NOT NULL DEFAULT 1000,
  usage_today integer NOT NULL DEFAULT 0,
  usage_reset_at timestamptz NOT NULL DEFAULT now(),
  last_test_at timestamptz,
  last_test_status text,
  last_test_message text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_radar_api_configs TO authenticated;
GRANT ALL ON public.waouh_radar_api_configs TO service_role;

ALTER TABLE public.waouh_radar_api_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage radar api configs"
  ON public.waouh_radar_api_configs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Radar contacts
CREATE TABLE public.waouh_radar_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL UNIQUE,
  display_name text,
  source text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  signal_count integer NOT NULL DEFAULT 0,
  categories text[] NOT NULL DEFAULT '{}',
  cities text[] NOT NULL DEFAULT '{}',
  intent_buy_count integer NOT NULL DEFAULT 0,
  intent_sell_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','available','opted_in','opted_out','blocked')),
  auto_notify boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  last_message_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waouh_radar_contacts_status ON public.waouh_radar_contacts(status);
CREATE INDEX idx_waouh_radar_contacts_source ON public.waouh_radar_contacts(source);
CREATE INDEX idx_waouh_radar_contacts_last_seen ON public.waouh_radar_contacts(last_seen_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_radar_contacts TO authenticated;
GRANT ALL ON public.waouh_radar_contacts TO service_role;

ALTER TABLE public.waouh_radar_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage radar contacts"
  ON public.waouh_radar_contacts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waouh_radar_api_configs_updated_at ON public.waouh_radar_api_configs;
CREATE TRIGGER trg_waouh_radar_api_configs_updated_at
  BEFORE UPDATE ON public.waouh_radar_api_configs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_waouh_radar_contacts_updated_at ON public.waouh_radar_contacts;
CREATE TRIGGER trg_waouh_radar_contacts_updated_at
  BEFORE UPDATE ON public.waouh_radar_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Seed providers
INSERT INTO public.waouh_radar_api_configs (provider, active, daily_quota)
VALUES ('serpapi', false, 1000), ('apify', false, 500)
ON CONFLICT (provider) DO NOTHING;
