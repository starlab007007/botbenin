-- Run this file in Supabase Dashboard > SQL Editor after opening Radar once.
-- It does not change data.

-- 1) Available source records.
SELECT
  'waouh_articles' AS source,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'active' AND expires_at > now()) AS active_now,
  COUNT(*) FILTER (WHERE location IS NOT NULL) AS with_exact_location,
  COUNT(*) FILTER (WHERE city IS NOT NULL AND trim(city) <> '') AS with_city
FROM public.waouh_articles
UNION ALL
SELECT
  'waouh_unified_catalog',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active),
  COUNT(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL),
  COUNT(*) FILTER (WHERE ville IS NOT NULL AND trim(ville) <> '')
FROM public.waouh_unified_catalog
UNION ALL
SELECT
  'waouh_statuses',
  COUNT(*),
  COUNT(*) FILTER (WHERE expires_at > now()),
  COUNT(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL),
  COUNT(*) FILTER (WHERE location IS NOT NULL AND trim(location) <> '')
FROM public.waouh_statuses
UNION ALL
SELECT
  'waouh_external_listings',
  COUNT(*),
  COUNT(*) FILTER (WHERE COALESCE(status, 'active') <> 'ignored'),
  0,
  COUNT(*) FILTER (WHERE city IS NOT NULL AND trim(city) <> '')
FROM public.waouh_external_listings;

-- 2) Current real products that Radar should be able to use.
SELECT
  a.id,
  a.title,
  a.category,
  a.price,
  a.currency,
  a.city,
  a.status,
  a.expires_at,
  a.location IS NOT NULL AS article_has_exact_location,
  u.city AS seller_city,
  u.location IS NOT NULL AS seller_has_exact_location
FROM public.waouh_articles a
LEFT JOIN public.waouh_users u ON u.id = a.seller_id
WHERE a.status = 'active'
  AND a.expires_at > now()
ORDER BY a.created_at DESC
LIMIT 30;

-- 3) Catalog records that are active but have no position. This is the root
-- cause of zero results in the old Flutter direct fallback.
SELECT
  source,
  COUNT(*) AS active_without_lat_lng,
  COUNT(*) FILTER (WHERE ville IS NOT NULL AND trim(ville) <> '') AS recoverable_by_city
FROM public.waouh_unified_catalog
WHERE is_active = true
  AND (lat IS NULL OR lng IS NULL)
GROUP BY source
ORDER BY active_without_lat_lng DESC;
