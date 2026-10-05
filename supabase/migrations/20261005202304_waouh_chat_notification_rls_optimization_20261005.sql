-- WAOUH Chat/Notification RLS hot-path optimization — 2026-10-05.
-- Consolidates permissive SELECT/UPDATE policies and evaluates auth/session
-- identity once per statement instead of once per row.

DROP POLICY IF EXISTS "waouh_messages admin read all" ON public.waouh_messages;
DROP POLICY IF EXISTS "waouh_messages auth user read" ON public.waouh_messages;
DROP POLICY IF EXISTS "waouh_messages session-scoped read" ON public.waouh_messages;
DROP POLICY IF EXISTS "waouh_messages authenticated read" ON public.waouh_messages;
DROP POLICY IF EXISTS "waouh_messages anonymous session read" ON public.waouh_messages;

CREATE POLICY "waouh_messages authenticated read"
ON public.waouh_messages
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.waouh_users owner
    WHERE owner.id = waouh_messages.user_id
      AND owner.auth_user_id = (SELECT auth.uid())
  )
  OR (
    web_session_id IS NOT NULL
    AND web_session_id = (
      SELECT NULLIF(
        (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
          ->> 'x-waouh-session'),
        ''
      )
    )
  )
);

CREATE POLICY "waouh_messages anonymous session read"
ON public.waouh_messages
FOR SELECT
TO anon
USING (
  web_session_id IS NOT NULL
  AND web_session_id = (
    SELECT NULLIF(
      (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session'),
      ''
    )
  )
);

DROP POLICY IF EXISTS "admin read notifications" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications auth user read" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications auth user update" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications session read token" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications session update token" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications authenticated read" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications anonymous session read" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications authenticated update" ON public.waouh_notifications;
DROP POLICY IF EXISTS "waouh_notifications anonymous session update" ON public.waouh_notifications;

CREATE POLICY "waouh_notifications authenticated read"
ON public.waouh_notifications
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.waouh_users owner
    WHERE owner.id = waouh_notifications.user_id
      AND owner.auth_user_id = (SELECT auth.uid())
  )
  OR (
    web_session_id IS NOT NULL
    AND web_session_id = (
      SELECT NULLIF(
        (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
          ->> 'x-waouh-session'),
        ''
      )
    )
  )
);

CREATE POLICY "waouh_notifications anonymous session read"
ON public.waouh_notifications
FOR SELECT
TO anon
USING (
  web_session_id IS NOT NULL
  AND web_session_id = (
    SELECT NULLIF(
      (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session'),
      ''
    )
  )
);

CREATE POLICY "waouh_notifications authenticated update"
ON public.waouh_notifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.waouh_users owner
    WHERE owner.id = waouh_notifications.user_id
      AND owner.auth_user_id = (SELECT auth.uid())
  )
  OR (
    web_session_id IS NOT NULL
    AND web_session_id = (
      SELECT NULLIF(
        (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
          ->> 'x-waouh-session'),
        ''
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.waouh_users owner
    WHERE owner.id = waouh_notifications.user_id
      AND owner.auth_user_id = (SELECT auth.uid())
  )
  OR (
    web_session_id IS NOT NULL
    AND web_session_id = (
      SELECT NULLIF(
        (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
          ->> 'x-waouh-session'),
        ''
      )
    )
  )
);

CREATE POLICY "waouh_notifications anonymous session update"
ON public.waouh_notifications
FOR UPDATE
TO anon
USING (
  web_session_id IS NOT NULL
  AND web_session_id = (
    SELECT NULLIF(
      (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session'),
      ''
    )
  )
)
WITH CHECK (
  web_session_id IS NOT NULL
  AND web_session_id = (
    SELECT NULLIF(
      (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session'),
      ''
    )
  )
);
