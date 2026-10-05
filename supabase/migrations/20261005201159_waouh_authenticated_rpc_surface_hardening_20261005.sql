-- WAOUH authenticated RPC surface hardening — 2026-10-05
-- Public access is retained only for the intentionally anonymous Presence v6
-- endpoints protected by QR token / PIN logic.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid,
           n.nspname,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.prosecdef
      AND has_function_privilege('anon',p.oid,'EXECUTE')
      AND (p.proname LIKE 'waouh_%' OR p.proname LIKE '%whatsapp%')
      AND NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        WHERE t.tgfoid=p.oid AND NOT t.tgisinternal
      )
      AND (
        pg_get_functiondef(p.oid) ILIKE '%auth.uid()%'
        OR pg_get_functiondef(p.oid) ILIKE '%has_role(%'
        OR pg_get_functiondef(p.oid) ILIKE '%auth.role()%'
      )
      AND p.proname NOT IN (
        'waouh_presence_public_preview_v6',
        'waouh_presence_record_qr_action_public_v6'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;
