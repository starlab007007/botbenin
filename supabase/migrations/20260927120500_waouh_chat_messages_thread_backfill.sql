-- =============================================================================
-- WAOUH Chat — Phase 0 : backfill sûr de waouh_messages.thread_id
-- =============================================================================
-- UPDATE uniquement, aucune DDL destructive. Règle identique aux migrations
-- 20260926113000 / 20260926190000 : on ne relie un message à un thread que
-- lorsque la relation est SANS AMBIGUÏTÉ (un seul thread possible pour cet
-- utilisateur — ou une de ses identités — sur cet article). Les cas ambigus
-- (plusieurs cycles de négociation sur le même article) restent NULL : un
-- thread absent vaut mieux qu'un thread faux.
--
-- Traitement par lots de 5 000 pour ne pas verrouiller la table longtemps.
-- La même logique est rejouée périodiquement par la réconciliation
-- (20260927121000_waouh_chat_reconcile.sql) pour les lignes écrites par les
-- anciens chemins pendant la transition.
-- =============================================================================

DROP FUNCTION IF EXISTS public.waouh_backfill_message_threads(integer);

CREATE OR REPLACE FUNCTION public.waouh_backfill_message_threads(
  p_limit integer DEFAULT 5000,
  p_before timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_linked integer := 0;
  v_scanned integer := 0;
  v_oldest timestamptz := NULL;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _waouh_bf_pending (
    id uuid, user_id uuid, article_id uuid, created_at timestamptz
  ) ON COMMIT DROP;
  TRUNCATE _waouh_bf_pending;

  INSERT INTO _waouh_bf_pending
  SELECT m.id, m.user_id, COALESCE(m.article_id, CASE
      WHEN (m.meta->>'article_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (m.meta->>'article_id')::uuid END),
    m.created_at
  FROM public.waouh_messages m
  WHERE m.thread_id IS NULL
    AND m.user_id IS NOT NULL
    AND (m.article_id IS NOT NULL OR m.meta ? 'article_id')
    AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50000));

  SELECT count(*), min(created_at) INTO v_scanned, v_oldest FROM _waouh_bf_pending;

  WITH pending AS (
    SELECT id, user_id, article_id FROM _waouh_bf_pending
  ),
  candidates AS (
    SELECT p.id AS message_id, (array_agg(DISTINCT t.id))[1] AS thread_id
    FROM pending p
    JOIN public.waouh_chat_threads t
      ON t.thread_type = 'product_meet'
     AND t.article_id = p.article_id
     AND (public.waouh_same_person(p.user_id, t.buyer_user_id)
          OR public.waouh_same_person(p.user_id, t.seller_user_id))
    WHERE p.article_id IS NOT NULL
    GROUP BY p.id
    HAVING count(DISTINCT t.id) = 1
  )
  UPDATE public.waouh_messages m
  SET thread_id = c.thread_id
  FROM candidates c
  WHERE m.id = c.message_id
    AND m.thread_id IS NULL;

  GET DIAGNOSTICS v_linked = ROW_COUNT;
  RETURN jsonb_build_object('linked', v_linked, 'scanned', v_scanned, 'oldest', v_oldest);
END;
$$;

-- IMPORTANT : aucun backfill historique n'est exécuté automatiquement par
-- cette migration. La fonction ci-dessus est volontairement installée en mode
-- manuel afin de permettre : report -> validation -> batches audités.
-- Exemple après validation :
--   SELECT public.waouh_backfill_message_threads(100, NULL);
-- puis 500, 2000, etc. Les cas ambigus restent NULL.

-- Vue de suivi pour l'admin et la réconciliation. security_invoker : la vue
-- applique le RLS de l'appelant (une vue normale le contournerait). Aucun
-- accès pour anon / authenticated : lecture par les edge functions admin.
CREATE OR REPLACE VIEW public.waouh_messages_without_thread
WITH (security_invoker = true) AS
SELECT
  m.id,
  m.user_id,
  COALESCE(m.article_id, CASE
    WHEN (m.meta->>'article_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (m.meta->>'article_id')::uuid END) AS article_id,
  m.channel,
  m.direction,
  m.created_at,
  (
    SELECT count(*) FROM public.waouh_chat_threads t
    WHERE t.thread_type = 'product_meet'
      AND t.article_id = COALESCE(m.article_id, CASE
        WHEN (m.meta->>'article_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (m.meta->>'article_id')::uuid END)
      AND (public.waouh_same_person(m.user_id, t.buyer_user_id)
           OR public.waouh_same_person(m.user_id, t.seller_user_id))
  ) AS candidate_thread_count
FROM public.waouh_messages m
WHERE m.thread_id IS NULL
  AND (m.article_id IS NOT NULL OR m.meta ? 'article_id');

COMMENT ON VIEW public.waouh_messages_without_thread IS
  'Messages rattachés à un article mais sans thread. candidate_thread_count : '
  '0 = aucun thread trouvable (historique antérieur aux threads), '
  '>1 = ambigu (plusieurs cycles), à trancher manuellement si besoin.';

DO $$
BEGIN
  REVOKE ALL ON public.waouh_messages_without_thread FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.waouh_backfill_message_threads(integer, timestamptz) FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.waouh_messages_without_thread FROM anon;
    REVOKE ALL ON FUNCTION public.waouh_backfill_message_threads(integer, timestamptz) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.waouh_messages_without_thread FROM authenticated;
    REVOKE ALL ON FUNCTION public.waouh_backfill_message_threads(integer, timestamptz) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON public.waouh_messages_without_thread TO service_role;
    GRANT EXECUTE ON FUNCTION public.waouh_backfill_message_threads(integer, timestamptz) TO service_role;
  END IF;
END;
$$;
