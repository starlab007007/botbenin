-- Radar needs coordinates to rank nearby opportunities precisely.
-- Older chat/radar rows were synchronized without lat/lng even when the article
-- or seller profile already contained a PostGIS location.

CREATE OR REPLACE FUNCTION public.sync_chat_article_to_catalog()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_phone TEXT;
  seller_name TEXT;
  seller_city TEXT;
  seller_location GEOGRAPHY(POINT, 4326);
  resolved_location GEOGRAPHY(POINT, 4326);
  resolved_lat DOUBLE PRECISION;
  resolved_lng DOUBLE PRECISION;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.waouh_unified_catalog
    WHERE source = 'chat' AND source_ref_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT phone_number, display_name, city, location
  INTO seller_phone, seller_name, seller_city, seller_location
  FROM public.waouh_users
  WHERE id = NEW.seller_id;

  resolved_location := COALESCE(NEW.location, seller_location);
  IF resolved_location IS NOT NULL THEN
    resolved_lat := ST_Y(resolved_location::geometry);
    resolved_lng := ST_X(resolved_location::geometry);
  END IF;

  INSERT INTO public.waouh_unified_catalog (
    source, source_ref_id, type, titre, description, categorie,
    prix_min, prix_max, devise, ville, lat, lng,
    vendeur_nom, vendeur_phone, vendeur_whatsapp,
    photos, qualite_score, priority_rank, is_active, expires_at, raw_payload
  ) VALUES (
    'chat', NEW.id, 'offer', NEW.title, NEW.description, NEW.category,
    NEW.price, NEW.price, COALESCE(NEW.currency, 'XOF'), COALESCE(NEW.city, seller_city), resolved_lat, resolved_lng,
    seller_name, seller_phone, seller_phone,
    NEW.photos, 70, 2, NEW.status = 'active', NEW.expires_at, to_jsonb(NEW)
  )
  ON CONFLICT (source, source_ref_id) DO UPDATE SET
    titre = EXCLUDED.titre,
    description = EXCLUDED.description,
    categorie = EXCLUDED.categorie,
    prix_min = EXCLUDED.prix_min,
    prix_max = EXCLUDED.prix_max,
    devise = EXCLUDED.devise,
    ville = EXCLUDED.ville,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    vendeur_nom = EXCLUDED.vendeur_nom,
    vendeur_phone = EXCLUDED.vendeur_phone,
    vendeur_whatsapp = EXCLUDED.vendeur_whatsapp,
    photos = EXCLUDED.photos,
    is_active = EXCLUDED.is_active,
    expires_at = EXCLUDED.expires_at,
    raw_payload = EXCLUDED.raw_payload,
    last_seen_at = now();

  RETURN NEW;
END;
$$;

-- Backfill existing chat-derived catalog products where a precise article or
-- seller location already exists. No city-centre estimate is written to SQL.
UPDATE public.waouh_unified_catalog AS catalog
SET
  ville = COALESCE(article.city, seller.city, catalog.ville),
  lat = ST_Y(COALESCE(article.location, seller.location)::geometry),
  lng = ST_X(COALESCE(article.location, seller.location)::geometry),
  updated_at = now(),
  last_seen_at = now()
FROM public.waouh_articles AS article
LEFT JOIN public.waouh_users AS seller ON seller.id = article.seller_id
WHERE catalog.source = 'chat'
  AND catalog.source_ref_id = article.id
  AND COALESCE(article.location, seller.location) IS NOT NULL
  AND (catalog.lat IS NULL OR catalog.lng IS NULL);
