
-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 2. PHONE NORMALIZATION (Bénin E.164)
-- ============================================================
CREATE OR REPLACE FUNCTION public.normalize_benin_phone(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
BEGIN
  IF raw IS NULL THEN RETURN NULL; END IF;
  digits := regexp_replace(raw, '[^0-9]', '', 'g');
  IF digits = '' THEN RETURN NULL; END IF;

  -- 8 digits → legacy local, prefix 22901
  IF length(digits) = 8 THEN
    RETURN '+22901' || digits;
  END IF;

  -- 10 digits starting with 01 → modern local, prefix 229
  IF length(digits) = 10 AND left(digits,2) = '01' THEN
    RETURN '+229' || digits;
  END IF;

  -- 11 digits 229 + 8 → insert 01 after country code
  IF length(digits) = 11 AND left(digits,3) = '229' THEN
    RETURN '+22901' || substring(digits from 4);
  END IF;

  -- 13 digits 229 + 10 (already modern) → keep
  IF length(digits) = 13 AND left(digits,3) = '229' THEN
    RETURN '+' || digits;
  END IF;

  -- 12 digits 229 + 9 → uncommon; preserve with +
  IF length(digits) >= 11 AND left(digits,3) = '229' THEN
    RETURN '+' || digits;
  END IF;

  -- Fallback: invalid for Bénin
  RETURN NULL;
END;
$$;

-- ============================================================
-- 3. ADD NORMALIZED COLUMN TO RADAR CONTACTS
-- ============================================================
ALTER TABLE public.waouh_radar_contacts
  ADD COLUMN IF NOT EXISTS phone_e164_normalized text;

CREATE OR REPLACE FUNCTION public.waouh_radar_contacts_normalize_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.phone_e164_normalized := public.normalize_benin_phone(NEW.phone_e164);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waouh_radar_contacts_normalize ON public.waouh_radar_contacts;
CREATE TRIGGER trg_waouh_radar_contacts_normalize
  BEFORE INSERT OR UPDATE OF phone_e164 ON public.waouh_radar_contacts
  FOR EACH ROW EXECUTE FUNCTION public.waouh_radar_contacts_normalize_trg();

-- Backfill
UPDATE public.waouh_radar_contacts
SET phone_e164_normalized = public.normalize_benin_phone(phone_e164)
WHERE phone_e164_normalized IS NULL OR phone_e164_normalized = '';

CREATE INDEX IF NOT EXISTS idx_radar_contacts_normalized
  ON public.waouh_radar_contacts(phone_e164_normalized);

-- ============================================================
-- 4. DEDUP HELPER (non-destructive — admin runs explicitly)
-- ============================================================
CREATE OR REPLACE FUNCTION public.merge_radar_contacts_duplicates()
RETURNS TABLE(merged_phone text, merged_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  keep_id uuid;
  cnt int;
BEGIN
  FOR r IN
    SELECT phone_e164_normalized, COUNT(*) AS c
    FROM public.waouh_radar_contacts
    WHERE phone_e164_normalized IS NOT NULL
    GROUP BY phone_e164_normalized
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM public.waouh_radar_contacts
    WHERE phone_e164_normalized = r.phone_e164_normalized
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE public.waouh_radar_contacts keep SET
      signal_count = (SELECT SUM(signal_count) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      intent_buy_count = (SELECT SUM(intent_buy_count) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      intent_sell_count = (SELECT SUM(intent_sell_count) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      categories = (SELECT ARRAY(SELECT DISTINCT unnest(array_agg(c)) FROM (SELECT unnest(categories) AS c FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized) s)),
      cities = (SELECT ARRAY(SELECT DISTINCT unnest(array_agg(c)) FROM (SELECT unnest(cities) AS c FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized) s)),
      first_seen_at = (SELECT MIN(first_seen_at) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      last_seen_at = (SELECT MAX(last_seen_at) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      status = CASE
        WHEN EXISTS(SELECT 1 FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized AND status='opted_out') THEN 'opted_out'
        WHEN EXISTS(SELECT 1 FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized AND status='blocked') THEN 'blocked'
        WHEN EXISTS(SELECT 1 FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized AND status='opted_in') THEN 'opted_in'
        ELSE 'new'
      END,
      phone_e164 = r.phone_e164_normalized
    WHERE keep.id = keep_id;

    DELETE FROM public.waouh_radar_contacts
    WHERE phone_e164_normalized = r.phone_e164_normalized
      AND id <> keep_id
    RETURNING 1 INTO cnt;

    GET DIAGNOSTICS cnt = ROW_COUNT;
    merged_phone := r.phone_e164_normalized;
    merged_count := cnt;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================================
-- 5. CAMPAIGNS TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waouh_radar_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'announcement' CHECK (mode IN ('announcement','search','notice','reminder')),
  message_template text NOT NULL,
  article_id uuid,
  media_url text,
  segment jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule jsonb NOT NULL DEFAULT '{"type":"one_shot"}'::jsonb,
  rate_limit_per_hour int NOT NULL DEFAULT 60,
  max_per_contact_per_week int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','done')),
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_radar_campaigns TO authenticated;
GRANT ALL ON public.waouh_radar_campaigns TO service_role;
ALTER TABLE public.waouh_radar_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage radar campaigns"
  ON public.waouh_radar_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_radar_campaigns_status_next ON public.waouh_radar_campaigns(status, next_run_at);

CREATE TABLE IF NOT EXISTS public.waouh_radar_campaign_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.waouh_radar_campaigns(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  contacts_targeted int NOT NULL DEFAULT 0,
  contacts_sent int NOT NULL DEFAULT 0,
  contacts_skipped int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_radar_campaign_runs TO authenticated;
GRANT ALL ON public.waouh_radar_campaign_runs TO service_role;
ALTER TABLE public.waouh_radar_campaign_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read radar campaign runs"
  ON public.waouh_radar_campaign_runs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_radar_runs_campaign ON public.waouh_radar_campaign_runs(campaign_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.waouh_radar_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.waouh_radar_campaigns(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.waouh_radar_campaign_runs(id) ON DELETE SET NULL,
  contact_id uuid NOT NULL REFERENCES public.waouh_radar_contacts(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','replied','failed','opted_out')),
  outbound_queue_id uuid,
  sent_at timestamptz,
  response_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_radar_campaign_sends TO authenticated;
GRANT ALL ON public.waouh_radar_campaign_sends TO service_role;
ALTER TABLE public.waouh_radar_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read radar campaign sends"
  ON public.waouh_radar_campaign_sends FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_radar_sends_campaign_contact ON public.waouh_radar_campaign_sends(campaign_id, contact_id, created_at DESC);
CREATE INDEX idx_radar_sends_contact_recent ON public.waouh_radar_campaign_sends(contact_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_radar_campaigns_touch ON public.waouh_radar_campaigns;
CREATE TRIGGER trg_radar_campaigns_touch
  BEFORE UPDATE ON public.waouh_radar_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
;
