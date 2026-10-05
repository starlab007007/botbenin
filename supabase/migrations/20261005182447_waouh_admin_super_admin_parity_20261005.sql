-- WAOUH admin / super_admin parity — 2026-10-05
-- public.has_role() performs an exact role-name match.
-- These privileged RPCs must therefore explicitly accept both admin roles.

DO $$
DECLARE
  sig regprocedure;
  ddl text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.admin_list_waouh_deals(integer)'::regprocedure,
    'public.waouh_admin_signal_fabric_search(text,text,text,text,text,text,text,integer,integer)'::regprocedure,
    'public.waouh_admin_signal_fabric_stats()'::regprocedure,
    'public.waouh_match_signal(uuid)'::regprocedure,
    'public.waouh_promote_signal(uuid)'::regprocedure,
    'public.waouh_radar_forget(text)'::regprocedure
  ]
  LOOP
    SELECT pg_get_functiondef(sig) INTO ddl;

    ddl := regexp_replace(
      ddl,
      'public\.has_role\(auth\.uid\(\),\s*''admin''\)',
      '(public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''super_admin''))',
      'g'
    );

    EXECUTE ddl;
  END LOOP;
END $$;
