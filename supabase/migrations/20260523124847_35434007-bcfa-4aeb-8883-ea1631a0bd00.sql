
-- 1. ants_chat_memory & ants_documents: enable RLS (service role bypasses, no public policies)
ALTER TABLE public.ants_chat_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ants_documents ENABLE ROW LEVEL SECURITY;

-- 2. chat_memory & documents: remove open policies
DROP POLICY IF EXISTS "Allow all on chat_memory" ON public.chat_memory;
DROP POLICY IF EXISTS "Allow all on documents" ON public.documents;
ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. logs_session_anomalies: restrict writes to service_role
DROP POLICY IF EXISTS "System can insert session anomalies" ON public.logs_session_anomalies;
DROP POLICY IF EXISTS "System can update session anomalies" ON public.logs_session_anomalies;
CREATE POLICY "Service role can insert session anomalies"
  ON public.logs_session_anomalies FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can update session anomalies"
  ON public.logs_session_anomalies FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. n8n_chat_histories: enable RLS (no policies => no public access; service role still works)
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- 5. payment_transactions: remove open UPDATE policies; restrict to service_role
DROP POLICY IF EXISTS "System can update payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "System can update transactions" ON public.payment_transactions;
CREATE POLICY "Service role can update payment transactions"
  ON public.payment_transactions FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. qualification_emails: restrict SELECT/UPDATE to campaign owner
DROP POLICY IF EXISTS "Allow read qualification emails" ON public.qualification_emails;
DROP POLICY IF EXISTS "Allow update qualification emails status" ON public.qualification_emails;
DROP POLICY IF EXISTS "Allow insert qualification emails" ON public.qualification_emails;
CREATE POLICY "Campaign owners read qualification emails"
  ON public.qualification_emails FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.qualification_campaigns qc
    WHERE qc.bot_link = qualification_emails.bot_link
      AND qc.user_id = auth.uid()
  ) OR auth.role() = 'service_role');
CREATE POLICY "Campaign owners update qualification emails"
  ON public.qualification_emails FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.qualification_campaigns qc
    WHERE qc.bot_link = qualification_emails.bot_link
      AND qc.user_id = auth.uid()
  ) OR auth.role() = 'service_role');
CREATE POLICY "Service role inserts qualification emails"
  ON public.qualification_emails FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- 7. user_roles: remove permissive ALL policy that lets users self-assign roles
DROP POLICY IF EXISTS "user_roles_policy" ON public.user_roles;

-- 8. visitor_fingerprints: remove public SELECT
DROP POLICY IF EXISTS "Anyone can view visitor fingerprints" ON public.visitor_fingerprints;
CREATE POLICY "Admins view visitor fingerprints"
  ON public.visitor_fingerprints FOR SELECT
  USING (has_role(auth.uid(), 'admin'::text) OR auth.role() = 'service_role');

-- 9. waouh_lid_phone_map: remove broad authenticated read
DROP POLICY IF EXISTS "Auth read lid map" ON public.waouh_lid_phone_map;

-- 10. waouh_messages: replace broad public read with session-header scoped read
DROP POLICY IF EXISTS "waouh_messages public read by session" ON public.waouh_messages;
CREATE POLICY "waouh_messages session-scoped read"
  ON public.waouh_messages FOR SELECT
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(((current_setting('request.headers'::text, true))::json ->> 'x-waouh-session'), '')
  );

-- 11. waouh_outbound_queue: fix COALESCE bypass — require header strictly
DROP POLICY IF EXISTS "Session-scoped read of web notifications" ON public.waouh_outbound_queue;
DROP POLICY IF EXISTS "Session can mark own notification read" ON public.waouh_outbound_queue;
CREATE POLICY "Session-scoped read of web notifications"
  ON public.waouh_outbound_queue FOR SELECT
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(((current_setting('request.headers'::text, true))::json ->> 'x-waouh-session'), '')
  );
CREATE POLICY "Session can mark own notification read"
  ON public.waouh_outbound_queue FOR UPDATE
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(((current_setting('request.headers'::text, true))::json ->> 'x-waouh-session'), '')
  )
  WITH CHECK (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(((current_setting('request.headers'::text, true))::json ->> 'x-waouh-session'), '')
  );
