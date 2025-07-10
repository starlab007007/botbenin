-- Corriger la migration précédente - Partie 1: Vue et fonctions

-- ===========================
-- 1. AMÉLIORATION DES POLICIES RLS EXISTANTES
-- ===========================

-- Policy pour enhanced_chat_sessions (corriger s'il y en a déjà)
ALTER TABLE public.enhanced_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bot owners can view their enhanced sessions" ON public.enhanced_chat_sessions;
DROP POLICY IF EXISTS "Bot owners can manage their enhanced sessions" ON public.enhanced_chat_sessions;

CREATE POLICY "Bot owners full access to enhanced sessions" 
ON public.enhanced_chat_sessions 
FOR ALL 
USING (
  bot_id IN (
    SELECT b.id 
    FROM public.bots b 
    JOIN public.bot_owners bo ON b.owner_id = bo.id 
    WHERE bo.user_id = auth.uid()
  )
)
WITH CHECK (
  bot_id IN (
    SELECT b.id 
    FROM public.bots b 
    JOIN public.bot_owners bo ON b.owner_id = bo.id 
    WHERE bo.user_id = auth.uid()
  )
);

-- ===========================
-- 2. FONCTIONS POUR L'ACCÈS COMPLET AUX DONNÉES
-- ===========================

-- Fonction pour récupérer TOUTES les statistiques d'un propriétaire
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
      COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '24 hours' THEN bu.id END) as active_users_24h,
      COUNT(DISTINCT ecs.id) as bot_sessions,
      COUNT(DISTINCT CASE WHEN ecs.last_activity > NOW() - INTERVAL '24 hours' THEN ecs.id END) as active_sessions_24h,
      COUNT(DISTINCT cm.id) as bot_messages,
      COUNT(DISTINCT CASE WHEN cm.created_at > NOW() - INTERVAL '24 hours' THEN cm.id END) as messages_24h,
      AVG(ecs.session_duration_minutes) as avg_duration,
      AVG(ecs.total_messages) as avg_msgs_per_session,
      MAX(GREATEST(bu.last_active, cm.created_at, ecs.last_activity)) as last_activity
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
      SUM(active_users_24h) as active_users_24h,
      SUM(active_sessions_24h) as active_sessions_24h,
      SUM(messages_24h) as messages_24h,
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
    oa.*,
    tb.bot_id as top_bot_id,
    tb.bot_name as top_bot_name,
    tb.bot_messages as top_bot_messages
  FROM owner_aggregates oa
  CROSS JOIN top_bot tb;
END;
$$;

-- Fonction pour récupérer TOUS les messages d'un bot avec détails complets
CREATE OR REPLACE FUNCTION public.get_bot_complete_history(
  p_bot_id uuid,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_session_filter text DEFAULT NULL
)
RETURNS TABLE(
  message_id uuid,
  bot_id uuid,
  bot_user_id uuid,
  session_token text,
  message_content text,
  message_type text,
  message_timestamp timestamp with time zone,
  ip_address text,
  user_agent text,
  metadata jsonb,
  
  -- Infos utilisateur
  user_name text,
  user_email text,
  user_first_seen timestamp with time zone,
  user_last_active timestamp with time zone,
  
  -- Infos session
  session_started_at timestamp with time zone,
  session_duration_minutes numeric,
  session_total_messages integer,
  session_is_active boolean,
  session_entry_point text,
  
  -- Infos bot
  bot_name text,
  owner_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_owner boolean;
BEGIN
  -- Vérifier la propriété
  SELECT EXISTS (
    SELECT 1
    FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_owner;
  
  IF NOT is_owner THEN
    RAISE EXCEPTION 'Accès refusé: vous n''êtes pas propriétaire de ce bot.';
  END IF;
  
  RETURN QUERY
  SELECT 
    cm.id as message_id,
    cm.bot_id,
    cm.bot_user_id,
    COALESCE(
      bu.session_id,
      ecs.session_token,
      cm.metadata->>'session_token',
      'unknown'
    ) as session_token,
    cm.message_content,
    cm.message_type,
    cm.created_at as message_timestamp,
    cm.ip_address,
    cm.user_agent,
    cm.metadata,
    
    -- Infos utilisateur
    COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
    bu.user_email,
    bu.created_at as user_first_seen,
    bu.last_active as user_last_active,
    
    -- Infos session
    ecs.started_at as session_started_at,
    ecs.session_duration_minutes,
    ecs.total_messages as session_total_messages,
    ecs.is_active as session_is_active,
    ecs.entry_point as session_entry_point,
    
    -- Infos bot
    b.name as bot_name,
    b.owner_id
    
  FROM public.chat_messages cm
  LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
  LEFT JOIN public.enhanced_chat_sessions ecs ON (
    ecs.bot_id = cm.bot_id AND 
    (ecs.bot_user_id = cm.bot_user_id OR ecs.session_token = bu.session_id)
  )
  LEFT JOIN public.bots b ON cm.bot_id = b.id
  WHERE cm.bot_id = p_bot_id
    AND (p_session_filter IS NULL OR bu.session_id = p_session_filter OR ecs.session_token = p_session_filter)
  ORDER BY cm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;