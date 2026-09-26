-- WAOUH Commerce E2E V3 — legacy auto-healer for open negotiations.
-- Safe rules:
-- 1) recover seller only from the canonical article,
-- 2) close impossible negotiations for sold articles,
-- 3) create a Deal Room only when the open relation is unambiguous (one open negotiation).

UPDATE public.waouh_negotiations n
SET seller_user_id = a.seller_id,
    updated_at = now(),
    meta = COALESCE(n.meta, '{}'::jsonb) || jsonb_build_object('seller_repaired_from_article', true)
FROM public.waouh_articles a
WHERE n.article_id = a.id
  AND n.state IN ('proposed','countered')
  AND n.seller_user_id IS NULL
  AND a.seller_id IS NOT NULL
  AND a.status <> 'sold';

UPDATE public.waouh_negotiations n
SET state = 'closed',
    closed_at = COALESCE(n.closed_at, now()),
    updated_at = now(),
    meta = COALESCE(n.meta, '{}'::jsonb) || jsonb_build_object(
      'auto_closed_reason', 'article_sold',
      'auto_closed_at', now()
    )
FROM public.waouh_articles a
WHERE n.article_id = a.id
  AND n.state IN ('proposed','countered')
  AND a.status = 'sold';

WITH unique_open_relation AS (
  SELECT
    n.article_id,
    n.buyer_user_id,
    n.seller_user_id,
    min(n.id::text)::uuid AS negotiation_id
  FROM public.waouh_negotiations n
  JOIN public.waouh_articles a ON a.id=n.article_id
  WHERE n.state IN ('proposed','countered')
    AND n.thread_id IS NULL
    AND n.article_id IS NOT NULL
    AND n.buyer_user_id IS NOT NULL
    AND n.seller_user_id IS NOT NULL
    AND a.status <> 'sold'
  GROUP BY n.article_id,n.buyer_user_id,n.seller_user_id
  HAVING count(*)=1
),
to_create AS (
  SELECT
    r.*,
    gen_random_uuid() AS cycle_id,
    concat(
      'product:',r.article_id,
      ':buyer:',r.buyer_user_id,
      ':seller:',r.seller_user_id
    ) AS relation_key
  FROM unique_open_relation r
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.waouh_chat_threads t
    WHERE t.thread_type='product_meet'
      AND t.article_id=r.article_id
      AND t.buyer_user_id=r.buyer_user_id
      AND t.seller_user_id=r.seller_user_id
      AND t.status NOT IN ('cancelled','concluded')
  )
)
INSERT INTO public.waouh_chat_threads(
  thread_key,active_key,thread_type,article_id,buyer_user_id,seller_user_id,
  cycle_id,negotiation_id,source,status,metadata
)
SELECT
  concat(c.relation_key,':cycle:',c.cycle_id),
  c.relation_key,
  'product_meet',
  c.article_id,
  c.buyer_user_id,
  c.seller_user_id,
  c.cycle_id,
  c.negotiation_id,
  'legacy_auto_heal',
  'negotiating',
  jsonb_build_object(
    'title',a.title,
    'price',a.price,
    'city',a.city,
    'photos',COALESCE(to_jsonb(a.photos),'[]'::jsonb),
    'legacy_auto_healed',true
  )
FROM to_create c
JOIN public.waouh_articles a ON a.id=c.article_id
ON CONFLICT (active_key) DO NOTHING;

WITH exact_threads AS (
  SELECT
    n.id AS negotiation_id,
    (array_agg(t.id ORDER BY t.updated_at DESC))[1] AS thread_id
  FROM public.waouh_negotiations n
  JOIN public.waouh_chat_threads t
    ON t.thread_type='product_meet'
   AND t.article_id=n.article_id
   AND t.buyer_user_id=n.buyer_user_id
   AND t.seller_user_id=n.seller_user_id
   AND t.status NOT IN ('cancelled','concluded')
  WHERE n.state IN ('proposed','countered')
    AND n.thread_id IS NULL
  GROUP BY n.id
  HAVING count(*)=1
)
UPDATE public.waouh_negotiations n
SET thread_id=e.thread_id,
    updated_at=now(),
    meta=COALESCE(n.meta,'{}'::jsonb) || jsonb_build_object('thread_auto_healed',true)
FROM exact_threads e
WHERE n.id=e.negotiation_id;

UPDATE public.waouh_chat_threads t
SET negotiation_id=n.id,
    status='negotiating',
    updated_at=now()
FROM public.waouh_negotiations n
WHERE n.thread_id=t.id
  AND n.state IN ('proposed','countered')
  AND t.thread_type='product_meet'
  AND (t.negotiation_id IS NULL OR t.negotiation_id=n.id);
