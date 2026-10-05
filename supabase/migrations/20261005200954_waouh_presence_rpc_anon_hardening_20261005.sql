-- Migration-history alignment for production Supabase — 2026-10-05.
-- This remote migration was recorded after the equivalent hardening had already
-- been versioned in:
--   20261005181654_waouh_presence_rpc_anon_restriction_20261005.sql
--   20261005181821_waouh_presence_explicit_anon_revoke_20261005.sql
--
-- Statements are intentionally idempotent so fresh environments can replay the
-- complete remote history without changing the intended permissions.

REVOKE ALL ON FUNCTION public.waouh_presence_set_member_status_v5(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waouh_presence_set_member_status_v5(uuid,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.waouh_presence_update_site_v5(uuid,text,text,numeric,numeric,integer,integer,boolean,boolean,boolean,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waouh_presence_update_site_v5(uuid,text,text,numeric,numeric,integer,integer,boolean,boolean,boolean,text,boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.waouh_presence_upsert_member_v5(uuid,uuid,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waouh_presence_upsert_member_v5(uuid,uuid,text,text,text,text,text,text) TO authenticated, service_role;
