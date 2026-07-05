
-- ============ 1. BI / Analytics Agent ============
CREATE TABLE public.waouh_bi_datasources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_sheet','excel','csv','json_url')),
  source_url TEXT,
  storage_path TEXT,
  schema JSONB DEFAULT '{}'::jsonb,
  sample_rows JSONB DEFAULT '[]'::jsonb,
  row_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_bi_datasources TO authenticated;
GRANT ALL ON public.waouh_bi_datasources TO service_role;
ALTER TABLE public.waouh_bi_datasources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_ds_own" ON public.waouh_bi_datasources FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.waouh_bi_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datasource_id UUID NOT NULL REFERENCES public.waouh_bi_datasources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  spec JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_bi_queries TO authenticated;
GRANT ALL ON public.waouh_bi_queries TO service_role;
ALTER TABLE public.waouh_bi_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_q_own" ON public.waouh_bi_queries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ 2. Stock Agent ============
CREATE TABLE public.waouh_stock_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_name TEXT,
  currency TEXT DEFAULT 'FCFA',
  alert_msisdn TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_stock_agents TO authenticated;
GRANT ALL ON public.waouh_stock_agents TO service_role;
ALTER TABLE public.waouh_stock_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_ag_own" ON public.waouh_stock_agents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.waouh_stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.waouh_stock_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  threshold_low NUMERIC DEFAULT 5,
  unit_price_fcfa NUMERIC DEFAULT 0,
  cost_price_fcfa NUMERIC DEFAULT 0,
  supplier TEXT,
  last_alerted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_stock_items TO authenticated;
GRANT ALL ON public.waouh_stock_items TO service_role;
ALTER TABLE public.waouh_stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_it_own" ON public.waouh_stock_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_stock_items_agent ON public.waouh_stock_items(agent_id);

CREATE TABLE public.waouh_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.waouh_stock_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjust')),
  quantity NUMERIC NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_stock_movements TO authenticated;
GRANT ALL ON public.waouh_stock_movements TO service_role;
ALTER TABLE public.waouh_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_mv_own" ON public.waouh_stock_movements FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_stock_mv_item ON public.waouh_stock_movements(item_id);

-- ============ 3. Attendance QR Agent ============
CREATE TABLE public.waouh_attendance_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 50,
  employer_msisdn TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_attendance_sites TO authenticated;
GRANT SELECT ON public.waouh_attendance_sites TO anon;
GRANT ALL ON public.waouh_attendance_sites TO service_role;
ALTER TABLE public.waouh_attendance_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_site_own_write" ON public.waouh_attendance_sites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "att_site_public_read_by_token" ON public.waouh_attendance_sites FOR SELECT TO anon
  USING (active = true);

CREATE TABLE public.waouh_attendance_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.waouh_attendance_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  msisdn TEXT NOT NULL,
  msisdn_last4 TEXT GENERATED ALWAYS AS (RIGHT(regexp_replace(msisdn, '\D', '', 'g'), 4)) STORED,
  employee_code TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_attendance_employees TO authenticated;
GRANT SELECT ON public.waouh_attendance_employees TO anon;
GRANT ALL ON public.waouh_attendance_employees TO service_role;
ALTER TABLE public.waouh_attendance_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_emp_own" ON public.waouh_attendance_employees FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "att_emp_public_read" ON public.waouh_attendance_employees FOR SELECT TO anon
  USING (active = true);

CREATE TABLE public.waouh_attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.waouh_attendance_sites(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.waouh_attendance_employees(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('arrival','break_start','break_end','departure')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_m NUMERIC,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.waouh_attendance_events TO authenticated;
GRANT ALL ON public.waouh_attendance_events TO service_role;
ALTER TABLE public.waouh_attendance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_ev_owner_read" ON public.waouh_attendance_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.waouh_attendance_sites s WHERE s.id = site_id AND s.user_id = auth.uid()));
CREATE INDEX idx_att_ev_site ON public.waouh_attendance_events(site_id, created_at DESC);

-- updated_at triggers (reuse existing function if present)
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER tg_bi_ds_upd BEFORE UPDATE ON public.waouh_bi_datasources FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_stock_ag_upd BEFORE UPDATE ON public.waouh_stock_agents FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_stock_it_upd BEFORE UPDATE ON public.waouh_stock_items FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_att_site_upd BEFORE UPDATE ON public.waouh_attendance_sites FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
