-- Admin read access on apresbac tables for backoffice KPIs
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'apresbac_chat_sessions','apresbac_chat_messages','apresbac_chat_sources',
    'apresbac_chat_tool_calls','apresbac_ocr_extractions',
    'apresbac_student_profiles','apresbac_student_subject_results',
    'apresbac_reference_documents','apresbac_reference_anomalies',
    'apresbac_program_records','apresbac_validation_events'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "apresbac_admin_read" ON public.%I', t);
    EXECUTE format($f$CREATE POLICY "apresbac_admin_read" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'))$f$, t);
  END LOOP;
END $$;

-- Program records: read for all authenticated (needed by chat RAG via anon key -> authenticated)
DROP POLICY IF EXISTS "apresbac_programs_read_all" ON public.apresbac_program_records;
CREATE POLICY "apresbac_programs_read_all" ON public.apresbac_program_records
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.apresbac_program_records TO authenticated;

-- KPI helper view
CREATE OR REPLACE VIEW public.v_apresbac_kpis AS
SELECT
  (SELECT count(*) FROM apresbac_chat_sessions) AS sessions_total,
  (SELECT count(*) FROM apresbac_chat_sessions WHERE created_at > now() - interval '7 days') AS sessions_7d,
  (SELECT count(*) FROM apresbac_chat_sessions WHERE created_at > now() - interval '30 days') AS sessions_30d,
  (SELECT count(*) FROM apresbac_chat_messages) AS messages_total,
  (SELECT count(*) FROM apresbac_chat_messages WHERE role='user') AS messages_user,
  (SELECT count(*) FROM apresbac_chat_messages WHERE role='assistant') AS messages_assistant,
  (SELECT count(DISTINCT user_id) FROM apresbac_chat_sessions) AS unique_users,
  (SELECT count(*) FROM apresbac_ocr_extractions) AS ocr_total,
  (SELECT count(*) FROM apresbac_ocr_extractions WHERE extraction_status='ok') AS ocr_ok,
  (SELECT count(*) FROM apresbac_ocr_extractions WHERE extraction_status='failed') AS ocr_failed,
  (SELECT count(*) FROM apresbac_reference_anomalies WHERE resolution_status <> 'resolved') AS anomalies_open,
  (SELECT count(*) FROM apresbac_reference_anomalies) AS anomalies_total,
  (SELECT count(*) FROM apresbac_reference_documents WHERE published) AS docs_published,
  (SELECT count(*) FROM apresbac_reference_documents) AS docs_total,
  (SELECT count(*) FROM apresbac_program_records) AS programs_total;

GRANT SELECT ON public.v_apresbac_kpis TO authenticated;