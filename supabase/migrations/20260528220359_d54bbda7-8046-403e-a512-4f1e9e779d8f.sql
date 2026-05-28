
-- 1) Add web_session_id to waouh_notifications for app-side lookup
ALTER TABLE public.waouh_notifications
  ADD COLUMN IF NOT EXISTS web_session_id text;

CREATE INDEX IF NOT EXISTS idx_waouh_notifications_user_sent
  ON public.waouh_notifications(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_waouh_notifications_session_sent
  ON public.waouh_notifications(web_session_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_waouh_messages_user_created
  ON public.waouh_messages(user_id, created_at);

-- 2) Realtime: ensure notifications stream + replica identity full
ALTER TABLE public.waouh_notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='waouh_notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_notifications';
  END IF;
END $$;

-- 3) GRANTs for Data API access (anon + authenticated + service_role)
GRANT SELECT, INSERT ON public.waouh_messages TO anon, authenticated;
GRANT ALL ON public.waouh_messages TO service_role;

GRANT SELECT, UPDATE ON public.waouh_notifications TO anon, authenticated;
GRANT ALL ON public.waouh_notifications TO service_role;

GRANT SELECT, UPDATE ON public.waouh_outbound_queue TO anon, authenticated;
GRANT ALL ON public.waouh_outbound_queue TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.waouh_users TO anon, authenticated;
GRANT ALL ON public.waouh_users TO service_role;

-- 4) RLS: open read by web_session_id (matches frontend query pattern) and by linked auth account
-- waouh_messages: read by session OR by user_id of waouh_users linked to current auth user
DROP POLICY IF EXISTS "waouh_messages session read" ON public.waouh_messages;
CREATE POLICY "waouh_messages session read"
  ON public.waouh_messages FOR SELECT
  USING (
    web_session_id IS NOT NULL
    OR (
      auth.uid() IS NOT NULL AND user_id IN (
        SELECT id FROM public.waouh_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- waouh_notifications: open read for session/user (was admin-only)
DROP POLICY IF EXISTS "waouh_notifications session read" ON public.waouh_notifications;
CREATE POLICY "waouh_notifications session read"
  ON public.waouh_notifications FOR SELECT
  USING (
    web_session_id IS NOT NULL
    OR user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "waouh_notifications mark read" ON public.waouh_notifications;
CREATE POLICY "waouh_notifications mark read"
  ON public.waouh_notifications FOR UPDATE
  USING (true) WITH CHECK (true);

-- waouh_users: allow lookup by session or by current auth account (frontend resolves identity)
ALTER TABLE public.waouh_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waouh_users self lookup" ON public.waouh_users;
CREATE POLICY "waouh_users self lookup"
  ON public.waouh_users FOR SELECT
  USING (
    web_session_id IS NOT NULL
    OR (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "waouh_users link self" ON public.waouh_users;
CREATE POLICY "waouh_users link self"
  ON public.waouh_users FOR UPDATE
  USING (
    web_session_id IS NOT NULL
    OR (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
  ) WITH CHECK (true);

-- waouh_outbound_queue: open read for the app (already publishes via realtime)
DROP POLICY IF EXISTS "waouh_outbound_queue session read" ON public.waouh_outbound_queue;
CREATE POLICY "waouh_outbound_queue session read"
  ON public.waouh_outbound_queue FOR SELECT
  USING (true);
