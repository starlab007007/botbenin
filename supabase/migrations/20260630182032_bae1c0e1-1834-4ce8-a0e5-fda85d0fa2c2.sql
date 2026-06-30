
-- 1. Vue audience unifiée
CREATE OR REPLACE VIEW public.v_diffusion_audience AS
WITH base AS (
  -- Radar contacts
  SELECT
    phone_e164_normalized AS phone_e164,
    display_name,
    ARRAY['radar']::text[] AS sources,
    COALESCE(categories[1], '') AS raw_category,
    COALESCE(cities[1], '') AS ville,
    GREATEST(COALESCE(intent_buy_count,0), COALESCE(intent_sell_count,0)) AS intent_raw,
    last_seen_at,
    opt_out_flag,
    is_whatsapp_flag,
    metadata
  FROM (
    SELECT
      phone_e164_normalized, display_name, categories, cities,
      intent_buy_count, intent_sell_count, last_seen_at, metadata,
      (status = 'opted_out') AS opt_out_flag,
      true AS is_whatsapp_flag
    FROM public.waouh_radar_contacts
    WHERE phone_e164_normalized IS NOT NULL
  ) r

  UNION ALL

  -- Signals avec contact_phone
  SELECT
    contact_phone AS phone_e164,
    NULL AS display_name,
    ARRAY['signal']::text[] AS sources,
    COALESCE(category, '') AS raw_category,
    COALESCE(city, '') AS ville,
    CASE WHEN intent IN ('BUY','SELL') THEN 60 ELSE 30 END AS intent_raw,
    captured_at AS last_seen_at,
    false AS opt_out_flag,
    true AS is_whatsapp_flag,
    raw_payload AS metadata
  FROM public.waouh_radar_signals
  WHERE contact_phone IS NOT NULL

  UNION ALL

  -- Catalogue unifié
  SELECT
    vendeur_whatsapp AS phone_e164,
    vendeur_nom AS display_name,
    ARRAY['catalog']::text[] AS sources,
    COALESCE(categorie, '') AS raw_category,
    COALESCE(ville, '') AS ville,
    50 AS intent_raw,
    last_seen_at,
    false AS opt_out_flag,
    true AS is_whatsapp_flag,
    raw_payload AS metadata
  FROM public.waouh_unified_catalog
  WHERE vendeur_whatsapp IS NOT NULL AND is_active = true

  UNION ALL

  -- wa_contacts
  SELECT
    phone_e164, display_name,
    ARRAY['wa_contact']::text[] AS sources,
    '' AS raw_category,
    '' AS ville,
    20 AS intent_raw,
    last_validated_at AS last_seen_at,
    opt_out AS opt_out_flag,
    is_whatsapp AS is_whatsapp_flag,
    NULL::jsonb AS metadata
  FROM public.wa_contacts
  WHERE phone_e164 IS NOT NULL AND archived = false
),
agg AS (
  SELECT
    phone_e164,
    MAX(display_name) AS display_name,
    array_agg(DISTINCT s ORDER BY s) AS sources,
    MAX(raw_category) AS raw_category,
    MAX(ville) AS ville,
    MAX(intent_raw) AS intent_score_raw,
    MAX(last_seen_at) AS last_seen_at,
    bool_or(opt_out_flag) AS opt_out,
    bool_and(is_whatsapp_flag) AS is_whatsapp
  FROM base, unnest(sources) AS s
  GROUP BY phone_e164
)
SELECT
  phone_e164,
  display_name,
  sources,
  raw_category AS sous_categorie,
  CASE
    WHEN raw_category ILIKE ANY (ARRAY['%mode%','%beauté%','%beaute%','%vêtement%','%vetement%','%cosmé%','%bijou%','%chaussure%']) THEN 'Mode & Beauté'
    WHEN raw_category ILIKE ANY (ARRAY['%tech%','%phone%','%ordinateur%','%électroni%','%electroni%','%informatique%']) THEN 'Tech & Électronique'
    WHEN raw_category ILIKE ANY (ARRAY['%auto%','%voiture%','%moto%','%pièce%','%piece%']) THEN 'Auto & Moto'
    WHEN raw_category ILIKE ANY (ARRAY['%immo%','%maison%','%terrain%','%appartement%','%location%']) THEN 'Immobilier'
    WHEN raw_category ILIKE ANY (ARRAY['%alim%','%food%','%restau%','%boisson%','%épicer%','%epicer%']) THEN 'Alimentaire'
    WHEN raw_category ILIKE ANY (ARRAY['%service%','%coiffeur%','%plomb%','%électricien%','%transport%']) THEN 'Services'
    ELSE 'Autre'
  END AS secteur,
  ville,
  COALESCE(intent_score_raw, 0) AS intent_score,
  GREATEST(0, EXTRACT(DAY FROM (now() - COALESCE(last_seen_at, now() - interval '999 days')))::int) AS freshness_days,
  CASE
    WHEN last_seen_at >= now() - interval '7 days' AND COALESCE(intent_score_raw,0) >= 60 THEN 'A'
    WHEN last_seen_at >= now() - interval '30 days' AND COALESCE(intent_score_raw,0) >= 30 THEN 'B'
    WHEN last_seen_at >= now() - interval '90 days' THEN 'C'
    ELSE 'D'
  END AS classe,
  (
    CASE WHEN phone_e164 ~ '^\+?[0-9]{8,15}$' THEN 30 ELSE 0 END
    + CASE WHEN display_name IS NOT NULL AND length(display_name) > 1 THEN 25 ELSE 0 END
    + CASE WHEN raw_category <> '' THEN 25 ELSE 0 END
    + CASE WHEN ville <> '' THEN 20 ELSE 0 END
  ) AS qualite_score,
  opt_out,
  is_whatsapp,
  last_seen_at
FROM agg;

GRANT SELECT ON public.v_diffusion_audience TO authenticated;
GRANT SELECT ON public.v_diffusion_audience TO service_role;

-- 2. Table approvals
CREATE TABLE IF NOT EXISTS public.waouh_diffusion_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.waouh_radar_campaigns(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  audience_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  message_template text NOT NULL,
  media_url text,
  quota_requested int NOT NULL DEFAULT 100,
  quota_approved int,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.waouh_diffusion_approvals TO authenticated;
GRANT ALL ON public.waouh_diffusion_approvals TO service_role;

ALTER TABLE public.waouh_diffusion_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creators view own approvals"
  ON public.waouh_diffusion_approvals FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "creators insert own approvals"
  ON public.waouh_diffusion_approvals FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "creators cancel pending"
  ON public.waouh_diffusion_approvals FOR UPDATE TO authenticated
  USING (
    (requested_by = auth.uid() AND status = 'pending')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_diffusion_approvals_status ON public.waouh_diffusion_approvals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diffusion_approvals_requester ON public.waouh_diffusion_approvals(requested_by, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_diffusion_approvals_upd ON public.waouh_diffusion_approvals;
CREATE TRIGGER trg_diffusion_approvals_upd
  BEFORE UPDATE ON public.waouh_diffusion_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Colonnes sur campaigns
ALTER TABLE public.waouh_radar_campaigns
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_id uuid REFERENCES public.waouh_diffusion_approvals(id),
  ADD COLUMN IF NOT EXISTS quota_approved int,
  ADD COLUMN IF NOT EXISTS quota_consumed int NOT NULL DEFAULT 0;
