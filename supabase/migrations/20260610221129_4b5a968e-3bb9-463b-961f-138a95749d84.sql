
-- =========================================================================
-- PHASE 1: CRITICAL RLS HARDENING — PRODUCTION READINESS
-- =========================================================================

-- 1) waouh_users: remove web_session_id IS NOT NULL bypass
DROP POLICY IF EXISTS "waouh_users self lookup" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self" ON public.waouh_users;

CREATE POLICY "waouh_users self lookup auth"
  ON public.waouh_users FOR SELECT TO public
  USING (auth.uid() IS NOT NULL AND auth_user_id = auth.uid());

CREATE POLICY "waouh_users session lookup token"
  ON public.waouh_users FOR SELECT TO public
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-waouh-session'), '')
  );

CREATE POLICY "waouh_users link self auth"
  ON public.waouh_users FOR UPDATE TO public
  USING (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND auth_user_id = auth.uid());

CREATE POLICY "waouh_users link self session"
  ON public.waouh_users FOR UPDATE TO public
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-waouh-session'), '')
  )
  WITH CHECK (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-waouh-session'), '')
  );

-- 2) waouh_messages: remove permissive web_session_id IS NOT NULL branch
DROP POLICY IF EXISTS "waouh_messages session read" ON public.waouh_messages;

CREATE POLICY "waouh_messages auth user read"
  ON public.waouh_messages FOR SELECT TO public
  USING (
    auth.uid() IS NOT NULL
    AND user_id IN (SELECT id FROM public.waouh_users WHERE auth_user_id = auth.uid())
  );
-- The strict "waouh_messages session-scoped read" (header-validated) and admin read remain in place.

-- 3) waouh_notifications: drop permissive read + UPDATE true
DROP POLICY IF EXISTS "waouh_notifications session read" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications mark read" ON public.waouh_notifications;

CREATE POLICY "waouh_notifications auth user read"
  ON public.waouh_notifications FOR SELECT TO public
  USING (
    auth.uid() IS NOT NULL
    AND user_id IN (SELECT id FROM public.waouh_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "waouh_notifications session read token"
  ON public.waouh_notifications FOR SELECT TO public
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-waouh-session'), '')
  );

CREATE POLICY "waouh_notifications auth user update"
  ON public.waouh_notifications FOR UPDATE TO public
  USING (
    auth.uid() IS NOT NULL
    AND user_id IN (SELECT id FROM public.waouh_users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id IN (SELECT id FROM public.waouh_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "waouh_notifications session update token"
  ON public.waouh_notifications FOR UPDATE TO public
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-waouh-session'), '')
  )
  WITH CHECK (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-waouh-session'), '')
  );

-- 4) waouh_outbound_queue: drop USING true
DROP POLICY IF EXISTS "waouh_outbound_queue session read" ON public.waouh_outbound_queue;
-- The header-validated "Session-scoped read of web notifications" and admin policies remain.

-- 5) payment_transactions: remove guest read branch
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.payment_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.payment_transactions FOR SELECT TO public
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- 6) ia_creator_user_usage: restrict writes to service_role
DROP POLICY IF EXISTS "System can insert usage" ON public.ia_creator_user_usage;
DROP POLICY IF EXISTS "System can update usage records" ON public.ia_creator_user_usage;

CREATE POLICY "Service role inserts usage"
  ON public.ia_creator_user_usage FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates usage"
  ON public.ia_creator_user_usage FOR UPDATE TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7) anonymous_visitor_sessions: drop USING true UPDATE
DROP POLICY IF EXISTS "Public update for visitor sessions" ON public.anonymous_visitor_sessions;
-- Bot-scoped update + ownership update remain.

-- 8) storage public-media DELETE: require ownership
DROP POLICY IF EXISTS "Allow public delete on public-media" ON storage.objects;
CREATE POLICY "public-media owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'public-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
