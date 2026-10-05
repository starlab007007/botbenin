-- WAOUH canonical identity + negotiation/thread integrity hardening.

CREATE OR REPLACE FUNCTION public.waouh_same_user_identity(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
  SELECT CASE
    WHEN p_a IS NULL OR p_b IS NULL THEN false
    WHEN p_a = p_b THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.waouh_users a
      JOIN public.waouh_users b ON b.id = p_b
      WHERE a.id = p_a
        AND (
          (a.auth_user_id IS NOT NULL AND a.auth_user_id = b.auth_user_id)
          OR (a.web_session_id IS NOT NULL AND a.web_session_id = b.web_session_id)
          OR (
            public.waouh_phone_identity_key(a.phone_number) IS NOT NULL
            AND public.waouh_phone_identity_key(a.phone_number) =
                public.waouh_phone_identity_key(b.phone_number)
          )
        )
    )
  END
$function$;

REVOKE ALL ON FUNCTION public.waouh_same_user_identity(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_same_user_identity(uuid,uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_same_user_identity(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.waouh_normalize_negotiation_thread_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_thread public.waouh_chat_threads%ROWTYPE;
BEGIN
  IF NEW.thread_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_thread
  FROM public.waouh_chat_threads
  WHERE id = NEW.thread_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_thread_not_found';
  END IF;

  IF NEW.article_id IS DISTINCT FROM v_thread.article_id THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_thread_article_mismatch';
  END IF;

  IF NEW.buyer_user_id IS NULL THEN
    NEW.buyer_user_id := v_thread.buyer_user_id;
  ELSIF NEW.buyer_user_id IS DISTINCT FROM v_thread.buyer_user_id THEN
    IF public.waouh_same_user_identity(NEW.buyer_user_id, v_thread.buyer_user_id) THEN
      NEW.buyer_user_id := v_thread.buyer_user_id;
    ELSE
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_thread_buyer_mismatch';
    END IF;
  END IF;

  IF NEW.seller_user_id IS NULL THEN
    NEW.seller_user_id := v_thread.seller_user_id;
  ELSIF NEW.seller_user_id IS DISTINCT FROM v_thread.seller_user_id THEN
    IF public.waouh_same_user_identity(NEW.seller_user_id, v_thread.seller_user_id) THEN
      NEW.seller_user_id := v_thread.seller_user_id;
    ELSE
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_thread_seller_mismatch';
    END IF;
  END IF;

  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_waouh_negotiation_thread_normalize ON public.waouh_negotiations;
CREATE TRIGGER trg_waouh_negotiation_thread_normalize
BEFORE INSERT OR UPDATE OF thread_id,article_id,buyer_user_id,seller_user_id
ON public.waouh_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.waouh_normalize_negotiation_thread_participants();

UPDATE public.waouh_negotiations n
SET buyer_user_id = t.buyer_user_id,
    seller_user_id = t.seller_user_id,
    updated_at = now(),
    meta = COALESCE(n.meta,'{}'::jsonb) || jsonb_build_object(
      'identity_normalized_at', now(),
      'identity_normalized_from_thread', t.id
    )
FROM public.waouh_chat_threads t
WHERE n.thread_id = t.id
  AND n.state IN ('proposed','countered')
  AND n.article_id = t.article_id
  AND (
    n.buyer_user_id IS NULL
    OR n.buyer_user_id = t.buyer_user_id
    OR public.waouh_same_user_identity(n.buyer_user_id,t.buyer_user_id)
  )
  AND (
    n.seller_user_id IS NULL
    OR n.seller_user_id = t.seller_user_id
    OR public.waouh_same_user_identity(n.seller_user_id,t.seller_user_id)
  )
  AND (
    n.buyer_user_id IS DISTINCT FROM t.buyer_user_id
    OR n.seller_user_id IS DISTINCT FROM t.seller_user_id
  );

UPDATE public.waouh_negotiations n
SET state='closed',
    closed_at=COALESCE(n.closed_at,now()),
    updated_at=now(),
    meta=COALESCE(n.meta,'{}'::jsonb) || jsonb_build_object(
      'closed_reason','article_sold',
      'integrity_repair_at',now()
    )
FROM public.waouh_articles a
WHERE a.id=n.article_id
  AND a.status='sold'
  AND n.state IN ('proposed','countered');

WITH losing AS (
  SELECT DISTINCT n.id,n.thread_id
  FROM public.waouh_negotiations n
  JOIN public.waouh_articles a ON a.id=n.article_id AND a.status='reserved'
  JOIN public.waouh_deals d ON d.article_id=n.article_id
    AND d.status NOT IN ('cancelled','completed')
  WHERE n.state IN ('proposed','countered')
    AND (d.negotiation_id IS DISTINCT FROM n.id OR d.buyer_user_id IS DISTINCT FROM n.buyer_user_id)
)
UPDATE public.waouh_negotiations n
SET state='closed',
    closed_at=COALESCE(n.closed_at,now()),
    updated_at=now(),
    meta=COALESCE(n.meta,'{}'::jsonb) || jsonb_build_object(
      'closed_reason','article_reserved',
      'integrity_repair_at',now()
    )
FROM losing l
WHERE n.id=l.id;

UPDATE public.waouh_chat_threads t
SET status='waiting_availability',
    updated_at=now()
WHERE t.id IN (
  SELECT n.thread_id
  FROM public.waouh_negotiations n
  WHERE n.state='closed'
    AND n.thread_id IS NOT NULL
    AND n.meta->>'integrity_repair_at' IS NOT NULL
    AND n.meta->>'closed_reason' IN ('article_reserved','article_sold')
)
AND t.status NOT IN ('cancelled','concluded');

WITH ranked AS (
  SELECT n.id,n.thread_id,
         row_number() over (
           partition by n.thread_id
           order by (t.negotiation_id=n.id) desc,
                    n.updated_at desc,
                    n.created_at desc,
                    n.id::text desc
         ) rn
  FROM public.waouh_negotiations n
  JOIN public.waouh_chat_threads t ON t.id=n.thread_id
  WHERE n.thread_id IS NOT NULL
    AND n.state IN ('proposed','countered')
)
UPDATE public.waouh_negotiations n
SET state='closed',
    closed_at=COALESCE(n.closed_at,now()),
    updated_at=now(),
    meta=COALESCE(n.meta,'{}'::jsonb) || jsonb_build_object(
      'closed_reason','duplicate_open_negotiation',
      'integrity_repair_at',now()
    )
FROM ranked r
WHERE n.id=r.id AND r.rn>1;

WITH winner AS (
  SELECT DISTINCT ON (n.thread_id) n.thread_id,n.id
  FROM public.waouh_negotiations n
  LEFT JOIN public.waouh_chat_threads t ON t.id=n.thread_id
  WHERE n.thread_id IS NOT NULL AND n.state IN ('proposed','countered')
  ORDER BY n.thread_id,(t.negotiation_id=n.id) desc,n.updated_at desc,n.created_at desc,n.id::text desc
)
UPDATE public.waouh_chat_threads t
SET negotiation_id=w.id,updated_at=now()
FROM winner w
WHERE t.id=w.thread_id
  AND t.negotiation_id IS DISTINCT FROM w.id;

CREATE UNIQUE INDEX IF NOT EXISTS waouh_negotiations_one_open_per_thread_uq
ON public.waouh_negotiations(thread_id)
WHERE thread_id IS NOT NULL AND state IN ('proposed','countered');

DO $block$
BEGIN
  IF to_regprocedure('public.waouh_accept_negotiation_atomic_impl_20261005(uuid,uuid,uuid,text,numeric,text)') IS NULL THEN
    ALTER FUNCTION public.waouh_accept_negotiation_atomic(uuid,uuid,uuid,text,numeric,text)
      RENAME TO waouh_accept_negotiation_atomic_impl_20261005;
  END IF;
END
$block$;

CREATE OR REPLACE FUNCTION public.waouh_accept_negotiation_atomic(
  p_negotiation_id uuid,
  p_thread_id uuid,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_commission_rate numeric DEFAULT 0.05,
  p_correlation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_neg public.waouh_negotiations%ROWTYPE;
  v_thread public.waouh_chat_threads%ROWTYPE;
BEGIN
  SELECT * INTO v_neg
  FROM public.waouh_negotiations
  WHERE id=p_negotiation_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_not_found';
  END IF;

  SELECT * INTO v_thread
  FROM public.waouh_chat_threads
  WHERE id=p_thread_id AND thread_type='product_meet'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='thread_not_found';
  END IF;

  IF v_neg.article_id IS DISTINCT FROM v_thread.article_id THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_thread_mismatch';
  END IF;

  IF v_neg.buyer_user_id IS DISTINCT FROM v_thread.buyer_user_id THEN
    IF public.waouh_same_user_identity(v_neg.buyer_user_id,v_thread.buyer_user_id) THEN
      UPDATE public.waouh_negotiations
      SET buyer_user_id=v_thread.buyer_user_id,updated_at=now()
      WHERE id=v_neg.id;
    ELSE
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_thread_mismatch';
    END IF;
  END IF;

  IF v_neg.seller_user_id IS DISTINCT FROM v_thread.seller_user_id THEN
    IF v_neg.seller_user_id IS NULL OR public.waouh_same_user_identity(v_neg.seller_user_id,v_thread.seller_user_id) THEN
      UPDATE public.waouh_negotiations
      SET seller_user_id=v_thread.seller_user_id,updated_at=now()
      WHERE id=v_neg.id;
    ELSE
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_thread_mismatch';
    END IF;
  END IF;

  RETURN public.waouh_accept_negotiation_atomic_impl_20261005(
    p_negotiation_id,p_thread_id,p_actor_user_id,p_actor_role,p_commission_rate,p_correlation_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.waouh_accept_negotiation_atomic(uuid,uuid,uuid,text,numeric,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_accept_negotiation_atomic(uuid,uuid,uuid,text,numeric,text) FROM anon,authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_accept_negotiation_atomic(uuid,uuid,uuid,text,numeric,text) TO service_role;
