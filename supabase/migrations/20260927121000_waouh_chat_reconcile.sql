-- =============================================================================
-- WAOUH Chat — Phase 5 : réconciliation automatique (détecter → réparer)
-- Plan validé le 27/09/2026 — voir docs/WAOUH_CHAT_THREAD_MIGRATION.md
-- =============================================================================
-- Transforme les divergences déjà mesurées par waouh-health-check en
-- réparations idempotentes. Modes :
--   'report' : mesure uniquement, AUCUNE écriture (utilisé par le health-check) ;
--   'apply'  : applique les réparations sûres (admin explicite) ;
--   'auto'   : lit l'interrupteur chat_reconcile — module désactivé => skip,
--              automatisation désactivée ou ligne absente => 'report'.
-- Livré avec chat_reconcile = activé / automatisation désactivée :
-- le cron ne fait que mesurer tant qu'un admin n'active pas l'automatisation.
--
-- Chaque réparation appliquée est journalisée dans waouh_commerce_events
-- (event_type 'chat_reconcile_*'), comme les transitions commerce.
-- =============================================================================

DROP FUNCTION IF EXISTS public.waouh_reconcile_chat_integrity(text);

CREATE OR REPLACE FUNCTION public.waouh_reconcile_chat_integrity(
  p_mode text DEFAULT 'auto',
  p_commission_rate numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mode text := lower(COALESCE(p_mode, 'auto'));
  v_enabled boolean;
  v_automation boolean;
  v_apply boolean;
  v_has_ledger boolean := to_regprocedure(
    'public.waouh_record_commerce_event(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb)') IS NOT NULL;
  v_has_accept boolean := to_regprocedure(
    'public.waouh_accept_negotiation_atomic(uuid,uuid,uuid,text,numeric,text)') IS NOT NULL;
  v_report jsonb := '{}'::jsonb;
  v_count integer;
  v_count2 integer;
  v_ids uuid[];
  v_rec record;
  v_res jsonb;
  v_accepted integer := 0;
  v_accept_errors jsonb := '[]'::jsonb;
  v_rate numeric := p_commission_rate;
BEGIN
  IF v_mode NOT IN ('auto', 'report', 'apply') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_mode';
  END IF;

  IF v_mode = 'auto' THEN
    SELECT enabled, automation_enabled,
           COALESCE(v_rate, NULLIF(metadata->>'commission_rate', '')::numeric)
    INTO v_enabled, v_automation, v_rate
    FROM public.waouh_admin_module_controls WHERE module_key = 'chat_reconcile';
    IF FOUND AND v_enabled IS FALSE THEN
      RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'chat_reconcile_disabled');
    END IF;
    v_apply := FOUND AND v_enabled AND v_automation;
  ELSE
    v_apply := v_mode = 'apply';
  END IF;

  -- R1 — messages de Deal Room sans thread, rattachables sans ambiguïté.
  IF v_apply THEN
    v_res := public.waouh_backfill_message_threads(2000, NULL);
    v_report := v_report || jsonb_build_object('r1_messages_linked', (v_res->>'linked')::integer);
  END IF;
  SELECT count(*) FILTER (WHERE candidate_thread_count = 1),
         count(*) FILTER (WHERE candidate_thread_count > 1)
  INTO v_count, v_count2
  FROM public.waouh_messages_without_thread
  WHERE created_at > now() - interval '30 days';
  v_report := v_report || jsonb_build_object(
    'r1_messages_linkable_30d', v_count,
    'r1_messages_ambiguous_30d', v_count2);

  -- R2 — négociations ouvertes sans thread, un seul thread actif exact.
  SELECT array_agg(negotiation_id) INTO v_ids FROM (
    SELECT n.id AS negotiation_id
    FROM public.waouh_negotiations n
    JOIN public.waouh_chat_threads t
      ON t.thread_type = 'product_meet'
     AND t.article_id = n.article_id
     AND t.buyer_user_id = n.buyer_user_id
     AND t.seller_user_id = n.seller_user_id
     AND t.status NOT IN ('cancelled', 'concluded')
    WHERE n.state IN ('proposed', 'countered')
      AND n.thread_id IS NULL
    GROUP BY n.id
    HAVING count(*) = 1
  ) c;
  v_report := v_report || jsonb_build_object('r2_open_negotiations_linkable', COALESCE(array_length(v_ids, 1), 0));
  IF v_apply AND v_ids IS NOT NULL THEN
    FOR v_rec IN
      SELECT n.id, n.article_id, t.id AS thread_id
      FROM public.waouh_negotiations n
      JOIN public.waouh_chat_threads t
        ON t.thread_type = 'product_meet'
       AND t.article_id = n.article_id
       AND t.buyer_user_id = n.buyer_user_id
       AND t.seller_user_id = n.seller_user_id
       AND t.status NOT IN ('cancelled', 'concluded')
      WHERE n.id = ANY(v_ids) AND n.thread_id IS NULL
    LOOP
      UPDATE public.waouh_negotiations SET thread_id = v_rec.thread_id, updated_at = now()
        WHERE id = v_rec.id AND thread_id IS NULL;
      UPDATE public.waouh_chat_threads SET negotiation_id = v_rec.id, updated_at = now()
        WHERE id = v_rec.thread_id AND (negotiation_id IS NULL OR negotiation_id = v_rec.id);
      IF v_has_ledger THEN
        PERFORM public.waouh_record_commerce_event(
          'chat_reconcile_negotiation_thread', 'negotiation', v_rec.id, v_rec.thread_id, v_rec.article_id,
          v_rec.id, NULL, NULL, NULL, 'system', NULL, 'thread_bound', NULL, '{"source":"reconcile"}'::jsonb);
      END IF;
    END LOOP;
  END IF;
  SELECT count(*) INTO v_count FROM public.waouh_negotiations
    WHERE state IN ('proposed', 'countered') AND thread_id IS NULL;
  v_report := v_report || jsonb_build_object('r2_open_negotiations_without_thread_remaining', v_count);

  -- R3 — deals sans thread alors que leur négociation en a un.
  SELECT count(*) INTO v_count
  FROM public.waouh_deals d JOIN public.waouh_negotiations n ON n.id = d.negotiation_id
  WHERE d.thread_id IS NULL AND n.thread_id IS NOT NULL;
  v_report := v_report || jsonb_build_object('r3_deals_thread_repairable', v_count);
  IF v_apply AND v_count > 0 THEN
    FOR v_rec IN
      SELECT d.id, d.article_id, d.negotiation_id, n.thread_id
      FROM public.waouh_deals d JOIN public.waouh_negotiations n ON n.id = d.negotiation_id
      WHERE d.thread_id IS NULL AND n.thread_id IS NOT NULL
    LOOP
      UPDATE public.waouh_deals SET thread_id = v_rec.thread_id, updated_at = now()
        WHERE id = v_rec.id AND thread_id IS NULL;
      IF v_has_ledger THEN
        PERFORM public.waouh_record_commerce_event(
          'chat_reconcile_deal_thread', 'deal', v_rec.id, v_rec.thread_id, v_rec.article_id,
          v_rec.negotiation_id, v_rec.id, NULL, NULL, 'system', NULL, 'thread_bound', NULL, '{"source":"reconcile"}'::jsonb);
      END IF;
    END LOOP;
  END IF;

  -- R4 — le thread ne connaît pas son deal actif.
  -- On ne répare QUE si un unique deal non annulé pointe vers le thread.
  -- Plusieurs deals = anomalie à examiner, jamais de choix arbitraire.
  WITH deal_candidates AS (
    SELECT
      t.id AS thread_id,
      count(DISTINCT d.id) AS deal_count,
      min(d.id::text)::uuid AS deal_id
    FROM public.waouh_chat_threads t
    JOIN public.waouh_deals d ON d.thread_id = t.id
    WHERE t.deal_id IS NULL
      AND d.status <> 'cancelled'
    GROUP BY t.id
  )
  SELECT
    count(*) FILTER (WHERE deal_count = 1),
    count(*) FILTER (WHERE deal_count > 1)
  INTO v_count, v_count2
  FROM deal_candidates;
  v_report := v_report || jsonb_build_object(
    'r4_threads_missing_deal_link', v_count,
    'r4_threads_ambiguous_deals', v_count2
  );
  IF v_apply AND v_count > 0 THEN
    WITH unique_deals AS (
      SELECT
        t.id AS thread_id,
        min(d.id::text)::uuid AS deal_id
      FROM public.waouh_chat_threads t
      JOIN public.waouh_deals d ON d.thread_id = t.id
      WHERE t.deal_id IS NULL
        AND d.status <> 'cancelled'
      GROUP BY t.id
      HAVING count(DISTINCT d.id) = 1
    )
    UPDATE public.waouh_chat_threads t
    SET deal_id = u.deal_id, updated_at = now()
    FROM unique_deals u
    WHERE t.id = u.thread_id
      AND t.deal_id IS NULL;
  END IF;

  -- R5 — thread encore "actif" alors que son deal est terminé ou annulé.
  SELECT count(*) INTO v_count
  FROM public.waouh_chat_threads t JOIN public.waouh_deals d ON d.id = t.deal_id
  WHERE t.status NOT IN ('concluded', 'cancelled')
    AND d.status IN ('completed', 'cancelled');
  v_report := v_report || jsonb_build_object('r5_threads_stale_status', v_count);
  IF v_apply AND v_count > 0 THEN
    FOR v_rec IN
      SELECT t.id, t.article_id, t.negotiation_id, d.id AS deal_id, d.status AS deal_status, t.status AS thread_status
      FROM public.waouh_chat_threads t JOIN public.waouh_deals d ON d.id = t.deal_id
      WHERE t.status NOT IN ('concluded', 'cancelled')
        AND d.status IN ('completed', 'cancelled')
    LOOP
      UPDATE public.waouh_chat_threads
      SET status = CASE WHEN v_rec.deal_status = 'completed' THEN 'concluded' ELSE 'cancelled' END,
          active_key = NULL,
          closed_at = COALESCE(closed_at, now()),
          updated_at = now()
      WHERE id = v_rec.id;
      IF v_has_ledger THEN
        PERFORM public.waouh_record_commerce_event(
          'chat_reconcile_thread_closed', 'thread', v_rec.id, v_rec.id, v_rec.article_id,
          v_rec.negotiation_id, v_rec.deal_id, NULL, NULL, 'system', v_rec.thread_status,
          CASE WHEN v_rec.deal_status = 'completed' THEN 'concluded' ELSE 'cancelled' END,
          NULL, '{"source":"reconcile"}'::jsonb);
      END IF;
    END LOOP;
  END IF;

  -- R6 — accord enregistré (7 derniers jours) mais aucun deal : on rejoue la
  -- transition atomique existante, idempotente, qui refuse d'elle-même un
  -- article vendu ou réservé (l'erreur est rapportée, rien n'est forcé).
  SELECT count(*) INTO v_count
  FROM public.waouh_negotiations n
  WHERE n.state = 'accepted'
    AND n.thread_id IS NOT NULL
    AND n.updated_at > now() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM public.waouh_deals d
                    WHERE d.negotiation_id = n.id AND d.status <> 'cancelled');
  v_report := v_report || jsonb_build_object('r6_accepted_without_deal_7d', v_count);
  -- Taux de commission : jamais deviné. Fourni par l'appelant (edge function
  -- = WAOUH_COMMISSION_RATE) ou par metadata.commission_rate du module
  -- chat_reconcile. Absent => R6 reste en rapport.
  IF v_apply AND v_count > 0 AND v_rate IS NULL THEN
    v_report := v_report || jsonb_build_object('r6_skipped', 'commission_rate_required');
  END IF;
  IF v_apply AND v_count > 0 AND v_has_accept AND v_rate IS NOT NULL THEN
    FOR v_rec IN
      SELECT n.id, n.thread_id
      FROM public.waouh_negotiations n
      WHERE n.state = 'accepted'
        AND n.thread_id IS NOT NULL
        AND n.updated_at > now() - interval '7 days'
        AND NOT EXISTS (SELECT 1 FROM public.waouh_deals d
                        WHERE d.negotiation_id = n.id AND d.status <> 'cancelled')
      LIMIT 50
    LOOP
      BEGIN
        PERFORM public.waouh_accept_negotiation_atomic(v_rec.id, v_rec.thread_id, NULL, 'system', v_rate, 'reconcile');
        v_accepted := v_accepted + 1;
      EXCEPTION WHEN OTHERS THEN
        v_accept_errors := v_accept_errors || jsonb_build_object('negotiation_id', v_rec.id, 'error', SQLERRM);
      END;
    END LOOP;
    v_report := v_report || jsonb_build_object('r6_deals_created', v_accepted, 'r6_errors', v_accept_errors);
  END IF;

  -- Rapport seul (aucune réparation automatique sûre).
  v_report := v_report || jsonb_build_object(
    'info_deals_waiting_courier_2h', (SELECT count(*) FROM public.waouh_deals
      WHERE status = 'pending_assignment' AND updated_at < now() - interval '2 hours'),
    'info_outbound_failed_24h', (SELECT count(*) FROM public.waouh_outbound_queue
      WHERE status = 'failed' AND created_at > now() - interval '24 hours'),
    'info_outbound_pending_15min', (SELECT count(*) FROM public.waouh_outbound_queue
      WHERE status = 'pending' AND created_at < now() - interval '15 minutes')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'mode', CASE WHEN v_apply THEN 'apply' ELSE 'report' END,
    'requested_mode', v_mode,
    'generated_at', now()
  ) || v_report;
END;
$$;

-- Quota-safe admin entry point: avoids requiring a new Edge Function slot.
-- Authenticated admins may run report/apply; commission for R6 still comes only
-- from chat_reconcile.metadata.commission_rate configured by an administrator.
CREATE OR REPLACE FUNCTION public.waouh_admin_reconcile_chat(
  p_mode text DEFAULT 'report'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='admin_required';
  END IF;
  SELECT COALESCE(public.has_role(v_uid, 'admin'::app_role), false)
      OR COALESCE(public.has_role(v_uid, 'super_admin'::app_role), false)
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='admin_required';
  END IF;
  RETURN public.waouh_reconcile_chat_integrity(p_mode, NULL);
END;
$;

REVOKE ALL ON FUNCTION public.waouh_admin_reconcile_chat(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.waouh_admin_reconcile_chat(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.waouh_admin_reconcile_chat(text) TO authenticated;

COMMENT ON FUNCTION public.waouh_reconcile_chat_integrity(text, numeric) IS
  'Réconciliation du parcours chat WAOUH (plan du 27/09/2026). report = lecture seule ; '
  'apply = réparations idempotentes journalisées ; auto = selon l''interrupteur chat_reconcile.';

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.waouh_reconcile_chat_integrity(text, numeric) FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.waouh_reconcile_chat_integrity(text, numeric) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.waouh_reconcile_chat_integrity(text, numeric) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.waouh_reconcile_chat_integrity(text, numeric) TO service_role;
  END IF;
END;
$$;

-- Tick toutes les 15 minutes, en mode 'auto' (donc rapport seul tant que
-- l'automatisation n'est pas activée par un admin). Ignoré si pg_cron absent.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'waouh-chat-reconcile-tick';
    PERFORM cron.schedule(
      'waouh-chat-reconcile-tick',
      '*/15 * * * *',
      $job$ SELECT public.waouh_reconcile_chat_integrity('auto'); $job$
    );
  END IF;
END;
$$;
