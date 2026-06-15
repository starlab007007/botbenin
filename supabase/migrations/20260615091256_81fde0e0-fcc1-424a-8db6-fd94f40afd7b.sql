
-- =====================================================================
-- RESTORE WAOUH CHAT RLS v12 — rollback ciblé du Phase 1 audit
-- Rétablit la visibilité des messages contrepartie + notifications
-- pour les flux A (WA+WA), B (App vendeur + WA acheteur),
-- C (WA vendeur + App acheteur).
-- =====================================================================

-- 1) waouh_messages : restaurer la lecture session permissive
DROP POLICY IF EXISTS "waouh_messages session read" ON public.waouh_messages;
CREATE POLICY "waouh_messages session read"
  ON public.waouh_messages FOR SELECT TO public
  USING (web_session_id IS NOT NULL);

-- 2) waouh_notifications : restaurer lecture + mark-read permissives
DROP POLICY IF EXISTS "waouh_notifications session read" ON public.waouh_notifications;
CREATE POLICY "waouh_notifications session read"
  ON public.waouh_notifications FOR SELECT TO public
  USING (web_session_id IS NOT NULL);

DROP POLICY IF EXISTS "waouh_notifications mark read" ON public.waouh_notifications;
CREATE POLICY "waouh_notifications mark read"
  ON public.waouh_notifications FOR UPDATE TO public
  USING (true) WITH CHECK (true);

-- 3) waouh_outbound_queue : restaurer lecture session permissive
DROP POLICY IF EXISTS "waouh_outbound_queue session read" ON public.waouh_outbound_queue;
CREATE POLICY "waouh_outbound_queue session read"
  ON public.waouh_outbound_queue FOR SELECT TO public
  USING (web_session_id IS NOT NULL);

-- 4) waouh_users : restaurer self lookup + link self permissifs
DROP POLICY IF EXISTS "waouh_users self lookup auth" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users session lookup token" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self auth" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self session" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users self lookup" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self" ON public.waouh_users;

CREATE POLICY "waouh_users self lookup"
  ON public.waouh_users FOR SELECT TO public
  USING (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR web_session_id IS NOT NULL
  );

CREATE POLICY "waouh_users link self"
  ON public.waouh_users FOR UPDATE TO public
  USING (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR web_session_id IS NOT NULL
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR web_session_id IS NOT NULL
  );
