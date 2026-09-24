-- WAOUH chat security boundary.
-- This migration intentionally does not create, alter or call payment objects.

-- ---------------------------------------------------------------------------
-- Session isolation for chat data
-- ---------------------------------------------------------------------------

ALTER TABLE public.waouh_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_outbound_queue ENABLE ROW LEVEL SECURITY;

-- Remove every historical policy that accepted any non-null session id.
DROP POLICY IF EXISTS "waouh_users self lookup" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users self lookup auth" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users session lookup token" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self auth" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self session" ON public.waouh_users;

CREATE POLICY "waouh_users self lookup auth"
  ON public.waouh_users FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "waouh_users session lookup token"
  ON public.waouh_users FOR SELECT TO anon, authenticated
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  );

CREATE POLICY "waouh_users link self auth"
  ON public.waouh_users FOR UPDATE TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "waouh_users link self session"
  ON public.waouh_users FOR UPDATE TO authenticated
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  )
  WITH CHECK (
    auth_user_id = (SELECT auth.uid())
    AND web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  );

-- Historical grants exposed every mutable profile field. Session linking only
-- needs auth_user_id; counters, verification and identity fields stay server-side.
REVOKE INSERT, UPDATE ON public.waouh_users FROM anon, authenticated;
GRANT UPDATE (auth_user_id) ON public.waouh_users TO authenticated;

DROP POLICY IF EXISTS "waouh_messages public read by session" ON public.waouh_messages;
DROP POLICY IF EXISTS "waouh_messages session read" ON public.waouh_messages;
DROP POLICY IF EXISTS "waouh_messages auth user read" ON public.waouh_messages;
DROP POLICY IF EXISTS "waouh_messages session-scoped read" ON public.waouh_messages;
DROP POLICY IF EXISTS "waouh_messages anon insert" ON public.waouh_messages;

CREATE POLICY "waouh_messages auth user read"
  ON public.waouh_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.waouh_users AS owner
      WHERE owner.id = waouh_messages.user_id
        AND owner.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "waouh_messages session-scoped read"
  ON public.waouh_messages FOR SELECT TO anon, authenticated
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  );

-- Messages enter through the validated Edge Function, which uses service_role.
REVOKE INSERT ON public.waouh_messages FROM anon, authenticated;

DROP POLICY IF EXISTS "waouh_notifications session read" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications mark read" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications auth user read" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications session read token" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications auth user update" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications session update token" ON public.waouh_notifications;

CREATE POLICY "waouh_notifications auth user read"
  ON public.waouh_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.waouh_users AS owner
      WHERE owner.id = waouh_notifications.user_id
        AND owner.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "waouh_notifications session read token"
  ON public.waouh_notifications FOR SELECT TO anon, authenticated
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  );

CREATE POLICY "waouh_notifications auth user update"
  ON public.waouh_notifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.waouh_users AS owner
      WHERE owner.id = waouh_notifications.user_id
        AND owner.auth_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.waouh_users AS owner
      WHERE owner.id = waouh_notifications.user_id
        AND owner.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "waouh_notifications session update token"
  ON public.waouh_notifications FOR UPDATE TO anon, authenticated
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  )
  WITH CHECK (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  );

REVOKE UPDATE ON public.waouh_notifications FROM anon, authenticated;
GRANT UPDATE (opened) ON public.waouh_notifications TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read own web session notifications" ON public.waouh_outbound_queue;
DROP POLICY IF EXISTS "Session-scoped read of web notifications" ON public.waouh_outbound_queue;
DROP POLICY IF EXISTS "Session can mark own notification read" ON public.waouh_outbound_queue;
DROP POLICY IF EXISTS "waouh_outbound_queue session read" ON public.waouh_outbound_queue;
DROP POLICY IF EXISTS "waouh_outbound_queue auth user read" ON public.waouh_outbound_queue;
DROP POLICY IF EXISTS "waouh_outbound_queue auth user update" ON public.waouh_outbound_queue;

CREATE POLICY "Session-scoped read of web notifications"
  ON public.waouh_outbound_queue FOR SELECT TO anon, authenticated
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  );

CREATE POLICY "Session can mark own notification read"
  ON public.waouh_outbound_queue FOR UPDATE TO anon, authenticated
  USING (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  )
  WITH CHECK (
    web_session_id IS NOT NULL
    AND web_session_id = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
  );

CREATE POLICY "waouh_outbound_queue auth user read"
  ON public.waouh_outbound_queue FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.waouh_users AS owner
      WHERE owner.id = waouh_outbound_queue.to_user_id
        AND owner.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "waouh_outbound_queue auth user update"
  ON public.waouh_outbound_queue FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.waouh_users AS owner
      WHERE owner.id = waouh_outbound_queue.to_user_id
        AND owner.auth_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.waouh_users AS owner
      WHERE owner.id = waouh_outbound_queue.to_user_id
        AND owner.auth_user_id = (SELECT auth.uid())
    )
  );

REVOKE UPDATE ON public.waouh_outbound_queue FROM anon, authenticated;
GRANT UPDATE (read_at) ON public.waouh_outbound_queue TO anon, authenticated;

-- Link only the caller's authenticated account to the session presented in
-- both the body and request header. The old function trusted p_user_id.
CREATE OR REPLACE FUNCTION public.waouh_link_session(p_session_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_header_session text := NULLIF(
    COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
      ->> 'x-waouh-session',
    ''
  );
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'authenticated_user_mismatch' USING ERRCODE = '42501';
  END IF;

  IF p_session_id IS NULL OR p_session_id IS DISTINCT FROM v_header_session THEN
    RAISE EXCEPTION 'invalid_waouh_session' USING ERRCODE = '42501';
  END IF;

  UPDATE public.waouh_users
     SET auth_user_id = auth.uid()
   WHERE web_session_id = p_session_id
     AND (auth_user_id IS NULL OR auth_user_id = auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.waouh_link_session(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.waouh_link_session(text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Public product images remain readable; writes are constrained by role,
-- session folder, MIME type and bucket size.
-- ---------------------------------------------------------------------------

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
    ]::text[]
WHERE id = 'waouh-uploads';

UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'video/mp4', 'video/webm'
    ]::text[]
WHERE id = 'waouh-media';

DROP POLICY IF EXISTS "waouh-uploads anon insert" ON storage.objects;
DROP POLICY IF EXISTS "waouh-uploads authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "waouh-uploads session insert" ON storage.objects;

CREATE POLICY "waouh-uploads authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'waouh-uploads'
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])
  );

CREATE POLICY "waouh-uploads session insert"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'waouh-uploads'
    AND (storage.foldername(name))[1] = 'web'
    AND (storage.foldername(name))[2] = NULLIF(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session',
      ''
    )
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])
  );

DROP POLICY IF EXISTS "WAOUH media insert" ON storage.objects;
DROP POLICY IF EXISTS "WAOUH media authenticated insert" ON storage.objects;

CREATE POLICY "WAOUH media authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'waouh-media'
    AND lower(storage.extension(name)) = ANY (
      ARRAY['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'mp4', 'webm']
    )
  );
