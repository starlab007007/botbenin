-- A session header is a guest capability, never proof of another account's identity.
CREATE SCHEMA IF NOT EXISTS waouh_private;
REVOKE ALL ON SCHEMA waouh_private FROM PUBLIC;
GRANT USAGE ON SCHEMA waouh_private TO anon, authenticated;

-- Callable only by the service role after the Edge guard has validated the JWT.
-- SECURITY INVOKER preserves the caller's privileges; public clients cannot execute it.
CREATE OR REPLACE FUNCTION public.waouh_session_scope_allowed_for_actor(p_session_id text, p_auth_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT nullif(p_session_id, '') IS NULL OR (
    NOT EXISTS (
      SELECT 1 FROM public.waouh_users u
      WHERE u.web_session_id = p_session_id AND u.auth_user_id IS NOT NULL
        AND u.auth_user_id IS DISTINCT FROM p_auth_user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.waouh_messages m
      JOIN public.waouh_users u ON u.id = m.user_id
      WHERE m.web_session_id = p_session_id AND u.auth_user_id IS NOT NULL
        AND u.auth_user_id IS DISTINCT FROM p_auth_user_id
    )
  );
$$;
REVOKE ALL ON FUNCTION public.waouh_session_scope_allowed_for_actor(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_session_scope_allowed_for_actor(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION waouh_private.session_scope_allowed()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.waouh_session_scope_allowed_for_actor(
    nullif(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-waouh-session', ''),
    (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION waouh_private.session_scope_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION waouh_private.session_scope_allowed() TO anon, authenticated;
COMMENT ON FUNCTION waouh_private.session_scope_allowed() IS
'RLS-only helper in a non-exposed schema. Validates the current JWT owner of the supplied session, including message-only sessions.';

ALTER TABLE public.waouh_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_outbound_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waouh_session_owner_guard ON public.waouh_users;
CREATE POLICY waouh_session_owner_guard ON public.waouh_users AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING ((SELECT waouh_private.session_scope_allowed()))
WITH CHECK ((SELECT waouh_private.session_scope_allowed()));

DROP POLICY IF EXISTS waouh_session_owner_guard ON public.waouh_messages;
CREATE POLICY waouh_session_owner_guard ON public.waouh_messages AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING ((SELECT waouh_private.session_scope_allowed()))
WITH CHECK ((SELECT waouh_private.session_scope_allowed()));

DROP POLICY IF EXISTS waouh_session_owner_guard ON public.waouh_notifications;
CREATE POLICY waouh_session_owner_guard ON public.waouh_notifications AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING ((SELECT waouh_private.session_scope_allowed()))
WITH CHECK ((SELECT waouh_private.session_scope_allowed()));

DROP POLICY IF EXISTS waouh_session_owner_guard ON public.waouh_outbound_queue;
CREATE POLICY waouh_session_owner_guard ON public.waouh_outbound_queue AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING ((SELECT waouh_private.session_scope_allowed()))
WITH CHECK ((SELECT waouh_private.session_scope_allowed()));

-- Recheck the row owner after a concurrent claim; a cached statement-level guard
-- alone must not allow an already claimed identity to be reassigned.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'waouh_users'
      AND policyname = 'waouh_users link self session'
  ) THEN
    EXECUTE $policy$
      ALTER POLICY "waouh_users link self session" ON public.waouh_users
      USING (
        (auth_user_id IS NULL OR auth_user_id = (SELECT auth.uid()))
        AND web_session_id IS NOT NULL
        AND web_session_id = nullif(
          coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-waouh-session', ''
        )
      )
    $policy$;
  END IF;
END
$migration$;
