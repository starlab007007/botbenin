-- Correction finale de l'ambiguïté
CREATE OR REPLACE FUNCTION public.get_owner_complete_stats(p_owner_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  total_bots bigint,
  active_bots bigint,
  total_users bigint,
  total_sessions bigint,
  total_messages bigint,
  active_users_24h bigint,
  active_sessions_24h bigint,
  messages_24h bigint,
  avg_session_duration numeric,
  avg_messages_per_session numeric,
  top_bot_id uuid,
  top_bot_name text,
  top_bot_messages bigint,
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id_internal uuid;
BEGIN
  SELECT bo.id INTO owner_id_internal
  FROM public.bot_owners bo
  WHERE bo.user_id = p_owner_user_id;
  
  IF owner_id_internal IS NULL THEN
    RAISE EXCEPTION 'Propriétaire de bot non trouvé pour l''utilisateur: %', p_owner_user_id;
  END IF;
  
  RETURN QUERY
  WITH bot_stats AS (
    SELECT 
      b.id as bot_id,
      b.name as bot_name,
      b.is_active,
      COUNT(DISTINCT bu.id) as bot_users,
      COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '24 hours' THEN bu.id END) as users_24h,
      COUNT(DISTINCT ecs.id) as bot_sessions,
      COUNT(DISTINCT CASE WHEN ecs.last_activity > NOW() - INTERVAL '24 hours' THEN ecs.id END) as sessions_24h,
      COUNT(DISTINCT cm.id) as bot_messages,
      COUNT(DISTINCT CASE WHEN cm.created_at > NOW() - INTERVAL '24 hours' THEN cm.id END) as msgs_24h,
      AVG(ecs.session_duration_minutes) as avg_duration,
      AVG(ecs.total_messages) as avg_msgs_per_session,
      MAX(GREATEST(
        COALESCE(bu.last_active, '1970-01-01'::timestamp with time zone), 
        COALESCE(cm.created_at, '1970-01-01'::timestamp with time zone), 
        COALESCE(ecs.last_activity, '1970-01-01'::timestamp with time zone)
      )) as bot_last_activity
    FROM public.bots b
    LEFT JOIN public.bot_users bu ON b.id = bu.bot_id
    LEFT JOIN public.enhanced_chat_sessions ecs ON b.id = ecs.bot_id
    LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
    WHERE b.owner_id = owner_id_internal
    GROUP BY b.id, b.name, b.is_active
  )
  SELECT 
    COUNT(DISTINCT bs.bot_id)::bigint as total_bots,
    COUNT(DISTINCT CASE WHEN bs.is_active = true THEN bs.bot_id END)::bigint as active_bots,
    COALESCE(SUM(bs.bot_users), 0)::bigint as total_users,
    COALESCE(SUM(bs.bot_sessions), 0)::bigint as total_sessions,
    COALESCE(SUM(bs.bot_messages), 0)::bigint as total_messages,
    COALESCE(SUM(bs.users_24h), 0)::bigint as active_users_24h,
    COALESCE(SUM(bs.sessions_24h), 0)::bigint as active_sessions_24h,
    COALESCE(SUM(bs.msgs_24h), 0)::bigint as messages_24h,
    ROUND(AVG(bs.avg_duration), 2) as avg_session_duration,
    ROUND(AVG(bs.avg_msgs_per_session), 2) as avg_messages_per_session,
    (SELECT bot_id FROM bot_stats ORDER BY bot_messages DESC LIMIT 1) as top_bot_id,
    (SELECT bot_name FROM bot_stats ORDER BY bot_messages DESC LIMIT 1) as top_bot_name,
    (SELECT bot_messages FROM bot_stats ORDER BY bot_messages DESC LIMIT 1) as top_bot_messages,
    MAX(bs.bot_last_activity) as last_activity
  FROM bot_stats bs;
END;
$$;;
