-- Remove verified duplicate WAOUH indexes; keep one equivalent index per key.
DROP INDEX IF EXISTS public.waouh_messages_thread_idx;
DROP INDEX IF EXISTS public.idx_waouh_notifications_user_sent;

DROP INDEX IF EXISTS public.idx_partner_stock_movements_partner_created;
DROP INDEX IF EXISTS public.idx_partner_stock_movements_product_created;
DROP INDEX IF EXISTS public.idx_partner_stock_movements_user_created;

DROP INDEX IF EXISTS public.idx_presence_event_site_time;
DROP INDEX IF EXISTS public.idx_presence_member_user;
DROP INDEX IF EXISTS public.idx_presence_qr_site_expiry;

DROP INDEX IF EXISTS public.idx_stock_reorder_requests_user_status;
