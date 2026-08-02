
-- Table des codes d'accès 6 chiffres
CREATE TABLE public.fa_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[0-9]{6}$'),
  max_uses INTEGER NOT NULL DEFAULT 3 CHECK (max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX fa_access_codes_active_idx ON public.fa_access_codes(active, expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fa_access_codes TO authenticated;
GRANT ALL ON public.fa_access_codes TO service_role;
ALTER TABLE public.fa_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fa_codes_admin_all" ON public.fa_access_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table des consultations FA
CREATE TABLE public.fa_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES public.fa_access_codes(id) ON DELETE SET NULL,
  code_value TEXT,
  device_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sign_ref TEXT,
  sign_name TEXT,
  category TEXT,
  intention TEXT,
  question TEXT,
  answer TEXT,
  focus_key TEXT,
  ip_address INET,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consultation_day DATE GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED
);
CREATE INDEX fa_consultations_device_day_idx ON public.fa_consultations(device_id, consultation_day);
CREATE INDEX fa_consultations_user_day_idx ON public.fa_consultations(user_id, consultation_day);
CREATE INDEX fa_consultations_created_idx ON public.fa_consultations(created_at DESC);
CREATE INDEX fa_consultations_code_idx ON public.fa_consultations(code_id);

GRANT SELECT ON public.fa_consultations TO authenticated;
GRANT ALL ON public.fa_consultations TO service_role;
ALTER TABLE public.fa_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fa_consult_admin_read" ON public.fa_consultations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Table de configuration
CREATE TABLE public.fa_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  free_daily_limit INTEGER NOT NULL DEFAULT 1 CHECK (free_daily_limit >= 0),
  code_uses INTEGER NOT NULL DEFAULT 3 CHECK (code_uses > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.fa_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.fa_settings TO authenticated;
GRANT ALL ON public.fa_settings TO service_role;
ALTER TABLE public.fa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fa_settings_admin_all" ON public.fa_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at pour codes
CREATE OR REPLACE FUNCTION public.fa_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER fa_codes_touch BEFORE UPDATE ON public.fa_access_codes
  FOR EACH ROW EXECUTE FUNCTION public.fa_touch_updated_at();
CREATE TRIGGER fa_settings_touch BEFORE UPDATE ON public.fa_settings
  FOR EACH ROW EXECUTE FUNCTION public.fa_touch_updated_at();

-- Fonction d'attribution atomique d'un usage (côté service_role uniquement)
CREATE OR REPLACE FUNCTION public.fa_consume_quota(
  p_device_id TEXT,
  p_user_id UUID,
  p_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_code RECORD;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_free_used INTEGER;
BEGIN
  SELECT * INTO v_settings FROM public.fa_settings WHERE id = 1;

  -- Si un code est fourni : vérifier et incrémenter
  IF p_code IS NOT NULL AND length(p_code) = 6 THEN
    SELECT * INTO v_code FROM public.fa_access_codes
      WHERE code = p_code FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'code_invalid');
    END IF;
    IF NOT v_code.active THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'code_inactive');
    END IF;
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'code_expired');
    END IF;
    IF v_code.uses_count >= v_code.max_uses THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'code_exhausted',
        'uses_count', v_code.uses_count, 'max_uses', v_code.max_uses);
    END IF;

    UPDATE public.fa_access_codes
      SET uses_count = uses_count + 1
      WHERE id = v_code.id;

    RETURN jsonb_build_object(
      'allowed', true, 'via', 'code',
      'code_id', v_code.id, 'code_value', v_code.code,
      'uses_count', v_code.uses_count + 1, 'max_uses', v_code.max_uses,
      'remaining', v_code.max_uses - (v_code.uses_count + 1)
    );
  END IF;

  -- Pas de code : vérifier quota quotidien
  SELECT COUNT(*) INTO v_free_used
    FROM public.fa_consultations
    WHERE consultation_day = v_today
      AND code_id IS NULL
      AND (
        (p_user_id IS NOT NULL AND user_id = p_user_id)
        OR (p_user_id IS NULL AND device_id = p_device_id)
      );

  IF v_free_used >= v_settings.free_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'daily_quota_exceeded',
      'free_daily_limit', v_settings.free_daily_limit,
      'used', v_free_used
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true, 'via', 'free',
    'used', v_free_used, 'free_daily_limit', v_settings.free_daily_limit,
    'remaining', v_settings.free_daily_limit - v_free_used - 1
  );
END; $$;

REVOKE ALL ON FUNCTION public.fa_consume_quota(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fa_consume_quota(TEXT, UUID, TEXT) TO service_role;

-- Vue KPI admin
CREATE OR REPLACE VIEW public.v_fa_kpis
WITH (security_invoker = on) AS
SELECT
  (SELECT COUNT(*) FROM public.fa_consultations) AS total_consultations,
  (SELECT COUNT(*) FROM public.fa_consultations WHERE consultation_day = (now() AT TIME ZONE 'UTC')::date) AS today_consultations,
  (SELECT COUNT(*) FROM public.fa_consultations WHERE created_at > now() - interval '7 days') AS week_consultations,
  (SELECT COUNT(DISTINCT device_id) FROM public.fa_consultations) AS unique_devices,
  (SELECT COUNT(DISTINCT user_id) FROM public.fa_consultations WHERE user_id IS NOT NULL) AS unique_users,
  (SELECT COUNT(*) FROM public.fa_consultations WHERE code_id IS NOT NULL) AS consultations_with_code,
  (SELECT COUNT(*) FROM public.fa_consultations WHERE code_id IS NULL) AS consultations_free,
  (SELECT COUNT(*) FROM public.fa_access_codes WHERE active = true AND uses_count < max_uses AND (expires_at IS NULL OR expires_at > now())) AS codes_active,
  (SELECT COUNT(*) FROM public.fa_access_codes WHERE uses_count >= max_uses) AS codes_exhausted,
  (SELECT COUNT(*) FROM public.fa_access_codes WHERE expires_at IS NOT NULL AND expires_at < now()) AS codes_expired,
  (SELECT COUNT(*) FROM public.fa_access_codes) AS codes_total;

GRANT SELECT ON public.v_fa_kpis TO authenticated;
;
