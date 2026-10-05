-- WAOUH internal cache/rate tables service-only — 2026-10-05
-- These tables are technical implementation details used from trusted Edge/server code.

REVOKE ALL PRIVILEGES ON TABLE public.waouh_cache FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.wa_rate_buckets FROM anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.waouh_cache TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.wa_rate_buckets TO service_role;
