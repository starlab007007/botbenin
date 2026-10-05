-- WAOUH Supabase integration/security hardening — 2026-10-05
-- Restrict privileged RPCs to the roles that actually invoke them.
-- Edge Functions use the service role; admin UIs use authenticated sessions.

-- Admin RPCs already validate auth.uid()/roles internally, but anonymous callers
-- should not even be able to invoke them.
REVOKE ALL ON FUNCTION public.admin_list_waouh_deals(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_waouh_deals(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_waouh_deals(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.waouh_admin_set_module_control(text,boolean,boolean,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_admin_set_module_control(text,boolean,boolean,text,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.waouh_admin_set_module_control(text,boolean,boolean,text,jsonb) TO authenticated, service_role;

-- Commerce transition is executed by trusted server-side orchestration only.
-- The function itself is SECURITY DEFINER and does not authenticate the caller,
-- so exposing it to anon/authenticated would allow direct state manipulation.
REVOKE ALL ON FUNCTION public.waouh_accept_negotiation_atomic(uuid,uuid,uuid,text,numeric,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_accept_negotiation_atomic(uuid,uuid,uuid,text,numeric,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_accept_negotiation_atomic(uuid,uuid,uuid,text,numeric,text) TO service_role;

-- Opportunity OS event writers are internal append/update primitives.
REVOKE ALL ON FUNCTION public.waouh_append_conversation_bus_event(uuid,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_append_conversation_bus_event(uuid,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_append_conversation_bus_event(uuid,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.waouh_append_opportunity_journey_event(uuid,text,text,smallint,text,text,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_append_opportunity_journey_event(uuid,text,text,smallint,text,text,text,jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_append_opportunity_journey_event(uuid,text,text,smallint,text,text,text,jsonb) TO service_role;
