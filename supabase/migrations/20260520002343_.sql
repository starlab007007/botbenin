
-- Table de mapping lid -> phone
CREATE TABLE IF NOT EXISTS public.waouh_lid_phone_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lid text NOT NULL UNIQUE,
  jid text,
  phone text,
  phone_e164 text,
  display_name text,
  pushname text,
  session text,
  source text DEFAULT 'waha_sync',
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waouh_lid_phone_map_phone ON public.waouh_lid_phone_map(phone_e164);

ALTER TABLE public.waouh_lid_phone_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage lid map" ON public.waouh_lid_phone_map;
CREATE POLICY "Admins manage lid map" ON public.waouh_lid_phone_map
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auth read lid map" ON public.waouh_lid_phone_map;
CREATE POLICY "Auth read lid map" ON public.waouh_lid_phone_map
  FOR SELECT TO authenticated USING (true);

-- Résolution complète JID -> téléphone réel E.164
CREATE OR REPLACE FUNCTION public.waouh_resolve_phone(input text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  lid_id text;
  mapped text;
  digits text;
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN RETURN NULL; END IF;

  -- Cas @lid : chercher dans la map
  IF position('@lid' in input) > 0 THEN
    lid_id := split_part(input, '@', 1);
    SELECT phone_e164 INTO mapped FROM public.waouh_lid_phone_map
      WHERE lid = lid_id OR lid = input LIMIT 1;
    IF mapped IS NOT NULL THEN RETURN mapped; END IF;
    RETURN NULL; -- impossible à résoudre tant que pas synchronisé
  END IF;

  -- Cas @s.whatsapp.net / @c.us : extraire les chiffres
  IF position('@' in input) > 0 THEN
    digits := regexp_replace(split_part(input, '@', 1), '\D', '', 'g');
    RETURN public.waouh_normalize_bj_phone(digits);
  END IF;

  -- Téléphone direct
  RETURN public.waouh_normalize_bj_phone(input);
END;
$$;

GRANT EXECUTE ON FUNCTION public.waouh_resolve_phone(text) TO authenticated, anon;

-- Mise à jour de la RPC de recherche pour utiliser le résolveur complet
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
  date_publication timestamptz, last_seen_at timestamptz, expires_at timestamptz,
  distance_km numeric,
  partner_id uuid, business_id uuid, source_ref_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.id, c.source, c.type, c.titre, c.description, c.categorie, c.sous_categorie,
    c.prix_min, c.prix_max, c.devise,
    c.ville, c.quartier, c.lat, c.lng,
    c.vendeur_nom,
    c.vendeur_phone, public.waouh_resolve_phone(c.vendeur_phone),
    c.vendeur_whatsapp, public.waouh_resolve_phone(c.vendeur_whatsapp),
    c.vendeur_mobile_money,
    c.photos, c.qualite_score, c.priority_rank,
    c.is_active, c.verified,
    c.created_at, c.last_seen_at, c.expires_at,
    CASE WHEN in_lat IS NOT NULL AND in_lng IS NOT NULL AND c.lat IS NOT NULL AND c.lng IS NOT NULL THEN
      ROUND((6371 * acos(
        LEAST(1, cos(radians(in_lat)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians(in_lng))
        + sin(radians(in_lat)) * sin(radians(c.lat)))
      ))::numeric, 2)
    ELSE NULL END,
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

-- Backfill : table de logs d'exécution de la synchro
CREATE TABLE IF NOT EXISTS public.waouh_lid_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session text,
  contacts_fetched int DEFAULT 0,
  contacts_mapped int DEFAULT 0,
  rows_backfilled int DEFAULT 0,
  status text,
  error text,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz
);
ALTER TABLE public.waouh_lid_sync_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read lid runs" ON public.waouh_lid_sync_runs;
CREATE POLICY "Admins read lid runs" ON public.waouh_lid_sync_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
;
