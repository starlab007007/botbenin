-- WAOUH admin guard normalization — 2026-10-05
-- Keeps the role guard canonical if a controlled test and migration both touched
-- the same function definitions.

DO $$
DECLARE
  sig regprocedure;
  ddl text;
  next_ddl text;
  canonical text := '(public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''super_admin''))';
  duplicated text := '((public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''super_admin'')) OR public.has_role(auth.uid(), ''super_admin''))';
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

    LOOP
      next_ddl := replace(ddl, duplicated, canonical);
      EXIT WHEN next_ddl = ddl;
      ddl := next_ddl;
    END LOOP;

    EXECUTE ddl;
  END LOOP;
END $$;
