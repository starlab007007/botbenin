-- WAOUH Supabase SECURITY DEFINER execution hardening — 2026-10-05
-- Applied to production first through the controlled Supabase release path.
--
-- Goals:
-- 1. remove direct Data API access to the legacy WhatsApp permission grant RPCs;
-- 2. prevent SECURITY DEFINER trigger functions from being exposed as callable RPCs;
-- 3. preserve service_role access for trusted server-side operations.
--
-- Trigger execution is unaffected by revoking EXECUTE from anon/authenticated:
-- the functions remain attached to their existing database triggers.

REVOKE ALL ON FUNCTION public.grant_whatsapp_permissions_to_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_whatsapp_permissions_to_user(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_whatsapp_permissions_to_user(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.grant_whatsapp_permissions_to_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_whatsapp_permissions_to_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_whatsapp_permissions_to_new_user() TO service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      p.oid,
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND EXISTS (
        SELECT 1
        FROM pg_trigger t
        WHERE t.tgfoid = p.oid
          AND NOT t.tgisinternal
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC',
      r.nspname,
      r.proname,
      r.args
    );
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, authenticated',
      r.nspname,
      r.proname,
      r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.nspname,
      r.proname,
      r.args
    );
  END LOOP;
END $$;
