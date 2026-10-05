-- WAOUH RPC surface reduction — 2026-10-05
-- These helpers are used by trusted Edge Functions or backend SQL only.

REVOKE ALL ON FUNCTION public.waouh_search_unified(text,text,text,double precision,double precision,numeric,integer,text,text,boolean,boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_search_unified(text,text,text,double precision,double precision,numeric,integer,text,text,boolean,boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_search_unified(text,text,text,double precision,double precision,numeric,integer,text,text,boolean,boolean) TO service_role;

REVOKE ALL ON FUNCTION public.waouh_user_pair_distance_km(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_user_pair_distance_km(uuid,uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_user_pair_distance_km(uuid,uuid) TO service_role;

REVOKE ALL ON FUNCTION public.waouh_point_distance_km(uuid,double precision,double precision) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_point_distance_km(uuid,double precision,double precision) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_point_distance_km(uuid,double precision,double precision) TO service_role;

REVOKE ALL ON FUNCTION public.waouh_article_distance_km(uuid,double precision,double precision) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_article_distance_km(uuid,double precision,double precision) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_article_distance_km(uuid,double precision,double precision) TO service_role;

REVOKE ALL ON FUNCTION public.waouh_product_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_product_owner(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_product_owner(uuid) TO service_role;

-- Source migration intended this RPC for authenticated/service callers only.
REVOKE ALL ON FUNCTION public.waouh_module_control_state(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_module_control_state(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.waouh_module_control_state(text) TO authenticated, service_role;
