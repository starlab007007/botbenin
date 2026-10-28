-- One live read model, with stable source identities. Original records and their
-- permanent history remain intact; expired/duplicate offers are not search candidates.
CREATE OR REPLACE FUNCTION public.waouh_discovery_facts(value jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=public AS $$
  SELECT COALESCE(jsonb_object_agg(key,value), '{}'::jsonb)
  FROM jsonb_each(CASE WHEN jsonb_typeof($1)='object' THEN $1 ELSE '{}'::jsonb END)
  WHERE key = ANY(ARRAY['offer_kind','kind','description','brand','model','condition','storage','capacity','color',
    'quantity','requested_quantity','minimum_quantity','min_quantity','unit','price_unit','price_basis',
    'scope','deliverables','perimetre','service_scope','delivery_days','duration_days','pages','page_count',
    'conditions','eligibility','eligibility_conditions','eligible','eligibility_status','deadline','closing_date','expires_at',
    'exclusions','extra_fees','visit_fee','callout_fee','diagnostic_fee','diagnostic_included','delivery_fee','delivery_included',
    'warranty','guarantee','revisions','revision_count','availability','available_at','time_slot','organization','organizer','provider_name','remote'])
    AND value <> 'null'::jsonb;
$$;
REVOKE ALL ON FUNCTION public.waouh_discovery_facts(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_discovery_facts(jsonb) TO service_role;

CREATE OR REPLACE VIEW public.waouh_signal_fabric AS
 SELECT 'article:'::text || a.id::text AS fabric_id,
    a.id::text AS source_record_id,
    CASE WHEN a.source_channel IN ('web','mobile','flutter','waouh_app') OR (NULLIF(a.source_channel,'') IS NULL AND a.origin IN ('user','chat')) THEN 'waouh_app' ELSE COALESCE(NULLIF(a.source_channel,''),NULLIF(a.origin,''),'waouh_app') END AS source_key,
    'SELL'::text AS intent,
        CASE
            WHEN a.partner_id IS NOT NULL THEN 'business'::text
            ELSE 'seller'::text
        END AS actor_type,
    a.title AS subject,
    a.description AS raw_text,
    a.category,
    a.brand,
    a.model,
    a.condition,
    a.price::numeric AS price_min,
    a.price::numeric AS price_max,
    COALESCE(a.currency, 'XOF'::text) AS currency,
    a.city,
    a.ai_canonical_key AS canonical_key,
        CASE
            WHEN a.source_channel = 'partner'::text THEN 'C4'::text
            WHEN a.source_channel = ANY (ARRAY['waouh_app'::text, 'whatsapp'::text, 'web'::text, 'mobile'::text, 'flutter'::text]) THEN 'C2'::text
            ELSE 'C0'::text
        END AS contactability_level,
    GREATEST(0::numeric, LEAST(100::numeric, COALESCE(a.ai_quality_score,
        CASE
            WHEN a.status = 'active'::text THEN 70
            ELSE 40
        END::numeric))) AS trust_score,
    COALESCE(a.last_verified_at, a.updated_at, a.created_at) AS observed_at,
    NULL::text AS source_url,
    public.waouh_discovery_facts(a.ai_attributes) || jsonb_build_object('expires_at',a.expires_at,'article_id', a.id, 'seller_id', a.seller_id, 'partner_id', a.partner_id, 'photos', to_jsonb(COALESCE(a.photos[1:4], '{}'::text[])), 'has_contact', NULLIF(a.contact_whatsapp, ''::text) IS NOT NULL) AS evidence
   FROM waouh_articles a
  WHERE a.status = 'active'::text AND (a.expires_at IS NULL OR a.expires_at > now())
UNION ALL
 SELECT 'buyer:'::text || b.id::text AS fabric_id,
    b.id::text AS source_record_id,
    COALESCE(NULLIF(b.source_channel, ''::text), NULLIF(b.origin, ''::text), 'waouh_app'::text) AS source_key,
    'BUY'::text AS intent,
    'buyer'::text AS actor_type,
    b.query_text AS subject,
    b.query_text AS raw_text,
    b.category,
    NULL::text AS brand,
    NULL::text AS model,
    NULL::text AS condition,
    b.price_min::numeric AS price_min,
    b.price_max::numeric AS price_max,
    'XOF'::text AS currency,
    COALESCE(NULLIF(b.ai_intent->>'city',''),u.city) AS city,
    NULL::text AS canonical_key,
        CASE
            WHEN b.source_channel = 'partner'::text THEN 'C4'::text
            WHEN b.source_channel = ANY (ARRAY['waouh_app'::text, 'whatsapp'::text, 'web'::text, 'mobile'::text, 'flutter'::text]) THEN 'C2'::text
            ELSE 'C0'::text
        END AS contactability_level,
    GREATEST(0::numeric, LEAST(100::numeric, COALESCE(b.ai_priority_score, 65::numeric))) AS trust_score,
    b.created_at AS observed_at,
    NULL::text AS source_url,
    public.waouh_discovery_facts(b.ai_intent) || jsonb_build_object('photos',to_jsonb(COALESCE(b.reference_photos[1:4],'{}'::text[])),'buyer_profile_id', b.id, 'user_id', b.user_id, 'keywords', COALESCE(to_jsonb(b.keywords), '[]'::jsonb)) AS evidence
   FROM waouh_buyer_profiles b
     LEFT JOIN waouh_users u ON u.id = b.user_id
  WHERE b.is_active = true
UNION ALL
 SELECT 'catalog:'::text || c.id::text AS fabric_id,
    c.id::text AS source_record_id,
        CASE c.source::text
            WHEN 'partner'::text THEN 'partner'::text
            WHEN 'radar'::text THEN 'radar_ia'::text
            ELSE 'waouh_app'::text
        END AS source_key,
    CASE WHEN c.type::text='demand' THEN 'BUY' ELSE 'SELL' END AS intent,
        CASE
            WHEN c.type::text='demand' THEN 'buyer'::text
            WHEN c.partner_id IS NOT NULL OR c.business_id IS NOT NULL THEN 'business'::text
            ELSE 'seller'::text
        END AS actor_type,
    c.titre AS subject,
    c.description AS raw_text,
    c.categorie AS category,
    c.raw_payload->>'brand' AS brand,
    c.raw_payload->>'model' AS model,
    c.raw_payload->>'condition' AS condition,
    c.prix_min AS price_min,
    c.prix_max AS price_max,
    COALESCE(c.devise, 'XOF'::text) AS currency,
    c.ville AS city,
    c.gtin AS canonical_key,
        CASE
            WHEN c.source::text = 'partner'::text THEN 'C4'::text
            WHEN c.source::text = 'chat'::text THEN 'C2'::text
            ELSE 'C0'::text
        END AS contactability_level,
    GREATEST(0, LEAST(100, COALESCE(c.qualite_score,
        CASE
            WHEN c.verified THEN 85
            ELSE 60
        END)))::numeric AS trust_score,
    COALESCE(c.last_seen_at, c.updated_at, c.created_at) AS observed_at,
    NULL::text AS source_url,
    public.waouh_discovery_facts(c.raw_payload) || public.waouh_discovery_facts(c.raw_payload->'ai_attributes') || public.waouh_discovery_facts(c.raw_payload->'evidence') || jsonb_build_object('expires_at',c.expires_at,'catalog_id', c.id, 'source', c.source::text, 'partner_id', c.partner_id, 'business_id', c.business_id, 'seller_name', c.vendeur_nom, 'gtin', c.gtin, 'photos', to_jsonb(COALESCE(c.photos[1:4], '{}'::text[])), 'verified', c.verified, 'has_contact', COALESCE(NULLIF(c.vendeur_whatsapp, ''::text), NULLIF(c.vendeur_phone, ''::text)) IS NOT NULL) AS evidence
   FROM waouh_unified_catalog c
  WHERE c.is_active = true AND c.promoted_article_id IS NULL AND (c.expires_at IS NULL OR c.expires_at > now())
    AND NOT (c.source::text='chat' AND EXISTS (SELECT 1 FROM public.waouh_articles original WHERE original.id=c.source_ref_id))
UNION ALL
 SELECT 'legacy_external:'::text || e.id::text AS fabric_id,
    e.id::text AS source_record_id,
    'radar_ia'::text AS source_key,
    'SELL'::text AS intent,
    'seller'::text AS actor_type,
    COALESCE(e.title, e.description) AS subject,
    e.description AS raw_text,
    e.category,
    NULL::text AS brand,
    NULL::text AS model,
    e.condition,
    e.price AS price_min,
    e.price AS price_max,
    COALESCE(e.currency, 'XOF'::text) AS currency,
    e.city,
    NULL::text AS canonical_key,
    'C0'::text AS contactability_level,
    55::numeric AS trust_score,
    e.scraped_at AS observed_at,
    e.source_url,
    jsonb_build_object('external_listing_id', e.id, 'source', e.source, 'seller_name', e.seller_name, 'contact_last4',
        CASE
            WHEN e.seller_phone IS NULL THEN NULL::text
            ELSE "right"(regexp_replace(e.seller_phone, '\D'::text, ''::text, 'g'::text), 4)
        END, 'image_url', e.image_url) AS evidence
   FROM waouh_external_listings e
  WHERE e.promoted_article_id IS NULL AND e.status <> 'ignored'::text AND NOT (EXISTS ( SELECT 1
           FROM waouh_radar_signals rr
          WHERE rr.raw_url IS NOT NULL AND e.source_url IS NOT NULL AND rr.raw_url = e.source_url))
UNION ALL
 SELECT 'radar:'::text || r.id::text AS fabric_id,
    r.id::text AS source_record_id,
        CASE
            WHEN r.source_type = 'wa_group'::text THEN 'whatsapp_groups'::text
            WHEN r.source_type = ANY (ARRAY['fb_marketplace'::text, 'fb_group'::text, 'fb_page'::text]) THEN 'apify'::text
            WHEN r.source_type = ANY (ARRAY['telegram'::text, 'telegram_channel'::text]) THEN 'telegram_public'::text
            WHEN r.source_type = 'instagram_business'::text THEN 'instagram_business'::text
            WHEN r.source_type = 'tiktok'::text THEN 'tiktok_connected'::text
            WHEN r.source_type = 'google_places'::text THEN 'google_places'::text
            ELSE 'radar_ia'::text
        END AS source_key,
        CASE
            WHEN r.intent = ANY (ARRAY['BUY'::text, 'SELL'::text]) THEN r.intent
            ELSE 'ANNOUNCE'::text
        END AS intent,
        CASE
            WHEN r.intent = 'BUY'::text THEN 'buyer'::text
            WHEN r.intent = 'SELL'::text THEN 'seller'::text
            ELSE 'announcer'::text
        END AS actor_type,
    COALESCE(r.product ->> 'name'::text, r.category, r.raw_text) AS subject,
    r.raw_text,
    r.category,
    r.product ->> 'brand'::text AS brand,
    r.product ->> 'model'::text AS model,
    r.product ->> 'condition'::text AS condition,
    r.price AS price_min,
    r.price AS price_max,
    'XOF'::text AS currency,
    r.city,
    NULL::text AS canonical_key,
        CASE
            WHEN p.opt_in = true THEN 'C3'::text
            ELSE 'C0'::text
        END AS contactability_level,
    GREATEST(0::numeric, LEAST(100::numeric, COALESCE(r.confidence, 0.5) * 100::numeric)) AS trust_score,
    r.captured_at AS observed_at,
    r.raw_url AS source_url,
    public.waouh_discovery_facts(r.product) || jsonb_build_object('radar_signal_id', r.id, 'source_type', r.source_type, 'contact_last4',
        CASE
            WHEN r.contact_phone IS NULL THEN NULL::text
            ELSE "right"(regexp_replace(r.contact_phone, '\D'::text, ''::text, 'g'::text), 4)
        END, 'photos', COALESCE(r.product -> 'photos'::text, '[]'::jsonb), 'image_url', NULLIF(r.product ->> 'image_url'::text, ''::text)) AS evidence
   FROM waouh_radar_signals r
     LEFT JOIN waouh_radar_profiles p ON p.contact_phone IS NOT NULL AND r.contact_phone IS NOT NULL AND p.contact_phone = r.contact_phone
  WHERE r.status <> 'ignored'::text AND r.promoted_article_id IS NULL AND r.promoted_buyer_profile_id IS NULL
UNION ALL
 SELECT 'scout:'::text || s.id::text AS fabric_id,
    s.id::text AS source_record_id,
    'scout'::text AS source_key,
    'ANNOUNCE'::text AS intent,
    'scout'::text AS actor_type,
    s.title AS subject,
    s.note AS raw_text,
    s.category,
    NULL::text AS brand,
    NULL::text AS model,
    NULL::text AS condition,
    s.observed_price AS price_min,
    s.observed_price AS price_max,
    s.currency,
    s.city,
    s.gtin AS canonical_key,
    'C1'::text AS contactability_level,
        CASE
            WHEN s.trust_state = 'verified'::text THEN 85
            WHEN s.trust_state = 'rejected'::text THEN 10
            ELSE 55
        END::numeric AS trust_score,
    s.observed_at,
    NULL::text AS source_url,
    jsonb_build_object('scout_report_id', s.id, 'place_name', s.place_name, 'availability', s.availability, 'gtin', s.gtin, 'photos', s.photo_urls) AS evidence
   FROM waouh_scout_reports s
  WHERE s.trust_state <> 'rejected'::text
UNION ALL
 SELECT 'external:'::text || x.id::text AS fabric_id,
    x.id::text AS source_record_id,
    x.source_key,
    x.intent,
    x.actor_type,
    COALESCE(x.product_name, x.raw_text) AS subject,
    x.raw_text,
    x.category,
    x.brand,
    x.model,
    x.condition,
    x.price_min,
    x.price_max,
    x.currency,
    x.city,
    x.canonical_key,
    x.contactability_level,
    x.trust_score,
    x.observed_at,
    x.source_url,
    public.waouh_discovery_facts(x.ai_extraction) || COALESCE(x.evidence, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('quantity',x.quantity,'unit',x.unit,'availability',x.availability,'expires_at',x.expires_at,'photos',COALESCE(NULLIF(to_jsonb(x.photo_urls[1:4]),'[]'::jsonb),x.evidence->'photos'),'image_url', x.primary_photo_url, 'has_whatsapp', x.has_whatsapp, 'contact_last4', COALESCE(x.contact_phone_last4, x.whatsapp_phone_last4))) AS evidence
   FROM waouh_external_commerce_signals x
  WHERE x.status = 'active'::text AND (x.expires_at IS NULL OR x.expires_at > now());

-- The view is an internal search projection, never a direct public Data API.
REVOKE ALL ON public.waouh_signal_fabric FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.waouh_signal_fabric TO service_role;
COMMENT ON VIEW public.waouh_signal_fabric IS 'Unified live discovery of offers, demands, services and opportunities; public business facts only, original identities, expiry and mirror suppression.';
