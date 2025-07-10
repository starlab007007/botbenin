-- Partie 2: Fonctions complémentaires et policies

-- ===========================
-- 3. FONCTIONS POUR SESSIONS ET RÉPONSES MANUELLES
-- ===========================

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
-- 4. FONCTIONS POUR CONVERSATIONS ET ANALYTICS
-- ===========================

-- Fonction pour récupérer toutes les conversations d'un propriétaire
CREATE OR REPLACE FUNCTION public.get_owner_all_conversations(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_bot_filter uuid DEFAULT NULL
)
RETURNS TABLE(
  bot_id uuid,
  bot_name text,
  session_id text,
  bot_user_id uuid,
  user_name text,
  user_email text,
  conversation_start timestamp with time zone,
  last_message_at timestamp with time zone,
  message_count bigint,
  user_first_seen timestamp with time zone,
  user_last_active timestamp with time zone,
  is_active_today boolean,
  last_user_message text,
  last_bot_message text
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
  WHERE bo.user_id = auth.uid();
  
  IF owner_id_internal IS NULL THEN
    RAISE EXCEPTION 'Propriétaire de bot non trouvé.';
  END IF;
  
  RETURN QUERY
  SELECT 
    b.id as bot_id,
    b.name as bot_name,
    COALESCE(bu.session_id, ecs.session_token, 'unknown') as session_id,
    bu.id as bot_user_id,
    COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
    bu.user_email,
    LEAST(bu.created_at, ecs.started_at) as conversation_start,
    GREATEST(bu.last_active, ecs.last_activity) as last_message_at,
    COUNT(DISTINCT cm.id) as message_count,
    bu.created_at as user_first_seen,
    bu.last_active as user_last_active,
    (bu.last_active > CURRENT_DATE) as is_active_today,
    (SELECT cm2.message_content FROM public.chat_messages cm2 
     WHERE cm2.bot_user_id = bu.id AND cm2.message_type = 'user' 
     ORDER BY cm2.created_at DESC LIMIT 1) as last_user_message,
    (SELECT cm3.message_content FROM public.chat_messages cm3 
     WHERE cm3.bot_user_id = bu.id AND cm3.message_type = 'bot' 
     ORDER BY cm3.created_at DESC LIMIT 1) as last_bot_message
     
  FROM public.bots b
  LEFT JOIN public.bot_users bu ON b.id = bu.bot_id
  LEFT JOIN public.enhanced_chat_sessions ecs ON (b.id = ecs.bot_id AND bu.id = ecs.bot_user_id)
  LEFT JOIN public.chat_messages cm ON bu.id = cm.bot_user_id
  WHERE b.owner_id = owner_id_internal
    AND (p_bot_filter IS NULL OR b.id = p_bot_filter)
    AND bu.id IS NOT NULL
  GROUP BY b.id, b.name, bu.id, bu.session_id, bu.user_name, bu.user_email, 
           bu.created_at, bu.last_active, ecs.session_token, ecs.started_at, ecs.last_activity
  ORDER BY GREATEST(bu.last_active, ecs.last_activity) DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ===========================
-- 5. POLICIES POUR LES VUES EXISTANTES
-- ===========================

-- Activer RLS sur bot_message_history et bot_performance_metrics
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