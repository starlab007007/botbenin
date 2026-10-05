-- WAOUH Supabase hardening — views and function search paths.

-- SECURITY INVOKER makes underlying table privileges/RLS apply to the caller.
ALTER VIEW public.waouh_unified_offers SET (security_invoker = true);
ALTER VIEW public.waouh_unified_demands SET (security_invoker = true);
ALTER VIEW public.waouh_stock_external_records_active SET (security_invoker = true);
ALTER VIEW public.waouh_partner_stats_v SET (security_invoker = true);

-- The partner stats view was originally intended for authenticated users only.
REVOKE SELECT ON public.waouh_partner_stats_v FROM anon;
GRANT SELECT ON public.waouh_partner_stats_v TO authenticated, service_role;

-- Stock records are per-user through underlying RLS; no anonymous access.
REVOKE SELECT ON public.waouh_stock_external_records_active FROM anon;
GRANT SELECT ON public.waouh_stock_external_records_active TO authenticated, service_role;

-- Pin search_path for functions reported by Supabase's security advisor.
ALTER FUNCTION public.waouh_update_timestamp() SET search_path TO pg_catalog, public;
ALTER FUNCTION public.waouh_set_updated_at() SET search_path TO pg_catalog, public;
ALTER FUNCTION public.waouh_check_article_rate_limit() SET search_path TO pg_catalog, public;
ALTER FUNCTION public.waouh_presence_set_updated_at() SET search_path TO pg_catalog, public;
ALTER FUNCTION public.waouh_phone_identity_key(text) SET search_path TO pg_catalog, public;
ALTER FUNCTION public.waouh_presence_distance_meters(numeric,numeric,numeric,numeric) SET search_path TO pg_catalog, public;
ALTER FUNCTION public.waouh_presence_phone_digits(text) SET search_path TO pg_catalog, public;
