-- WAOUH Presence explicit anon revoke — 2026-10-05
-- Removes legacy direct anon grants that are not covered by revoking PUBLIC.

REVOKE EXECUTE ON FUNCTION public.waouh_presence_set_member_status_v5(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.waouh_presence_update_site_v5(uuid,text,text,numeric,numeric,integer,integer,boolean,boolean,boolean,text,boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.waouh_presence_upsert_member_v5(uuid,uuid,text,text,text,text,text,text) FROM anon;
