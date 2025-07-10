-- Corriger l'ambiguïté dans la fonction de statistiques

CREATE OR REPLACE FUNCTION public.get_owner_complete_stats(p_owner_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  -- Stats globales
  total_bots bigint,
  active_bots bigint,
  total_users bigint,
  total_sessions bigint,
  total_messages bigint,
  
  -- Stats 24h
  active_users_24h bigint,
  active_sessions_24h bigint,
  messages_24h bigint,
  
  -- Métriques
  avg_session_duration numeric,
  avg_messages_per_session numeric,
  
  -- Top bot
  top_bot_id uuid,
  top_bot_name text,
  top_bot_messages bigint,
  
  -- Activité récente
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id_internal uuid;
BEGIN
  -- Récupérer l'ID du propriétaire
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
        COALESCE(bu.last_active, '1970-01-01'::timestamp), 
        COALESCE(cm.created_at, '1970-01-01'::timestamp), 
        COALESCE(ecs.last_activity, '1970-01-01'::timestamp)
      )) as last_activity
    FROM public.bots b
    LEFT JOIN public.bot_users bu ON b.id = bu.bot_id
    LEFT JOIN public.enhanced_chat_sessions ecs ON b.id = ecs.bot_id
    LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
    WHERE b.owner_id = owner_id_internal
    GROUP BY b.id, b.name, b.is_active
  ),
  owner_aggregates AS (
    SELECT 
      COUNT(DISTINCT bot_id) as total_bots,
      COUNT(DISTINCT CASE WHEN is_active = true THEN bot_id END) as active_bots,
      SUM(bot_users) as total_users,
      SUM(bot_sessions) as total_sessions,
      SUM(bot_messages) as total_messages,
      SUM(users_24h) as active_users_24h,
      SUM(sessions_24h) as active_sessions_24h,
      SUM(msgs_24h) as messages_24h,
      AVG(avg_duration) as avg_session_duration,
      AVG(avg_msgs_per_session) as avg_messages_per_session,
      MAX(last_activity) as last_activity
    FROM bot_stats
  ),
  top_bot AS (
    SELECT 
      bot_id,
      bot_name,
      bot_messages
    FROM bot_stats
    ORDER BY bot_messages DESC
    LIMIT 1
  )
  SELECT 
    oa.total_bots,
    oa.active_bots,
    oa.total_users,
    oa.total_sessions,
    oa.total_messages,
    oa.active_users_24h,
    oa.active_sessions_24h,
    oa.messages_24h,
    oa.avg_session_duration,
    oa.avg_messages_per_session,
    tb.bot_id as top_bot_id,
    tb.bot_name as top_bot_name,
    tb.bot_messages as top_bot_messages,
    oa.last_activity
  FROM owner_aggregates oa
  CROSS JOIN top_bot tb;
END;
$$;