
-- Helper de normalisation BJ
CREATE OR REPLACE FUNCTION public.waouh_normalize_bj_phone(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN RETURN NULL; END IF;
  -- Si JID @lid : pas de conversion possible
  IF position('@lid' in input) > 0 THEN RETURN NULL; END IF;
  -- Extraire chiffres uniquement
  digits := regexp_replace(input, '\D', '', 'g');
  IF digits IS NULL OR digits = '' THEN RETURN NULL; END IF;
  -- Déjà au format 229 + 10
  IF digits ~ '^22901[0-9]{8}$' THEN RETURN '+' || digits; END IF;
  -- 229 + 8 (legacy) → préfixer 01
  IF digits ~ '^229[4-9][0-9]{7}$' THEN
    RETURN '+229' || '01' || substring(digits FROM 4);
  END IF;
  -- Local 10 chiffres commençant par 01
  IF digits ~ '^01[0-9]{8}$' THEN RETURN '+229' || digits; END IF;
  -- Local 8 chiffres legacy
  IF digits ~ '^[4-9][0-9]{7}$' THEN RETURN '+22901' || digits; END IF;
  -- Autre indicatif déjà E.164-like : on garde +chiffres
  IF length(digits) BETWEEN 8 AND 15 THEN RETURN '+' || digits; END IF;
  RETURN NULL;
END;
$$;

-- RPC enrichie
DROP FUNCTION IF EXISTS public.waouh_search_unified(text, text, text, double precision, double precision, numeric, integer);

CREATE OR REPLACE FUNCTION public.waouh_search_unified(
  q text DEFAULT NULL,
  in_ville text DEFAULT NULL,
  in_categorie text DEFAULT NULL,
  in_lat double precision DEFAULT NULL,
  in_lng double precision DEFAULT NULL,
  radius_km numeric DEFAULT NULL,
  max_results integer DEFAULT 50,
  in_type text DEFAULT NULL,
  in_source text DEFAULT NULL,
  include_inactive boolean DEFAULT false,
  only_verified boolean DEFAULT false
)
RETURNS TABLE(
  id uuid, source waouh_catalog_source, type waouh_catalog_type,
  titre text, description text, categorie text, sous_categorie text,
  prix_min numeric, prix_max numeric, devise text,
  ville text, quartier text, lat double precision, lng double precision,
  vendeur_nom text,
  vendeur_phone text, vendeur_phone_norm text,
  vendeur_whatsapp text, vendeur_whatsapp_norm text,
  vendeur_mobile_money text,
  photos text[], qualite_score integer, priority_rank smallint,
  is_active boolean, verified boolean,
  date_publication timestamp with time zone,
  last_seen_at timestamp with time zone,
  expires_at timestamp with time zone,
  distance_km numeric,
  partner_id uuid, business_id uuid,
  source_ref_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.id, c.source, c.type, c.titre, c.description, c.categorie, c.sous_categorie,
    c.prix_min, c.prix_max, c.devise,
    c.ville, c.quartier, c.lat, c.lng,
    c.vendeur_nom,
    c.vendeur_phone, public.waouh_normalize_bj_phone(c.vendeur_phone),
    c.vendeur_whatsapp, public.waouh_normalize_bj_phone(c.vendeur_whatsapp),
    c.vendeur_mobile_money,
    c.photos, c.qualite_score, c.priority_rank,
    c.is_active, c.verified,
    c.created_at, c.last_seen_at, c.expires_at,
    CASE WHEN in_lat IS NOT NULL AND in_lng IS NOT NULL AND c.lat IS NOT NULL AND c.lng IS NOT NULL THEN
      ROUND((6371 * acos(
        LEAST(1, cos(radians(in_lat)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians(in_lng))
        + sin(radians(in_lat)) * sin(radians(c.lat)))
      ))::numeric, 2)
    ELSE NULL END AS distance_km,
    c.partner_id, c.business_id, c.source_ref_id
  FROM public.waouh_unified_catalog c
  WHERE (include_inactive OR c.is_active = true)
    AND (NOT only_verified OR c.verified = true)
    AND (in_type IS NULL OR c.type::text = in_type)
    AND (in_source IS NULL OR c.source::text = in_source)
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
  ORDER BY c.priority_rank ASC, c.qualite_score DESC, c.created_at DESC
  LIMIT max_results;
$function$;

GRANT EXECUTE ON FUNCTION public.waouh_search_unified(text, text, text, double precision, double precision, numeric, integer, text, text, boolean, boolean) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.waouh_normalize_bj_phone(text) TO authenticated, anon;

-- Index pour performances tri / filtres
CREATE INDEX IF NOT EXISTS idx_waouh_unified_catalog_type ON public.waouh_unified_catalog(type);
CREATE INDEX IF NOT EXISTS idx_waouh_unified_catalog_active_verified ON public.waouh_unified_catalog(is_active, verified);
CREATE INDEX IF NOT EXISTS idx_waouh_unified_catalog_created_at ON public.waouh_unified_catalog(created_at DESC);
;
