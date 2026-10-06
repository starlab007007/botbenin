REVOKE UPDATE ON TABLE public.waouh_notifications FROM anon, authenticated;
GRANT UPDATE (opened, read_at) ON TABLE public.waouh_notifications TO anon, authenticated;
