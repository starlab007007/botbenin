-- NEXUS Signal Fabric: preserve real source attribution and source media.
create or replace view public.waouh_signal_fabric as
select
  'article:' || a.id::text as fabric_id,
  a.id::text as source_record_id,
  coalesce(nullif(a.source_channel,''),nullif(a.origin,''),'waouh_app')::text as source_key,
  'SELL'::text as intent,
  case when a.partner_id is not null then 'business' else 'seller' end::text as actor_type,
  a.title::text as subject,
  a.description::text as raw_text,
  a.category::text as category,
  a.brand::text as brand,
  a.model::text as model,
  a.condition::text as condition,
  a.price::numeric as price_min,
  a.price::numeric as price_max,
  coalesce(a.currency,'XOF')::text as currency,
  a.city::text as city,
  a.ai_canonical_key::text as canonical_key,
  case
    when a.source_channel='partner' then 'C4'
    when a.source_channel in ('waouh_app','whatsapp') then 'C2'
    else 'C0'
  end::text as contactability_level,
  greatest(0,least(100,coalesce(a.ai_quality_score,case when a.status='active' then 70 else 40 end)))::numeric as trust_score,
  coalesce(a.last_verified_at,a.updated_at,a.created_at)::timestamptz as observed_at,
  null::text as source_url,
  jsonb_build_object('article_id',a.id,'seller_id',a.seller_id,'partner_id',a.partner_id,'photos',to_jsonb(coalesce(a.photos,'{}'::text[]))) as evidence
from public.waouh_articles a
where a.status='active'
union all
select
  'buyer:' || b.id::text,
  b.id::text,
  coalesce(nullif(b.source_channel,''),nullif(b.origin,''),'waouh_app')::text,
  'BUY'::text,
  'buyer'::text,
  b.query_text::text,
  b.query_text::text,
  b.category::text,
  null::text,
  null::text,
  null::text,
  b.price_min::numeric,
  b.price_max::numeric,
  'XOF'::text,
  u.city::text,
  null::text,
  case
    when b.source_channel='partner' then 'C4'
    when b.source_channel in ('waouh_app','whatsapp') then 'C2'
    else 'C0'
  end::text,
  greatest(0,least(100,coalesce(b.ai_priority_score,65)))::numeric,
  b.created_at::timestamptz,
  null::text,
  jsonb_build_object('buyer_profile_id',b.id,'user_id',b.user_id,'keywords',coalesce(to_jsonb(b.keywords),'[]'::jsonb)) as evidence
from public.waouh_buyer_profiles b
left join public.waouh_users u on u.id=b.user_id
where b.is_active=true
union all
select
  'catalog:' || c.id::text,
  c.id::text,
  case c.source::text
    when 'partner' then 'partner'
    when 'radar' then 'radar_ia'
    else 'waouh_app'
  end::text,
  'SELL'::text,
  case when c.partner_id is not null or c.business_id is not null then 'business' else 'seller' end::text,
  c.titre::text,
  c.description::text,
  c.categorie::text,
  null::text,
  null::text,
  null::text,
  c.prix_min::numeric,
  c.prix_max::numeric,
  coalesce(c.devise,'XOF')::text,
  c.ville::text,
  c.gtin::text,
  case
    when c.source::text='partner' then 'C4'
    when c.source::text='chat' then 'C2'
    else 'C0'
  end::text,
  greatest(0,least(100,coalesce(c.qualite_score,case when c.verified then 85 else 60 end)))::numeric,
  coalesce(c.last_seen_at,c.updated_at,c.created_at)::timestamptz,
  null::text,
  jsonb_build_object(
    'catalog_id',c.id,
    'source',c.source::text,
    'partner_id',c.partner_id,
    'business_id',c.business_id,
    'seller_name',c.vendeur_nom,
    'gtin',c.gtin,
    'photos',to_jsonb(coalesce(c.photos,'{}'::text[])),
    'verified',c.verified
  ) as evidence
from public.waouh_unified_catalog c
where c.is_active=true
  and c.promoted_article_id is null
  and (c.expires_at is null or c.expires_at>now())
union all
select
  'legacy_external:' || e.id::text,
  e.id::text,
  'radar_ia'::text,
  'SELL'::text,
  'seller'::text,
  coalesce(e.title,e.description)::text,
  e.description::text,
  e.category::text,
  null::text,
  null::text,
  e.condition::text,
  e.price::numeric,
  e.price::numeric,
  coalesce(e.currency,'XOF')::text,
  e.city::text,
  null::text,
  'C0'::text,
  55::numeric,
  e.scraped_at::timestamptz,
  e.source_url::text,
  jsonb_build_object(
    'external_listing_id',e.id,
    'source',e.source,
    'seller_name',e.seller_name,
    'contact_last4',case when e.seller_phone is null then null else right(regexp_replace(e.seller_phone,'\D','','g'),4) end,
    'image_url',e.image_url
  ) as evidence
from public.waouh_external_listings e
where e.promoted_article_id is null
  and e.status not in ('ignored')
  and not exists (
    select 1 from public.waouh_radar_signals rr
    where rr.raw_url is not null and e.source_url is not null and rr.raw_url=e.source_url
  )
union all
select
  'radar:' || r.id::text,
  r.id::text,
  case
    when r.source_type='wa_group' then 'whatsapp_groups'
    when r.source_type in ('fb_marketplace','fb_group','fb_page') then 'apify'
    when r.source_type in ('telegram','telegram_channel') then 'telegram_public'
    when r.source_type='instagram_business' then 'instagram_business'
    when r.source_type='tiktok' then 'tiktok_connected'
    when r.source_type='google_places' then 'google_places'
    else 'radar_ia'
  end::text,
  case when r.intent in ('BUY','SELL') then r.intent else 'ANNOUNCE' end::text,
  case when r.intent='BUY' then 'buyer' when r.intent='SELL' then 'seller' else 'announcer' end::text,
  coalesce(r.product->>'name',r.category,r.raw_text)::text,
  r.raw_text::text,
  r.category::text,
  r.product->>'brand',
  r.product->>'model',
  r.product->>'condition',
  r.price::numeric,
  r.price::numeric,
  'XOF'::text,
  r.city::text,
  null::text,
  case when p.opt_in=true then 'C3' else 'C0' end::text,
  greatest(0,least(100,coalesce(r.confidence,0.5)*100))::numeric,
  r.captured_at::timestamptz,
  r.raw_url::text,
  jsonb_build_object(
    'radar_signal_id',r.id,
    'source_type',r.source_type,
    'contact_last4',case when r.contact_phone is null then null else right(regexp_replace(r.contact_phone,'\D','','g'),4) end,
    'photos',coalesce(r.product->'photos','[]'::jsonb),
    'image_url',nullif(r.product->>'image_url','')
  ) as evidence
from public.waouh_radar_signals r
left join public.waouh_radar_profiles p
  on p.contact_phone is not null and r.contact_phone is not null and p.contact_phone=r.contact_phone
where r.status not in ('ignored')
union all
select
  'scout:' || s.id::text,
  s.id::text,
  'scout'::text,
  'ANNOUNCE'::text,
  'scout'::text,
  s.title::text,
  s.note::text,
  s.category::text,
  null::text,
  null::text,
  null::text,
  s.observed_price::numeric,
  s.observed_price::numeric,
  s.currency::text,
  s.city::text,
  s.gtin::text,
  'C1'::text,
  case when s.trust_state='verified' then 85 when s.trust_state='rejected' then 10 else 55 end::numeric,
  s.observed_at::timestamptz,
  null::text,
  jsonb_build_object('scout_report_id',s.id,'place_name',s.place_name,'availability',s.availability,'gtin',s.gtin,'photos',s.photo_urls) as evidence
from public.waouh_scout_reports s
where s.trust_state<>'rejected'
union all
select
  'external:' || x.id::text,
  x.id::text,
  x.source_key::text,
  x.intent::text,
  x.actor_type::text,
  coalesce(x.product_name,x.raw_text)::text,
  x.raw_text::text,
  x.category::text,
  x.brand::text,
  x.model::text,
  x.condition::text,
  x.price_min::numeric,
  x.price_max::numeric,
  x.currency::text,
  x.city::text,
  x.canonical_key::text,
  x.contactability_level::text,
  x.trust_score::numeric,
  x.observed_at::timestamptz,
  x.source_url::text,
  x.evidence
from public.waouh_external_commerce_signals x
where x.status='active' and (x.expires_at is null or x.expires_at>now());

comment on view public.waouh_signal_fabric is
  'Unified WAOUH/NEXUS commercial signal fabric with source attribution, contactability and media evidence.';
