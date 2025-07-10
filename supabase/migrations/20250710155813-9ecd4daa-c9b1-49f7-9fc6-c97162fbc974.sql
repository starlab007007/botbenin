-- Migration complète pour l'accès propriétaire aux données des bots

-- ===========================
-- 1. POLICIES RLS POUR ENHANCED_CHAT_SESSIONS
-- ===========================

-- Supprimer les anciennes policies s'il y en a
DROP POLICY IF EXISTS "Bot owners can view their enhanced sessions" ON public.enhanced_chat_sessions;
DROP POLICY IF EXISTS "Bot owners can manage their enhanced sessions" ON public.enhanced_chat_sessions;

-- Nouvelle policy complète pour enhanced_chat_sessions
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
-- 2. AMÉLIORATION DES VUES POUR LES PROPRIÉTAIRES
-- ===========================

-- Vue complète des analytics de bots par propriétaire
CREATE OR REPLACE VIEW public.owner_bot_analytics AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.description,
  b.is_active,
  b.share_enabled,
  b.created_at as bot_created_at,
  bo.user_id as owner_user_id,
  
  -- Statistiques des utilisateurs
  COUNT(DISTINCT bu.id) as total_users,
  COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '24 hours' THEN bu.id END) as active_users_24h,
  COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '7 days' THEN bu.id END) as active_users_7d,
  
  -- Statistiques des sessions
  COUNT(DISTINCT ecs.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN ecs.last_activity > NOW() - INTERVAL '24 hours' THEN ecs.id END) as active_sessions_24h,
  COUNT(DISTINCT CASE WHEN ecs.is_active = true THEN ecs.id END) as currently_active_sessions,
  
  -- Statistiques des messages
  COUNT(DISTINCT cm.id) as total_messages,
  COUNT(DISTINCT CASE WHEN cm.created_at > NOW() - INTERVAL '24 hours' THEN cm.id END) as messages_24h,
  COUNT(DISTINCT CASE WHEN cm.message_type = 'user' THEN cm.id END) as user_messages,
  COUNT(DISTINCT CASE WHEN cm.message_type = 'bot' THEN cm.id END) as bot_messages,
  
  -- Métriques de performance
  ROUND(AVG(ecs.session_duration_minutes), 2) as avg_session_duration,
  ROUND(AVG(ecs.total_messages), 2) as avg_messages_per_session,
  
  -- Dernière activité
  MAX(GREATEST(bu.last_active, cm.created_at, ecs.last_activity)) as last_activity,
  MAX(cm.created_at) as last_message_at

FROM public.bots b
JOIN public.bot_owners bo ON b.owner_id = bo.id
LEFT JOIN public.bot_users bu ON b.id = bu.bot_id
LEFT JOIN public.enhanced_chat_sessions ecs ON b.id = ecs.bot_id
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
GROUP BY b.id, b.name, b.description, b.is_active, b.share_enabled, b.created_at, bo.user_id;

-- Policy pour la vue
DROP POLICY IF EXISTS "Owners can view their bot analytics" ON public.owner_bot_analytics;
CREATE POLICY "Owners can view their bot analytics" 
ON public.owner_bot_analytics 
FOR SELECT 
USING (owner_user_id = auth.uid());

-- ===========================
-- 3. FONCTIONS COMPLÈTES POUR L'ACCÈS AUX DONNÉES
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
  WITH owner_stats AS (
    SELECT 
      COUNT(DISTINCT oba.bot_id) as total_bots,
      COUNT(DISTINCT CASE WHEN oba.is_active = true THEN oba.bot_id END) as active_bots,
      SUM(oba.total_users) as total_users,
      SUM(oba.total_sessions) as total_sessions,
      SUM(oba.total_messages) as total_messages,
      SUM(oba.active_users_24h) as active_users_24h,
      SUM(oba.active_sessions_24h) as active_sessions_24h,
      SUM(oba.messages_24h) as messages_24h,
      AVG(oba.avg_session_duration) as avg_session_duration,
      AVG(oba.avg_messages_per_session) as avg_messages_per_session,
      MAX(oba.last_activity) as last_activity
    FROM public.owner_bot_analytics oba
    WHERE oba.owner_user_id = p_owner_user_id
  ),
  top_bot AS (
    SELECT 
      oba.bot_id,
      oba.bot_name,
      oba.total_messages
    FROM public.owner_bot_analytics oba
    WHERE oba.owner_user_id = p_owner_user_id
    ORDER BY oba.total_messages DESC
    LIMIT 1
  )
  SELECT 
    os.*,
    tb.bot_id as top_bot_id,
    tb.bot_name as top_bot_name,
    tb.total_messages as top_bot_messages
  FROM owner_stats os
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

-- Fonction pour récupérer TOUTES les sessions d'un bot
CREATE OR REPLACE FUNCTION public.get_bot_all_sessions(
  p_bot_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  session_id uuid,
  session_token text,
  bot_user_id uuid,
  user_name text,
  user_email text,
  started_at timestamp with time zone,
  last_activity timestamp with time zone,
  ended_at timestamp with time zone,
  duration_minutes numeric,
  total_messages integer,
  user_messages integer,
  bot_messages integer,
  is_active boolean,
  entry_point text,
  ip_address inet,
  user_agent text,
  referrer_url text,
  session_metadata jsonb
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
    ecs.id as session_id,
    ecs.session_token,
    ecs.bot_user_id,
    COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
    bu.user_email,
    ecs.started_at,
    ecs.last_activity,
    ecs.ended_at,
    ecs.session_duration_minutes as duration_minutes,
    ecs.total_messages,
    ecs.user_messages,
    ecs.bot_messages,
    ecs.is_active,
    ecs.entry_point,
    ecs.ip_address,
    ecs.user_agent,
    ecs.referrer_url,
    ecs.session_metadata
    
  FROM public.enhanced_chat_sessions ecs
  LEFT JOIN public.bot_users bu ON ecs.bot_user_id = bu.id
  WHERE ecs.bot_id = p_bot_id
  ORDER BY ecs.last_activity DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Fonction pour envoyer une réponse manuelle (améliorée)
CREATE OR REPLACE FUNCTION public.send_manual_response_complete(
  p_bot_id uuid,
  p_session_token text,
  p_message_content text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  message_id uuid,
  success boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_owner boolean;
  v_bot_user_id uuid;
  v_message_id uuid;
  v_session_id uuid;
BEGIN
  -- Vérifier la propriété
  SELECT EXISTS (
    SELECT 1
    FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_owner;
  
  IF NOT is_owner THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Accès refusé: vous n''êtes pas propriétaire de ce bot.';
    RETURN;
  END IF;
  
  -- Récupérer ou créer le bot_user
  SELECT public.get_or_create_bot_user_for_session(
    p_bot_id, 
    p_session_token, 
    'Réponse Manuelle'
  ) INTO v_bot_user_id;
  
  -- Récupérer la session enhanced
  SELECT ecs.id INTO v_session_id
  FROM public.enhanced_chat_sessions ecs
  WHERE ecs.bot_id = p_bot_id 
    AND ecs.session_token = p_session_token;
  
  -- Créer le message
  INSERT INTO public.chat_messages (
    bot_id, 
    bot_user_id, 
    message_content, 
    message_type, 
    ip_address, 
    user_agent, 
    metadata
  )
  VALUES (
    p_bot_id,
    v_bot_user_id,
    p_message_content,
    'bot',
    '127.0.0.1',
    'Admin Panel Manual Response',
    p_metadata || jsonb_build_object(
      'source', 'manual_admin_response',
      'admin_user_id', auth.uid(),
      'session_token', p_session_token,
      'timestamp', NOW()
    )
  )
  RETURNING id INTO v_message_id;
  
  -- Mettre à jour la session
  IF v_session_id IS NOT NULL THEN
    UPDATE public.enhanced_chat_sessions 
    SET 
      last_activity = NOW(),
      total_messages = total_messages + 1,
      bot_messages = bot_messages + 1,
      session_duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
    WHERE id = v_session_id;
  END IF;
  
  RETURN QUERY SELECT v_message_id, true, 'Message envoyé avec succès'::text;
END;
$$;

-- ===========================
-- 4. ENABLE RLS SUR TOUTES LES TABLES NÉCESSAIRES
-- ===========================

ALTER TABLE public.enhanced_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policies pour bot_message_history
DROP POLICY IF EXISTS "Bot owners can view message history" ON public.bot_message_history;
CREATE POLICY "Bot owners can view message history" 
ON public.bot_message_history 
FOR SELECT 
USING (owner_id IN (
  SELECT bo.id FROM public.bot_owners bo WHERE bo.user_id = auth.uid()
));

-- Policies pour bot_performance_metrics
DROP POLICY IF EXISTS "Bot owners can view performance metrics" ON public.bot_performance_metrics;
CREATE POLICY "Bot owners can view performance metrics" 
ON public.bot_performance_metrics 
FOR SELECT 
USING (owner_id IN (
  SELECT bo.id FROM public.bot_owners bo WHERE bo.user_id = auth.uid()
));

-- ===========================
-- 5. FONCTION DE TEST COMPLÈTE
-- ===========================

CREATE OR REPLACE FUNCTION public.test_owner_access_complete()
RETURNS TABLE(
  test_name text,
  status text,
  details text,
  data_preview jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_bot_id uuid;
  test_owner_id uuid;
  test_user_id uuid := auth.uid();
  stats_result RECORD;
  sessions_count bigint;
  messages_count bigint;
BEGIN
  -- Test 1: Vérifier l'accès aux bots
  SELECT b.id, b.owner_id INTO test_bot_id, test_owner_id
  FROM public.bots b
  JOIN public.bot_owners bo ON b.owner_id = bo.id
  WHERE bo.user_id = test_user_id
  LIMIT 1;
  
  IF test_bot_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      'bot_access'::text,
      'success'::text,
      'Accès aux bots confirmé'::text,
      jsonb_build_object('bot_id', test_bot_id, 'owner_id', test_owner_id);
      
    -- Test 2: Statistiques complètes
    SELECT * INTO stats_result
    FROM public.get_owner_complete_stats(test_user_id);
    
    RETURN QUERY SELECT 
      'complete_stats'::text,
      'success'::text,
      'Statistiques récupérées'::text,
      to_jsonb(stats_result);
      
    -- Test 3: Sessions du bot
    SELECT COUNT(*) INTO sessions_count
    FROM public.get_bot_all_sessions(test_bot_id);
    
    RETURN QUERY SELECT 
      'sessions_access'::text,
      'success'::text,
      ('Sessions accessibles: ' || sessions_count)::text,
      jsonb_build_object('sessions_count', sessions_count);
      
    -- Test 4: Messages du bot
    SELECT COUNT(*) INTO messages_count
    FROM public.get_bot_complete_history(test_bot_id);
    
    RETURN QUERY SELECT 
      'messages_access'::text,
      'success'::text,
      ('Messages accessibles: ' || messages_count)::text,
      jsonb_build_object('messages_count', messages_count);
      
  ELSE
    RETURN QUERY SELECT 
      'no_bots'::text,
      'info'::text,
      'Aucun bot trouvé pour ce propriétaire'::text,
      '{}'::jsonb;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    'error'::text,
    'failed'::text,
    ('Erreur: ' || SQLERRM)::text,
    '{}'::jsonb;
END;
$$;