
CREATE TYPE public.waouh_catalog_source AS ENUM ('partner','chat','radar');
CREATE TYPE public.waouh_catalog_type AS ENUM ('offer','demand');

CREATE TABLE public.waouh_unified_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.waouh_catalog_source NOT NULL,
  source_ref_id UUID NOT NULL,
  type public.waouh_catalog_type NOT NULL DEFAULT 'offer',
  titre TEXT NOT NULL,
  description TEXT,
  categorie TEXT, sous_categorie TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  prix_min NUMERIC, prix_max NUMERIC, devise TEXT DEFAULT 'XOF',
  ville TEXT, quartier TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, geohash TEXT,
  vendeur_nom TEXT, vendeur_phone TEXT, vendeur_whatsapp TEXT, vendeur_mobile_money TEXT,
  partner_id UUID, business_id UUID,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  qualite_score INTEGER NOT NULL DEFAULT 50 CHECK (qualite_score BETWEEN 0 AND 100),
  priority_rank SMALLINT NOT NULL DEFAULT 3 CHECK (priority_rank BETWEEN 1 AND 3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_ref_id)
);
CREATE INDEX idx_wuc_priority ON public.waouh_unified_catalog(priority_rank, qualite_score DESC);
CREATE INDEX idx_wuc_categorie ON public.waouh_unified_catalog(categorie);
CREATE INDEX idx_wuc_ville ON public.waouh_unified_catalog(ville);
CREATE INDEX idx_wuc_tags ON public.waouh_unified_catalog USING GIN(tags);
CREATE INDEX idx_wuc_geohash ON public.waouh_unified_catalog(geohash);
CREATE INDEX idx_wuc_active ON public.waouh_unified_catalog(is_active) WHERE is_active = true;
CREATE INDEX idx_wuc_search ON public.waouh_unified_catalog USING GIN (to_tsvector('french', coalesce(titre,'') || ' ' || coalesce(description,'')));
CREATE TRIGGER trg_wuc_updated BEFORE UPDATE ON public.waouh_unified_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.waouh_unified_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active catalog" ON public.waouh_unified_catalog FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manage catalog" ON public.waouh_unified_catalog FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.sync_partner_product_to_catalog()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE biz public.waouh_partner_businesses%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.waouh_unified_catalog WHERE source='partner' AND source_ref_id = OLD.id;
    RETURN OLD;
  END IF;
  SELECT * INTO biz FROM public.waouh_partner_businesses WHERE id = NEW.business_id;
  INSERT INTO public.waouh_unified_catalog (
    source, source_ref_id, type, titre, description, categorie, tags,
    prix_min, prix_max, devise, ville, quartier, lat, lng, geohash,
    vendeur_nom, vendeur_phone, vendeur_whatsapp, vendeur_mobile_money,
    partner_id, business_id, photos, qualite_score, priority_rank,
    is_active, verified, raw_payload
  ) VALUES (
    'partner', NEW.id, 'offer', NEW.nom, NEW.description, NEW.categorie, NEW.tags,
    NEW.prix_min, NEW.prix_max, NEW.devise, biz.ville, biz.quartier, biz.lat, biz.lng, biz.geohash,
    biz.nom_entreprise, biz.telephone, biz.whatsapp, biz.mobile_money_number,
    NEW.partner_id, NEW.business_id, NEW.photos,
    CASE WHEN biz.verifie_admin THEN 95 ELSE 85 END, 1,
    NEW.disponible AND biz.statut = 'active', biz.verifie_admin,
    jsonb_build_object('product', to_jsonb(NEW), 'business', to_jsonb(biz))
  )
  ON CONFLICT (source, source_ref_id) DO UPDATE SET
    titre=EXCLUDED.titre, description=EXCLUDED.description, categorie=EXCLUDED.categorie, tags=EXCLUDED.tags,
    prix_min=EXCLUDED.prix_min, prix_max=EXCLUDED.prix_max,
    ville=EXCLUDED.ville, quartier=EXCLUDED.quartier, lat=EXCLUDED.lat, lng=EXCLUDED.lng, geohash=EXCLUDED.geohash,
    vendeur_nom=EXCLUDED.vendeur_nom, vendeur_phone=EXCLUDED.vendeur_phone, vendeur_whatsapp=EXCLUDED.vendeur_whatsapp,
    vendeur_mobile_money=EXCLUDED.vendeur_mobile_money, photos=EXCLUDED.photos,
    qualite_score=EXCLUDED.qualite_score, is_active=EXCLUDED.is_active, verified=EXCLUDED.verified,
    raw_payload=EXCLUDED.raw_payload, last_seen_at=now();
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_sync_partner_product AFTER INSERT OR UPDATE OR DELETE ON public.waouh_partner_products
  FOR EACH ROW EXECUTE FUNCTION public.sync_partner_product_to_catalog();

CREATE OR REPLACE FUNCTION public.sync_chat_article_to_catalog()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE seller_phone TEXT; seller_name TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.waouh_unified_catalog WHERE source='chat' AND source_ref_id = OLD.id;
    RETURN OLD;
  END IF;
  SELECT phone_number, display_name INTO seller_phone, seller_name FROM public.waouh_users WHERE id = NEW.seller_id;
  INSERT INTO public.waouh_unified_catalog (
    source, source_ref_id, type, titre, description, categorie,
    prix_min, prix_max, devise, ville, vendeur_nom, vendeur_phone, vendeur_whatsapp,
    photos, qualite_score, priority_rank, is_active, expires_at, raw_payload
  ) VALUES (
    'chat', NEW.id, 'offer', NEW.title, NEW.description, NEW.category,
    NEW.price, NEW.price, COALESCE(NEW.currency,'XOF'), NEW.city,
    seller_name, seller_phone, seller_phone,
    NEW.photos, 70, 2, NEW.status = 'active', NEW.expires_at, to_jsonb(NEW)
  )
  ON CONFLICT (source, source_ref_id) DO UPDATE SET
    titre=EXCLUDED.titre, description=EXCLUDED.description, categorie=EXCLUDED.categorie,
    prix_min=EXCLUDED.prix_min, prix_max=EXCLUDED.prix_max, ville=EXCLUDED.ville,
    vendeur_nom=EXCLUDED.vendeur_nom, vendeur_phone=EXCLUDED.vendeur_phone, vendeur_whatsapp=EXCLUDED.vendeur_whatsapp,
    photos=EXCLUDED.photos, is_active=EXCLUDED.is_active, expires_at=EXCLUDED.expires_at,
    raw_payload=EXCLUDED.raw_payload, last_seen_at=now();
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_sync_chat_article AFTER INSERT OR UPDATE OR DELETE ON public.waouh_articles
  FOR EACH ROW EXECUTE FUNCTION public.sync_chat_article_to_catalog();

CREATE OR REPLACE FUNCTION public.sync_radar_listing_to_catalog()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.waouh_unified_catalog WHERE source='radar' AND source_ref_id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO public.waouh_unified_catalog (
    source, source_ref_id, type, titre, description, categorie,
    prix_min, prix_max, devise, ville, vendeur_nom, vendeur_phone, vendeur_whatsapp,
    photos, qualite_score, priority_rank, is_active, raw_payload
  ) VALUES (
    'radar', NEW.id, 'offer', NEW.title, NEW.description, NEW.category,
    NEW.price, NEW.price, COALESCE(NEW.currency,'XOF'), NEW.city,
    NEW.seller_name, NEW.seller_phone, NEW.seller_phone,
    CASE WHEN NEW.image_url IS NOT NULL THEN ARRAY[NEW.image_url] ELSE ARRAY[]::TEXT[] END,
    50, 3, COALESCE(NEW.status,'active') = 'active', to_jsonb(NEW)
  )
  ON CONFLICT (source, source_ref_id) DO UPDATE SET
    titre=EXCLUDED.titre, description=EXCLUDED.description, categorie=EXCLUDED.categorie,
    prix_min=EXCLUDED.prix_min, prix_max=EXCLUDED.prix_max, ville=EXCLUDED.ville,
    vendeur_nom=EXCLUDED.vendeur_nom, vendeur_phone=EXCLUDED.vendeur_phone,
    is_active=EXCLUDED.is_active, raw_payload=EXCLUDED.raw_payload, last_seen_at=now();
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_sync_radar_listing AFTER INSERT OR UPDATE OR DELETE ON public.waouh_external_listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_radar_listing_to_catalog();

CREATE OR REPLACE FUNCTION public.waouh_search_unified(
  q TEXT DEFAULT NULL, in_ville TEXT DEFAULT NULL, in_categorie TEXT DEFAULT NULL,
  in_lat DOUBLE PRECISION DEFAULT NULL, in_lng DOUBLE PRECISION DEFAULT NULL,
  radius_km NUMERIC DEFAULT NULL, max_results INT DEFAULT 20
) RETURNS TABLE(
  id UUID, source public.waouh_catalog_source, titre TEXT, description TEXT, categorie TEXT,
  prix_min NUMERIC, prix_max NUMERIC, devise TEXT, ville TEXT, quartier TEXT,
  vendeur_nom TEXT, vendeur_phone TEXT, vendeur_whatsapp TEXT,
  photos TEXT[], qualite_score INTEGER, priority_rank SMALLINT,
  distance_km NUMERIC, partner_id UUID, business_id UUID
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT c.id, c.source, c.titre, c.description, c.categorie,
    c.prix_min, c.prix_max, c.devise, c.ville, c.quartier,
    c.vendeur_nom, c.vendeur_phone, c.vendeur_whatsapp,
    c.photos, c.qualite_score, c.priority_rank,
    CASE WHEN in_lat IS NOT NULL AND in_lng IS NOT NULL AND c.lat IS NOT NULL AND c.lng IS NOT NULL THEN
      ROUND((6371 * acos(
        LEAST(1, cos(radians(in_lat)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians(in_lng))
        + sin(radians(in_lat)) * sin(radians(c.lat)))
      ))::numeric, 2)
    ELSE NULL END AS distance_km,
    c.partner_id, c.business_id
  FROM public.waouh_unified_catalog c
  WHERE c.is_active = true
    AND (q IS NULL OR to_tsvector('french', coalesce(c.titre,'') || ' ' || coalesce(c.description,'')) @@ plainto_tsquery('french', q)
         OR c.titre ILIKE '%' || q || '%')
    AND (in_ville IS NULL OR c.ville ILIKE '%' || in_ville || '%')
    AND (in_categorie IS NULL OR c.categorie ILIKE '%' || in_categorie || '%')
    AND (
      radius_km IS NULL OR in_lat IS NULL OR in_lng IS NULL OR c.lat IS NULL OR c.lng IS NULL
      OR (6371 * acos(
        LEAST(1, cos(radians(in_lat)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians(in_lng))
        + sin(radians(in_lat)) * sin(radians(c.lat)))
      )) <= radius_km
    )
  ORDER BY c.priority_rank ASC, c.qualite_score DESC,
    (CASE WHEN in_lat IS NOT NULL AND c.lat IS NOT NULL THEN
      6371 * acos(LEAST(1, cos(radians(in_lat)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians(in_lng))
        + sin(radians(in_lat)) * sin(radians(c.lat))))
    ELSE 999999 END) ASC
  LIMIT max_results;
$$;

-- Backfill
INSERT INTO public.waouh_unified_catalog (source, source_ref_id, type, titre, description, categorie, prix_min, prix_max, devise, ville, vendeur_nom, vendeur_phone, vendeur_whatsapp, photos, qualite_score, priority_rank, is_active, expires_at, raw_payload)
SELECT 'chat', a.id, 'offer', a.title, a.description, a.category, a.price, a.price, COALESCE(a.currency,'XOF'), a.city, u.display_name, u.phone_number, u.phone_number, a.photos, 70, 2, a.status='active', a.expires_at, to_jsonb(a)
FROM public.waouh_articles a
LEFT JOIN public.waouh_users u ON u.id = a.seller_id
ON CONFLICT (source, source_ref_id) DO NOTHING;

INSERT INTO public.waouh_unified_catalog (source, source_ref_id, type, titre, description, categorie, prix_min, prix_max, devise, ville, vendeur_nom, vendeur_phone, vendeur_whatsapp, photos, qualite_score, priority_rank, is_active, raw_payload)
SELECT 'radar', l.id, 'offer', l.title, l.description, l.category, l.price, l.price, COALESCE(l.currency,'XOF'), l.city, l.seller_name, l.seller_phone, l.seller_phone,
  CASE WHEN l.image_url IS NOT NULL THEN ARRAY[l.image_url] ELSE ARRAY[]::TEXT[] END,
  50, 3, COALESCE(l.status,'active')='active', to_jsonb(l)
FROM public.waouh_external_listings l
ON CONFLICT (source, source_ref_id) DO NOTHING;
;
