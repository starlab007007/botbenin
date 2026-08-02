-- ===================================================================
-- CORRECTION DES 13 VUES SECURITY DEFINER - VERSION FINALE
-- ===================================================================

-- 1. admin_dashboard_stats
DROP VIEW IF EXISTS public.admin_dashboard_stats CASCADE;
CREATE VIEW public.admin_dashboard_stats 
WITH (security_invoker = true)
AS
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.last_activity > NOW() - INTERVAL '24 hours' THEN u.id END) as active_users,
  COUNT(DISTINCT CASE WHEN u.status = 'suspended' THEN u.id END) as suspended_users,
  COUNT(DISTINCT CASE WHEN u.last_activity < NOW() - INTERVAL '30 days' THEN u.id END) as inactive_users,
  COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '30 days' THEN u.id END) as new_users_30d,
  COALESCE((SELECT COUNT(*) FROM public.bots), 0) as total_bots,
  COALESCE((SELECT COUNT(*) FROM public.bots WHERE created_at > NOW() - INTERVAL '30 days'), 0) as new_bots_30d,
  COALESCE((SELECT COUNT(*) FROM public.chat_messages WHERE created_at > NOW() - INTERVAL '24 hours'), 0) as messages_24h,
  COALESCE((SELECT COUNT(DISTINCT bu.id) FROM public.bot_users bu WHERE bu.last_active > NOW() - INTERVAL '24 hours'), 0) as active_chat_users_24h,
  COALESCE((SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active'), 0) as active_subscriptions,
  COALESCE((SELECT SUM(click_count) FROM public.shortened_links), 0) as total_link_clicks
FROM public.users u;

-- 2. bot_conversation_history
DROP VIEW IF EXISTS public.bot_conversation_history CASCADE;
CREATE VIEW public.bot_conversation_history
WITH (security_invoker = true)
AS
SELECT 
  cm.id as message_id,
  cm.message_content,
  cm.message_type,
  cm.created_at as message_timestamp,
  COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
  bu.user_email,
  COALESCE(bu.session_id, cm.metadata->>'session_token') as session_id,
  bu.id as bot_user_id,
  bu.created_at as user_first_seen,
  bu.last_active as user_last_active,
  cm.ip_address,
  cm.user_agent,
  cm.bot_id,
  b.name as bot_name,
  b.owner_id,
  ecs.id as session_id_full,
  ecs.started_at as session_start,
  ecs.ended_at as session_end,
  ecs.total_messages as session_message_count,
  ecs.session_metadata,
  ROW_NUMBER() OVER (PARTITION BY ecs.id ORDER BY cm.created_at) as message_order_in_session
FROM public.chat_messages cm
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
LEFT JOIN public.bots b ON cm.bot_id = b.id
LEFT JOIN public.enhanced_chat_sessions ecs ON ecs.bot_user_id = bu.id;

-- 3. bot_message_history
DROP VIEW IF EXISTS public.bot_message_history CASCADE;
CREATE VIEW public.bot_message_history
WITH (security_invoker = true)
AS
SELECT 
  cm.id as message_id,
  cm.bot_id,
  cm.message_content,
  cm.message_type,
  cm.created_at as message_timestamp,
  cm.ip_address,
  cm.user_agent,
  cm.metadata,
  bu.id as bot_user_id,
  COALESCE(bu.user_name, 'Anonyme') as user_name,
  bu.user_email,
  bu.session_id,
  bu.created_at as user_first_seen,
  bu.last_active as user_last_active,
  b.name as bot_name,
  b.owner_id
FROM public.chat_messages cm
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
LEFT JOIN public.bots b ON cm.bot_id = b.id;

-- 4. bot_owner_conversations
DROP VIEW IF EXISTS public.bot_owner_conversations CASCADE;
CREATE VIEW public.bot_owner_conversations
WITH (security_invoker = true)
AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  bu.id as bot_user_id,
  bu.user_name,
  bu.user_email,
  bu.session_id,
  bu.created_at as user_first_seen,
  bu.last_active as user_last_active,
  MIN(cm.created_at) as conversation_start,
  MAX(cm.created_at) as last_message_at,
  COUNT(cm.id) as message_count,
  MAX(CASE WHEN cm.message_type = 'user' THEN cm.message_content END) as last_user_message,
  MAX(CASE WHEN cm.message_type = 'bot' THEN cm.message_content END) as last_bot_message,
  (MAX(cm.created_at) > NOW() - INTERVAL '24 hours') as is_active_today
FROM public.bots b
JOIN public.bot_users bu ON b.id = bu.bot_id
LEFT JOIN public.chat_messages cm ON bu.id = cm.bot_user_id
GROUP BY b.id, b.name, b.owner_id, bu.id, bu.user_name, bu.user_email, bu.session_id, bu.created_at, bu.last_active;

-- 5. bot_performance_metrics
DROP VIEW IF EXISTS public.bot_performance_metrics CASCADE;
CREATE VIEW public.bot_performance_metrics
WITH (security_invoker = true)
AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  DATE_TRUNC('day', cm.created_at) as date,
  COUNT(DISTINCT cm.id) as total_messages,
  COUNT(DISTINCT CASE WHEN cm.message_type = 'user' THEN cm.id END) as user_messages,
  COUNT(DISTINCT CASE WHEN cm.message_type = 'bot' THEN cm.id END) as bot_responses,
  COUNT(DISTINCT bu.id) as unique_users,
  COUNT(DISTINCT bu.session_id) as sessions,
  COUNT(DISTINCT cm.ip_address) as unique_ips,
  CASE WHEN COUNT(DISTINCT bu.session_id) > 0 
    THEN ROUND(COUNT(cm.id)::numeric / COUNT(DISTINCT bu.session_id), 2) 
    ELSE 0 END as avg_messages_per_session,
  ROUND(AVG(EXTRACT(EPOCH FROM (bu.last_active - bu.created_at)) / 60), 2) as avg_session_duration_minutes
FROM public.bots b
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
GROUP BY b.id, b.name, b.owner_id, DATE_TRUNC('day', cm.created_at);

-- 6. bot_stats
DROP VIEW IF EXISTS public.bot_stats CASCADE;
CREATE VIEW public.bot_stats
WITH (security_invoker = true)
AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  COUNT(DISTINCT cm.id) as total_messages,
  COUNT(DISTINCT bu.id) as total_users,
  COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '24 hours' THEN bu.id END) as active_today,
  MAX(cm.created_at) as last_message_at
FROM public.bots b
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
GROUP BY b.id, b.name, b.owner_id;

-- 7. bot_visitor_analytics
DROP VIEW IF EXISTS public.bot_visitor_analytics CASCADE;
CREATE VIEW public.bot_visitor_analytics
WITH (security_invoker = true)
AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  COUNT(DISTINCT avs.fingerprint_id) as unique_visitors,
  COUNT(DISTINCT CASE WHEN avs.started_at > NOW() - INTERVAL '24 hours' THEN avs.fingerprint_id END) as unique_visitors_24h,
  COUNT(DISTINCT CASE WHEN avs.started_at > NOW() - INTERVAL '7 days' THEN avs.fingerprint_id END) as unique_visitors_7d,
  COUNT(DISTINCT avs.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN avs.started_at > NOW() - INTERVAL '24 hours' THEN avs.id END) as sessions_24h,
  COUNT(DISTINCT CASE WHEN avs.started_at > NOW() - INTERVAL '7 days' THEN avs.id END) as sessions_7d,
  COUNT(DISTINCT CASE WHEN avs.started_at > NOW() - INTERVAL '30 days' THEN avs.id END) as sessions_30d,
  COUNT(DISTINCT CASE WHEN avs.is_active = true THEN avs.id END) as active_sessions,
  COUNT(DISTINCT CASE WHEN avs.entry_point = 'shortened_link' THEN avs.id END) as sessions_from_short_links,
  COUNT(DISTINCT CASE WHEN avs.entry_point IN ('social_share', 'facebook', 'twitter') THEN avs.id END) as sessions_from_social,
  COUNT(DISTINCT CASE WHEN avs.entry_point = 'direct' THEN avs.id END) as sessions_direct,
  COUNT(DISTINCT CASE WHEN avs.converted_to_lead = true THEN avs.id END) as converted_sessions,
  AVG(avs.time_spent_seconds) as avg_time_spent_seconds,
  AVG(avs.pages_visited) as avg_pages_per_session,
  AVG(avs.total_interactions) as avg_interactions_per_session,
  MAX(avs.last_activity) as last_visitor_activity,
  CASE WHEN COUNT(DISTINCT avs.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN avs.converted_to_lead = true THEN avs.id END)::numeric / COUNT(DISTINCT avs.id) * 100), 2)
    ELSE 0 END as conversion_rate_percent
FROM public.bots b
LEFT JOIN public.anonymous_visitor_sessions avs ON b.id = avs.bot_id
GROUP BY b.id, b.name, b.owner_id;

-- 8. complete_bot_analytics
DROP VIEW IF EXISTS public.complete_bot_analytics CASCADE;
CREATE VIEW public.complete_bot_analytics
WITH (security_invoker = true)
AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  b.is_active,
  b.share_enabled,
  b.created_at as bot_created_at,
  COUNT(DISTINCT cm.id) as total_messages,
  COUNT(DISTINCT CASE WHEN cm.message_type = 'user' THEN cm.id END) as user_messages,
  COUNT(DISTINCT CASE WHEN cm.message_type = 'bot' THEN cm.id END) as bot_messages,
  COUNT(DISTINCT bu.id) as total_unique_users,
  COUNT(DISTINCT bu.session_id) as total_sessions,
  COUNT(DISTINCT CASE WHEN ecs.is_active = true THEN ecs.id END) as active_sessions,
  COUNT(DISTINCT CASE WHEN cm.created_at > NOW() - INTERVAL '24 hours' THEN cm.id END) as messages_24h,
  COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '24 hours' THEN bu.id END) as active_users_24h,
  COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '7 days' THEN bu.id END) as active_users_7d,
  COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '30 days' THEN bu.id END) as active_users_30d,
  COUNT(DISTINCT CASE WHEN ecs.started_at > NOW() - INTERVAL '24 hours' THEN ecs.id END) as sessions_24h,
  COUNT(DISTINCT sl.id) as total_short_links,
  COALESCE(SUM(sl.click_count), 0) as total_link_clicks,
  MAX(cm.created_at) as last_message_at,
  MAX(bu.last_active) as last_user_activity,
  CASE WHEN COUNT(DISTINCT bu.session_id) > 0 
    THEN ROUND(COUNT(cm.id)::numeric / COUNT(DISTINCT bu.session_id), 2) 
    ELSE 0 END as avg_messages_per_session,
  ROUND(AVG(EXTRACT(EPOCH FROM (ecs.ended_at - ecs.started_at)) / 60), 2) as avg_session_duration_minutes,
  CASE WHEN COUNT(DISTINCT CASE WHEN cm.message_type = 'user' THEN cm.id END) > 0
    THEN ROUND((COUNT(DISTINCT CASE WHEN cm.message_type = 'bot' THEN cm.id END)::numeric / 
         COUNT(DISTINCT CASE WHEN cm.message_type = 'user' THEN cm.id END) * 100), 2)
    ELSE 0 END as response_rate_percent,
  CASE WHEN COUNT(DISTINCT CASE WHEN bu.last_active BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN bu.id END) > 0
    THEN ROUND((COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '7 days' THEN bu.id END)::numeric / 
         COUNT(DISTINCT CASE WHEN bu.last_active BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN bu.id END) * 100), 2)
    ELSE 0 END as engagement_rate_7d
FROM public.users u
CROSS JOIN public.bots b
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
LEFT JOIN public.enhanced_chat_sessions ecs ON ecs.bot_id = b.id
LEFT JOIN public.shortened_links sl ON sl.bot_id = b.id
GROUP BY b.id, b.name, b.owner_id, b.is_active, b.share_enabled, b.created_at;

-- 9. detailed_bot_stats
DROP VIEW IF EXISTS public.detailed_bot_stats CASCADE;
CREATE VIEW public.detailed_bot_stats
WITH (security_invoker = true)
AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  b.is_active,
  COUNT(DISTINCT cm.id) as total_messages,
  COUNT(DISTINCT CASE WHEN cm.message_type = 'user' THEN cm.id END) as user_messages,
  COUNT(DISTINCT CASE WHEN cm.message_type = 'bot' THEN cm.id END) as bot_messages,
  COUNT(DISTINCT bu.id) as total_unique_users,
  COUNT(DISTINCT bu.session_id) as total_sessions,
  COUNT(DISTINCT CASE WHEN ecs.is_active = true THEN ecs.id END) as active_sessions,
  COUNT(DISTINCT CASE WHEN cm.created_at > NOW() - INTERVAL '24 hours' THEN cm.id END) as messages_24h,
  COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '24 hours' THEN bu.id END) as active_users_24h,
  COUNT(DISTINCT CASE WHEN ecs.started_at > NOW() - INTERVAL '24 hours' THEN ecs.id END) as sessions_24h,
  COUNT(DISTINCT sl.id) as total_short_links,
  COALESCE(SUM(sl.click_count), 0) as total_link_clicks,
  MAX(cm.created_at) as last_message_at,
  MAX(bu.last_active) as last_user_activity,
  CASE WHEN COUNT(DISTINCT bu.session_id) > 0 
    THEN ROUND(COUNT(cm.id)::numeric / COUNT(DISTINCT bu.session_id), 2) 
    ELSE 0 END as avg_messages_per_session,
  ROUND(AVG(EXTRACT(EPOCH FROM (ecs.ended_at - ecs.started_at)) / 60), 2) as avg_session_duration_minutes
FROM public.bots b
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
LEFT JOIN public.enhanced_chat_sessions ecs ON ecs.bot_id = b.id
LEFT JOIN public.shortened_links sl ON sl.bot_id = b.id
GROUP BY b.id, b.name, b.owner_id, b.is_active;

-- 10. ia_creator_admin_stats (CORRIGÉ avec les bons noms de colonnes)
DROP VIEW IF EXISTS public.ia_creator_admin_stats CASCADE;
CREATE VIEW public.ia_creator_admin_stats
WITH (security_invoker = true)
AS
SELECT 
  COUNT(DISTINCT uu.user_id) as total_users,
  SUM(uu.images_created) as total_images,
  SUM(uu.flyers_created) as total_flyers,
  SUM(uu.videos_created) as total_videos,
  SUM(uu.images_created + uu.flyers_created + uu.videos_created) as total_creations,
  COUNT(DISTINCT CASE WHEN uu.updated_at > NOW() - INTERVAL '24 hours' THEN uu.user_id END) as active_users_24h,
  COUNT(DISTINCT CASE WHEN uu.updated_at > NOW() - INTERVAL '7 days' THEN uu.user_id END) as active_users_7d,
  COUNT(DISTINCT CASE WHEN uu.updated_at > NOW() - INTERVAL '30 days' THEN uu.user_id END) as active_users_30d,
  COALESCE(AVG(uu.images_created + uu.flyers_created + uu.videos_created), 0) as avg_creations_per_user
FROM public.ia_creator_user_usage uu;

-- 11. unified_conversation_history
DROP VIEW IF EXISTS public.unified_conversation_history CASCADE;
CREATE VIEW public.unified_conversation_history
WITH (security_invoker = true)
AS
SELECT 
  cm.id as message_id,
  cm.bot_id,
  cm.message_content,
  cm.message_type,
  cm.created_at as message_timestamp,
  bu.id as bot_user_id,
  bu.user_name,
  bu.user_email,
  bu.session_id,
  b.name as bot_name,
  b.owner_id
FROM public.chat_messages cm
JOIN public.bot_users bu ON cm.bot_user_id = bu.id
JOIN public.bots b ON cm.bot_id = b.id;

-- 12. user_permission_details
DROP VIEW IF EXISTS public.user_permission_details CASCADE;
CREATE VIEW public.user_permission_details
WITH (security_invoker = true)
AS
SELECT 
  ur.user_id,
  r.name as role_name,
  dp.name as permission_name,
  dp.description as permission_description,
  dp.category as permission_category
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.detailed_permissions dp ON rp.permission_id = dp.id
UNION
SELECT 
  up.user_id,
  NULL as role_name,
  dp.name as permission_name,
  dp.description as permission_description,
  dp.category as permission_category
FROM public.user_permissions up
JOIN public.detailed_permissions dp ON up.permission_id = dp.id
WHERE up.expires_at IS NULL OR up.expires_at > NOW();

-- 13. user_stats
DROP VIEW IF EXISTS public.user_stats CASCADE;
CREATE VIEW public.user_stats
WITH (security_invoker = true)
AS
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  u.status,
  u.created_at as user_created_at,
  u.last_activity,
  COUNT(DISTINCT b.id) as total_bots,
  COUNT(DISTINCT CASE WHEN b.is_active = true THEN b.id END) as active_bots,
  COUNT(DISTINCT ssc.id) as total_campaigns,
  COUNT(DISTINCT CASE WHEN ssc.is_active = true THEN ssc.id END) as active_campaigns
FROM public.users u
LEFT JOIN public.bot_owners bo ON u.id = bo.user_id
LEFT JOIN public.bots b ON bo.id = b.owner_id
LEFT JOIN public.social_sharing_campaigns ssc ON bo.id = ssc.owner_id
GROUP BY u.id, u.email, u.full_name, u.status, u.created_at, u.last_activity;;
