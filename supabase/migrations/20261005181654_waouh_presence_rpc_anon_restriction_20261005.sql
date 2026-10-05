-- WAOUH Presence authenticated-management RPC hardening — 2026-10-05
-- Used by signed-in Web/Flutter management flows.
-- Public QR endpoints remain intentionally anonymous and are not modified.

REVOKE ALL ON FUNCTION public.waouh_presence_set_member_status_v5(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waouh_presence_set_member_status_v5(uuid,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.waouh_presence_update_site_v5(uuid,text,text,numeric,numeric,integer,integer,boolean,boolean,boolean,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waouh_presence_update_site_v5(uuid,text,text,numeric,numeric,integer,integer,boolean,boolean,boolean,text,boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.waouh_presence_upsert_member_v5(uuid,uuid,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waouh_presence_upsert_member_v5(uuid,uuid,text,text,text,text,text,text) TO authenticated, service_role;
