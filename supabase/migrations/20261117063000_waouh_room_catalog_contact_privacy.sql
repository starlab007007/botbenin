-- Keep discovery projections public and contact resolution on the server.
REVOKE SELECT ON public.waouh_unified_catalog FROM PUBLIC, anon, authenticated;
REVOKE SELECT (vendeur_phone, vendeur_whatsapp, vendeur_mobile_money, raw_payload)
  ON public.waouh_unified_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, source, source_ref_id, type, titre, description, categorie, sous_categorie,
  tags, prix_min, prix_max, devise, ville, quartier, lat, lng, geohash, vendeur_nom,
  partner_id, business_id, photos, qualite_score, priority_rank, is_active, verified,
  expires_at, last_seen_at, created_at, updated_at, promoted_article_id, gtin,
  barcode_type, ai_visual_fingerprint
) ON public.waouh_unified_catalog TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.waouh_catalog_admin_entry(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  entry jsonb;
BEGIN
  IF actor IS NULL OR NOT (
    coalesce(public.has_role(actor, 'admin'::text), false)
    OR coalesce(public.has_role(actor, 'super_admin'::text), false)
  ) THEN
    RAISE insufficient_privilege USING MESSAGE = 'catalog_admin_required';
  END IF;

  SELECT to_jsonb(row) INTO entry
  FROM (
    SELECT id, titre, description, categorie, ville, quartier, prix_min,
           prix_max, vendeur_nom, vendeur_phone, vendeur_whatsapp
    FROM public.waouh_unified_catalog
    WHERE id = p_id
  ) AS row;
  RETURN entry;
END;
$$;

REVOKE ALL ON FUNCTION public.waouh_catalog_admin_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.waouh_catalog_admin_entry(uuid) TO authenticated;
