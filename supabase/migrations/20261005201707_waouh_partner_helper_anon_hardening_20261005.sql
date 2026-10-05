-- WAOUH partner helper anonymous-execution hardening — 2026-10-05.
-- These helpers participate in authenticated RLS checks and do not need to be
-- callable by anonymous clients.

REVOKE EXECUTE ON FUNCTION public.has_partner_permission(uuid,public.waouh_partner_permission) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_partner_permission(uuid,public.waouh_partner_permission) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_waouh_partner_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_waouh_partner_owner(uuid) TO authenticated, service_role;
