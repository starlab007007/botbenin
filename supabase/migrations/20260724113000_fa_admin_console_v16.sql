-- FA IA V16 — administration complète des codes, usages et statistiques

ALTER TABLE public.fa_access_codes
  ADD COLUMN IF NOT EXISTS first_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exhausted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_device_id TEXT;

ALTER TABLE public.fa_consultations
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS quota_via TEXT,
  ADD COLUMN IF NOT EXISTS code_use_number INTEGER;

ALTER TABLE public.fa_settings
  ADD COLUMN IF NOT EXISTS gemini_model TEXT NOT NULL DEFAULT 'gemini-3.1-flash-lite',
  ADD COLUMN IF NOT EXISTS max_output_words INTEGER NOT NULL DEFAULT 300 CHECK (max_output_words BETWEEN 60 AND 800);

CREATE INDEX IF NOT EXISTS fa_codes_status_idx
  ON public.fa_access_codes(active, uses_count, max_uses, expires_at);
CREATE INDEX IF NOT EXISTS fa_consultations_provider_idx
  ON public.fa_consultations(provider, model, created_at DESC);

CREATE OR REPLACE FUNCTION public.fa_generate_codes(
  p_count INTEGER DEFAULT 1,
  p_max_uses INTEGER DEFAULT 3,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS SETOF public.fa_access_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := LEAST(GREATEST(COALESCE(p_count, 1), 1), 500);
  v_uses INTEGER := LEAST(GREATEST(COALESCE(p_max_uses, 3), 1), 100);
  v_code TEXT;
  v_created INTEGER := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;

  WHILE v_created < v_count LOOP
    v_code := LPAD((FLOOR(random() * 1000000))::INTEGER::TEXT, 6, '0');
    BEGIN
      INSERT INTO public.fa_access_codes(code, max_uses, expires_at, notes, created_by)
      VALUES (v_code, v_uses, p_expires_at, NULLIF(BTRIM(p_notes), ''), auth.uid());
      v_created := v_created + 1;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN QUERY
  SELECT * FROM public.fa_access_codes
  WHERE created_by = auth.uid()
  ORDER BY created_at DESC
  LIMIT v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fa_generate_codes(INTEGER, INTEGER, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fa_generate_codes(INTEGER, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated;

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
  v_next_use INTEGER;
BEGIN
  SELECT * INTO v_settings FROM public.fa_settings WHERE id = 1;

  IF p_code IS NOT NULL AND length(p_code) = 6 THEN
    SELECT * INTO v_code FROM public.fa_access_codes WHERE code = p_code FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'code_invalid');
    END IF;
    IF NOT v_code.active THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'code_inactive');
    END IF;
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
      UPDATE public.fa_access_codes SET active = false WHERE id = v_code.id;
      RETURN jsonb_build_object('allowed', false, 'reason', 'code_expired');
    END IF;
    IF v_code.uses_count >= v_code.max_uses THEN
      UPDATE public.fa_access_codes
      SET exhausted_at = COALESCE(exhausted_at, now()), active = false
      WHERE id = v_code.id;
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'code_exhausted',
        'uses_count', v_code.uses_count,
        'max_uses', v_code.max_uses,
        'renew_required', true
      );
    END IF;

    v_next_use := v_code.uses_count + 1;
    UPDATE public.fa_access_codes
    SET uses_count = v_next_use,
        first_used_at = COALESCE(first_used_at, now()),
        last_used_at = now(),
        last_device_id = LEFT(COALESCE(p_device_id, ''), 128),
        exhausted_at = CASE WHEN v_next_use >= max_uses THEN now() ELSE NULL END,
        active = CASE WHEN v_next_use >= max_uses THEN false ELSE active END
    WHERE id = v_code.id;

    RETURN jsonb_build_object(
      'allowed', true,
      'via', 'code',
      'code_id', v_code.id,
      'code_value', v_code.code,
      'uses_count', v_next_use,
      'max_uses', v_code.max_uses,
      'remaining', v_code.max_uses - v_next_use,
      'renew_required', v_next_use >= v_code.max_uses
    );
  END IF;

  SELECT COUNT(*) INTO v_free_used
  FROM public.fa_consultations
  WHERE consultation_day = v_today
    AND code_id IS NULL
    AND status = 'ok'
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_user_id IS NULL AND device_id = p_device_id)
    );

  IF v_free_used >= v_settings.free_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_quota_exceeded',
      'free_daily_limit', v_settings.free_daily_limit,
      'used', v_free_used,
      'retry_after', 'tomorrow'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'via', 'free',
    'used', v_free_used,
    'free_daily_limit', v_settings.free_daily_limit,
    'remaining', v_settings.free_daily_limit - v_free_used - 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fa_consume_quota(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fa_consume_quota(TEXT, UUID, TEXT) TO service_role;

CREATE OR REPLACE VIEW public.v_fa_code_status
WITH (security_invoker = on) AS
SELECT
  c.*,
  CASE
    WHEN c.expires_at IS NOT NULL AND c.expires_at < now() THEN 'expired'
    WHEN c.uses_count >= c.max_uses THEN 'exhausted'
    WHEN NOT c.active THEN 'inactive'
    WHEN c.uses_count > 0 THEN 'in_use'
    ELSE 'unused'
  END AS status,
  GREATEST(c.max_uses - c.uses_count, 0) AS remaining_uses,
  ROUND((c.uses_count::NUMERIC / NULLIF(c.max_uses, 0)) * 100, 1) AS usage_percent
FROM public.fa_access_codes c;

GRANT SELECT ON public.v_fa_code_status TO authenticated;

CREATE OR REPLACE VIEW public.v_fa_admin_stats
WITH (security_invoker = on) AS
SELECT
  COUNT(*) AS total_consultations,
  COUNT(*) FILTER (WHERE consultation_day = (now() AT TIME ZONE 'UTC')::date) AS today_consultations,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS week_consultations,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS month_consultations,
  COUNT(DISTINCT device_id) AS unique_devices,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
  COUNT(*) FILTER (WHERE code_id IS NULL) AS free_consultations,
  COUNT(*) FILTER (WHERE code_id IS NOT NULL) AS coded_consultations,
  COALESCE(SUM(tokens_in), 0) AS prompt_tokens,
  COALESCE(SUM(tokens_out), 0) AS output_tokens,
  COALESCE(SUM(tokens_in), 0) + COALESCE(SUM(tokens_out), 0) AS total_tokens,
  COUNT(*) FILTER (WHERE status <> 'ok') AS failed_consultations,
  MAX(created_at) AS last_consultation_at
FROM public.fa_consultations;

GRANT SELECT ON public.v_fa_admin_stats TO authenticated;
