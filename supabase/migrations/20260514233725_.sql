
-- 1. Add origin tracking to articles
ALTER TABLE public.waouh_articles
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS origin_signal_id uuid;

ALTER TABLE public.waouh_buyer_profiles
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS origin_signal_id uuid;

ALTER TABLE public.waouh_external_listings
  ADD COLUMN IF NOT EXISTS promoted_article_id uuid REFERENCES public.waouh_articles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_user_id uuid REFERENCES public.waouh_users(id) ON DELETE SET NULL;

ALTER TABLE public.waouh_radar_profiles
  ADD COLUMN IF NOT EXISTS waouh_user_id uuid REFERENCES public.waouh_users(id) ON DELETE SET NULL;

ALTER TABLE public.waouh_radar_signals
  ADD COLUMN IF NOT EXISTS waouh_user_id uuid REFERENCES public.waouh_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_article_id uuid REFERENCES public.waouh_articles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_buyer_profile_id uuid REFERENCES public.waouh_buyer_profiles(id) ON DELETE SET NULL;

-- Add FK from origin_signal_id columns to radar_signals
DO $$ BEGIN
  ALTER TABLE public.waouh_articles
    ADD CONSTRAINT waouh_articles_origin_signal_fk
    FOREIGN KEY (origin_signal_id) REFERENCES public.waouh_radar_signals(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.waouh_buyer_profiles
    ADD CONSTRAINT waouh_buyer_profiles_origin_signal_fk
    FOREIGN KEY (origin_signal_id) REFERENCES public.waouh_radar_signals(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_waouh_articles_origin ON public.waouh_articles(origin);
CREATE INDEX IF NOT EXISTS idx_waouh_radar_signals_user ON public.waouh_radar_signals(waouh_user_id, status);
CREATE INDEX IF NOT EXISTS idx_waouh_radar_profiles_user ON public.waouh_radar_profiles(waouh_user_id);

-- 3. Trigger: link radar profile to waouh_users by phone
CREATE OR REPLACE FUNCTION public.waouh_radar_profile_link_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.contact_phone IS NULL OR NEW.contact_phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_user_id FROM public.waouh_users WHERE phone_number = NEW.contact_phone LIMIT 1;

  IF v_user_id IS NULL THEN
    INSERT INTO public.waouh_users (phone_number, display_name, city, source)
    VALUES (NEW.contact_phone, NEW.display_name, NULL, 'radar')
    ON CONFLICT (phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number
    RETURNING id INTO v_user_id;
  END IF;

  NEW.waouh_user_id := v_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waouh_radar_profile_link_user ON public.waouh_radar_profiles;
CREATE TRIGGER trg_waouh_radar_profile_link_user
  BEFORE INSERT OR UPDATE OF contact_phone ON public.waouh_radar_profiles
  FOR EACH ROW EXECUTE FUNCTION public.waouh_radar_profile_link_user();

-- 4. Trigger: propagate waouh_user_id from profile to signals
CREATE OR REPLACE FUNCTION public.waouh_radar_signal_link_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '' THEN
    SELECT waouh_user_id INTO v_user_id FROM public.waouh_radar_profiles WHERE contact_phone = NEW.contact_phone LIMIT 1;
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM public.waouh_users WHERE phone_number = NEW.contact_phone LIMIT 1;
    END IF;
    NEW.waouh_user_id := v_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waouh_radar_signal_link_user ON public.waouh_radar_signals;
CREATE TRIGGER trg_waouh_radar_signal_link_user
  BEFORE INSERT OR UPDATE OF contact_phone ON public.waouh_radar_signals
  FOR EACH ROW EXECUTE FUNCTION public.waouh_radar_signal_link_user();

-- 5. Unified views
CREATE OR REPLACE VIEW public.waouh_unified_offers AS
SELECT
  a.id::text AS id,
  'article'::text AS source_kind,
  a.origin AS origin,
  a.title,
  a.description,
  a.category,
  a.price,
  a.currency,
  a.city,
  a.condition,
  NULL::text AS contact_phone,
  a.seller_id AS waouh_user_id,
  a.status,
  a.created_at AS captured_at,
  NULL::text AS source_url,
  (a.photos)[1] AS image_url
FROM public.waouh_articles a
UNION ALL
SELECT
  s.id::text AS id,
  'radar_signal'::text AS source_kind,
  s.source_type AS origin,
  COALESCE(s.product->>'title', LEFT(s.raw_text, 120)) AS title,
  s.raw_text AS description,
  s.category,
  s.price,
  'XOF'::text AS currency,
  s.city,
  NULL::text AS condition,
  s.contact_phone,
  s.waouh_user_id,
  s.status,
  s.captured_at,
  s.raw_url,
  NULL::text AS image_url
FROM public.waouh_radar_signals s
WHERE s.intent = 'SELL' AND s.promoted_article_id IS NULL
UNION ALL
SELECT
  e.id::text AS id,
  'external_listing'::text AS source_kind,
  e.source AS origin,
  e.title,
  e.description,
  e.category,
  e.price,
  e.currency,
  e.city,
  e.condition,
  e.seller_phone AS contact_phone,
  e.seller_user_id AS waouh_user_id,
  e.status,
  e.scraped_at AS captured_at,
  e.source_url,
  e.image_url
FROM public.waouh_external_listings e
WHERE e.promoted_article_id IS NULL;

CREATE OR REPLACE VIEW public.waouh_unified_demands AS
SELECT
  bp.id::text AS id,
  'buyer_profile'::text AS source_kind,
  bp.origin AS origin,
  bp.query_text AS title,
  bp.category,
  bp.price_max,
  NULL::text AS city,
  bp.user_id AS waouh_user_id,
  NULL::text AS contact_phone,
  bp.is_active AS active,
  bp.created_at AS captured_at
FROM public.waouh_buyer_profiles bp
UNION ALL
SELECT
  s.id::text AS id,
  'radar_signal'::text AS source_kind,
  s.source_type AS origin,
  COALESCE(s.product->>'title', LEFT(s.raw_text, 120)) AS title,
  s.category,
  s.price AS price_max,
  s.city,
  s.waouh_user_id,
  s.contact_phone,
  (s.status <> 'ignored') AS active,
  s.captured_at
FROM public.waouh_radar_signals s
WHERE s.intent = 'BUY' AND s.promoted_buyer_profile_id IS NULL;

-- 6. Promote signal RPC (admin only)
CREATE OR REPLACE FUNCTION public.waouh_promote_signal(p_signal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal record;
  v_new_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_signal FROM public.waouh_radar_signals WHERE id = p_signal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'signal_not_found'; END IF;

  v_user_id := v_signal.waouh_user_id;
  IF v_user_id IS NULL AND v_signal.contact_phone IS NOT NULL THEN
    INSERT INTO public.waouh_users (phone_number, source)
    VALUES (v_signal.contact_phone, 'radar')
    ON CONFLICT (phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number
    RETURNING id INTO v_user_id;
  END IF;

  IF v_signal.intent = 'SELL' THEN
    INSERT INTO public.waouh_articles (
      seller_id, title, description, category, price, currency, city, status, origin, origin_signal_id
    ) VALUES (
      v_user_id,
      COALESCE(v_signal.product->>'title', LEFT(v_signal.raw_text, 120)),
      v_signal.raw_text,
      COALESCE(v_signal.category, 'autre'),
      COALESCE(v_signal.price, 0),
      'XOF',
      v_signal.city,
      'active',
      COALESCE(v_signal.source_type, 'radar'),
      v_signal.id
    ) RETURNING id INTO v_new_id;

    UPDATE public.waouh_radar_signals
      SET promoted_article_id = v_new_id, status = 'extracted'
      WHERE id = p_signal_id;

    RETURN jsonb_build_object('kind', 'article', 'id', v_new_id);
  ELSIF v_signal.intent = 'BUY' THEN
    INSERT INTO public.waouh_buyer_profiles (
      user_id, query_text, category, price_max, is_active, origin, origin_signal_id
    ) VALUES (
      v_user_id,
      COALESCE(v_signal.product->>'title', v_signal.raw_text),
      v_signal.category,
      v_signal.price,
      true,
      COALESCE(v_signal.source_type, 'radar'),
      v_signal.id
    ) RETURNING id INTO v_new_id;

    UPDATE public.waouh_radar_signals
      SET promoted_buyer_profile_id = v_new_id, status = 'extracted'
      WHERE id = p_signal_id;

    RETURN jsonb_build_object('kind', 'buyer_profile', 'id', v_new_id);
  ELSE
    RAISE EXCEPTION 'signal_intent_unsupported';
  END IF;
END;
$$;

-- 7. Match signal RPC
CREATE OR REPLACE FUNCTION public.waouh_match_signal(p_signal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal record;
  v_matches jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_signal FROM public.waouh_radar_signals WHERE id = p_signal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'signal_not_found'; END IF;

  IF v_signal.intent = 'SELL' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', bp.id, 'kind', 'buyer_profile', 'query', bp.query_text)), '[]'::jsonb)
      INTO v_matches
      FROM public.waouh_buyer_profiles bp
      WHERE bp.is_active
        AND (v_signal.category IS NULL OR bp.category = v_signal.category OR bp.category IS NULL)
        AND (v_signal.price IS NULL OR bp.price_max IS NULL OR v_signal.price <= bp.price_max)
      LIMIT 50;
  ELSIF v_signal.intent = 'BUY' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'kind', 'article', 'title', a.title, 'price', a.price)), '[]'::jsonb)
      INTO v_matches
      FROM public.waouh_articles a
      WHERE a.status = 'active'
        AND (v_signal.category IS NULL OR a.category = v_signal.category)
        AND (v_signal.price IS NULL OR a.price <= v_signal.price * 1.2)
      LIMIT 50;
  END IF;

  UPDATE public.waouh_radar_signals SET status = 'matched' WHERE id = p_signal_id AND status IN ('pending','extracted');

  RETURN jsonb_build_object('matches', v_matches, 'count', jsonb_array_length(v_matches));
END;
$$;

GRANT EXECUTE ON FUNCTION public.waouh_promote_signal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_match_signal(uuid) TO authenticated;
;
