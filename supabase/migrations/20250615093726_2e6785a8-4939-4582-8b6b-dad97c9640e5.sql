
-- Create the admin dashboard stats function
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  active_users_24h bigint,
  active_users_7d bigint,
  new_users_30d bigint,
  total_bots bigint,
  active_bots bigint,
  total_campaigns bigint,
  active_campaigns bigint,
  total_messages_24h bigint,
  total_subscriptions bigint,
  revenue_monthly numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT CASE WHEN u.last_activity > NOW() - INTERVAL '24 hours' THEN u.id END) as active_users_24h,
    COUNT(DISTINCT CASE WHEN u.last_activity > NOW() - INTERVAL '7 days' THEN u.id END) as active_users_7d,
    COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '30 days' THEN u.id END) as new_users_30d,
    COALESCE((SELECT COUNT(*) FROM public.bots), 0) as total_bots,
    COALESCE((SELECT COUNT(*) FROM public.bots WHERE share_enabled = true), 0) as active_bots,
    COALESCE((SELECT COUNT(*) FROM public.social_sharing_campaigns), 0) as total_campaigns,
    COALESCE((SELECT COUNT(*) FROM public.social_sharing_campaigns WHERE is_active = true), 0) as active_campaigns,
    COALESCE((SELECT COUNT(*) FROM public.chat_messages WHERE created_at > NOW() - INTERVAL '24 hours'), 0) as total_messages_24h,
    COALESCE((SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active'), 0) as total_subscriptions,
    COALESCE((SELECT SUM(sp.price) FROM public.subscriptions s JOIN public.subscription_plans sp ON s.plan_id = sp.id WHERE s.status = 'active'), 0) as revenue_monthly
  FROM public.users u;
$$;
;
