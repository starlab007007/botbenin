-- =============================================================================
-- BANC DE TEST LOCAL UNIQUEMENT — NE JAMAIS EXÉCUTER EN PRODUCTION.
-- Backfill (appliqué par la migration) et réconciliation.
-- =============================================================================
\set ON_ERROR_STOP 1

-- Le backfill production est volontairement manuel. Le banc LOCAL l'exécute
-- explicitement afin de vérifier son comportement sans réintroduire une
-- mutation automatique dans la migration.
SELECT public.waouh_backfill_message_threads(5000, NULL);

-- B1 — backfill : sûr uniquement, identités multiples comprises.
DO $$
BEGIN
  ASSERT (SELECT thread_id FROM waouh_messages WHERE id = '10000000-0000-4000-8000-0000000000e1') = '10000000-0000-4000-8000-0000000000f1', 'B1: message WhatsApp (identité sœur) non rattaché';
  ASSERT (SELECT thread_id FROM waouh_messages WHERE id = '10000000-0000-4000-8000-0000000000e2') = '10000000-0000-4000-8000-0000000000f1', 'B1: article porté par meta non rattaché';
  ASSERT (SELECT thread_id FROM waouh_messages WHERE id = '10000000-0000-4000-8000-0000000000e3') IS NULL, 'B1: cas ambigu rattaché à tort';
  ASSERT (SELECT thread_id FROM waouh_messages WHERE id = '10000000-0000-4000-8000-0000000000e4') IS NULL, 'B1: conversation assistant touchée';
  ASSERT (SELECT thread_id FROM waouh_messages WHERE id = '10000000-0000-4000-8000-0000000000e5') = '10000000-0000-4000-8000-0000000000f1', 'B1: rattachement existant modifié';
  ASSERT (SELECT candidate_thread_count FROM waouh_messages_without_thread WHERE id = '10000000-0000-4000-8000-0000000000e3') = 2, 'B1: vue de suivi';
  ASSERT NOT EXISTS (SELECT 1 FROM waouh_messages_without_thread WHERE id = '10000000-0000-4000-8000-0000000000e4'), 'B1: la vue ne doit lister que les messages d''article';
  RAISE NOTICE 'PASS B1 backfill sûr';
END $$;

-- C1 — mode rapport : AUCUNE écriture (empreinte des tables avant/après).
CREATE TEMP TABLE _fp AS
SELECT 'n' AS t, md5(string_agg(to_jsonb(n)::text, '|' ORDER BY id)) AS h FROM waouh_negotiations n
UNION ALL SELECT 'd', md5(string_agg(to_jsonb(d)::text, '|' ORDER BY id)) FROM waouh_deals d
UNION ALL SELECT 't', md5(string_agg(to_jsonb(t)::text, '|' ORDER BY id)) FROM waouh_chat_threads t
UNION ALL SELECT 'm', md5(string_agg(to_jsonb(m)::text, '|' ORDER BY id)) FROM waouh_messages m;

DO $$
DECLARE r jsonb;
BEGIN
  r := waouh_reconcile_chat_integrity('report');
  RAISE NOTICE 'rapport: %', r;
  ASSERT r->>'mode' = 'report', 'C1: mode';
  ASSERT (r->>'r2_open_negotiations_linkable')::int = 1, 'C1: R2 détecté';
  ASSERT (r->>'r3_deals_thread_repairable')::int = 1, 'C1: R3 détecté';
  ASSERT (r->>'r5_threads_stale_status')::int = 1, 'C1: R5 détecté';
  ASSERT (r->>'r6_accepted_without_deal_7d')::int = 1, 'C1: R6 détecté';
  ASSERT (r->>'r1_messages_ambiguous_30d')::int = 1, 'C1: R1 ambigu détecté';
END $$;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM (
    SELECT 'n' AS t, md5(string_agg(to_jsonb(n)::text, '|' ORDER BY id)) AS h FROM waouh_negotiations n
    UNION ALL SELECT 'd', md5(string_agg(to_jsonb(d)::text, '|' ORDER BY id)) FROM waouh_deals d
    UNION ALL SELECT 't', md5(string_agg(to_jsonb(t)::text, '|' ORDER BY id)) FROM waouh_chat_threads t
    UNION ALL SELECT 'm', md5(string_agg(to_jsonb(m)::text, '|' ORDER BY id)) FROM waouh_messages m
  ) now_fp JOIN _fp USING (t) WHERE now_fp.h IS DISTINCT FROM _fp.h) = 0, 'C1: le mode rapport a écrit en base';
  RAISE NOTICE 'PASS C1 mode rapport sans écriture';
END $$;

-- C2 — mode auto : suit l'interrupteur (livré en rapport ; module coupé => skip).
DO $$
DECLARE r jsonb;
BEGIN
  r := waouh_reconcile_chat_integrity('auto');
  ASSERT r->>'mode' = 'report', 'C2: auto doit rester en rapport par défaut';
  UPDATE waouh_admin_module_controls SET enabled = false WHERE module_key = 'chat_reconcile';
  r := waouh_reconcile_chat_integrity('auto');
  ASSERT (r->>'skipped')::boolean, 'C2: module coupé => skip';
  UPDATE waouh_admin_module_controls SET enabled = true WHERE module_key = 'chat_reconcile';
  RAISE NOTICE 'PASS C2 mode auto piloté par l''interrupteur';
END $$;

-- C3 — application sans taux de commission : R6 non appliqué (jamais deviné).
DO $$
DECLARE r jsonb;
BEGIN
  r := waouh_reconcile_chat_integrity('apply');
  RAISE NOTICE 'application: %', r;
  ASSERT r->>'mode' = 'apply', 'C3: mode';
  ASSERT r->>'r6_skipped' = 'commission_rate_required', 'C3: R6 doit attendre un taux explicite';
  ASSERT (SELECT thread_id FROM waouh_negotiations WHERE id = '10000000-0000-4000-8000-0000000000b1') = '10000000-0000-4000-8000-0000000000f1', 'C3: R2 non appliqué';
  ASSERT (SELECT negotiation_id FROM waouh_chat_threads WHERE id = '10000000-0000-4000-8000-0000000000f1') = '10000000-0000-4000-8000-0000000000b1', 'C3: R2 miroir thread';
  ASSERT (SELECT thread_id FROM waouh_deals WHERE id = '10000000-0000-4000-8000-0000000000d3') = '10000000-0000-4000-8000-0000000000f4', 'C3: R3 non appliqué';
  ASSERT (SELECT deal_id FROM waouh_chat_threads WHERE id = '10000000-0000-4000-8000-0000000000f4') = '10000000-0000-4000-8000-0000000000d3', 'C3: R4 non appliqué';
  ASSERT (SELECT status = 'concluded' AND active_key IS NULL AND closed_at IS NOT NULL FROM waouh_chat_threads WHERE id = '10000000-0000-4000-8000-0000000000f5'), 'C3: R5 non appliqué';
  ASSERT NOT EXISTS (SELECT 1 FROM waouh_deals WHERE negotiation_id = '10000000-0000-4000-8000-0000000000b5'), 'C3: R6 appliqué sans taux';
  ASSERT (SELECT count(*) FROM waouh_commerce_events WHERE event_type LIKE 'chat_reconcile_%') >= 3, 'C3: réparations non journalisées';
  RAISE NOTICE 'PASS C3 réparations sûres + journal';
END $$;

-- C4 — R6 avec taux explicite (celui de l'edge function) : deal créé par la
-- transition atomique existante ; rejouer ne crée rien de plus.
DO $$
DECLARE r jsonb; v_deals int;
BEGIN
  r := waouh_reconcile_chat_integrity('apply', 0.07);
  ASSERT (r->>'r6_deals_created')::int = 1, 'C4: deal non créé : ' || r::text;
  SELECT count(*) INTO v_deals FROM waouh_deals WHERE negotiation_id = '10000000-0000-4000-8000-0000000000b5';
  ASSERT v_deals = 1, 'C4: nombre de deals';
  ASSERT (SELECT commission_rate FROM waouh_deals WHERE negotiation_id = '10000000-0000-4000-8000-0000000000b5') = 0.07, 'C4: taux';
  r := waouh_reconcile_chat_integrity('apply', 0.07);
  ASSERT (SELECT count(*) FROM waouh_deals WHERE negotiation_id = '10000000-0000-4000-8000-0000000000b5') = 1, 'C4: non idempotent';
  ASSERT (r->>'r2_open_negotiations_linkable')::int = 0 AND (r->>'r3_deals_thread_repairable')::int = 0
     AND (r->>'r5_threads_stale_status')::int = 0 AND (r->>'r6_accepted_without_deal_7d')::int = 0, 'C4: il reste des écarts : ' || r::text;
  RAISE NOTICE 'PASS C4 R6 explicite + idempotence';
END $$;
