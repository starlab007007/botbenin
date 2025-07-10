-- Corriger le conflit de fonction - Partie 3

-- ===========================
-- 1. SUPPRIMER ET RECRÉER LES FONCTIONS CONFLICTUELLES
-- ===========================

-- Supprimer la fonction existante
DROP FUNCTION IF EXISTS public.get_owner_all_conversations(integer, integer, uuid);

-- Créer la nouvelle fonction pour récupérer toutes les conversations d'un propriétaire
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
-- 2. FONCTION DE TEST COMPLÈTE
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
  conversations_count bigint;
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
    BEGIN
      SELECT * INTO stats_result
      FROM public.get_owner_complete_stats(test_user_id);
      
      RETURN QUERY SELECT 
        'complete_stats'::text,
        'success'::text,
        'Statistiques récupérées'::text,
        to_jsonb(stats_result);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'complete_stats'::text,
        'failed'::text,
        ('Erreur stats: ' || SQLERRM)::text,
        '{}'::jsonb;
    END;
      
    -- Test 3: Sessions du bot
    BEGIN
      SELECT COUNT(*) INTO sessions_count
      FROM public.get_bot_all_sessions(test_bot_id);
      
      RETURN QUERY SELECT 
        'sessions_access'::text,
        'success'::text,
        ('Sessions accessibles: ' || sessions_count)::text,
        jsonb_build_object('sessions_count', sessions_count);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'sessions_access'::text,
        'failed'::text,
        ('Erreur sessions: ' || SQLERRM)::text,
        '{}'::jsonb;
    END;
      
    -- Test 4: Messages du bot
    BEGIN
      SELECT COUNT(*) INTO messages_count
      FROM public.get_bot_complete_history(test_bot_id);
      
      RETURN QUERY SELECT 
        'messages_access'::text,
        'success'::text,
        ('Messages accessibles: ' || messages_count)::text,
        jsonb_build_object('messages_count', messages_count);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'messages_access'::text,
        'failed'::text,
        ('Erreur messages: ' || SQLERRM)::text,
        '{}'::jsonb;
    END;
    
    -- Test 5: Conversations
    BEGIN
      SELECT COUNT(*) INTO conversations_count
      FROM public.get_owner_all_conversations();
      
      RETURN QUERY SELECT 
        'conversations_access'::text,
        'success'::text,
        ('Conversations accessibles: ' || conversations_count)::text,
        jsonb_build_object('conversations_count', conversations_count);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'conversations_access'::text,
        'failed'::text,
        ('Erreur conversations: ' || SQLERRM)::text,
        '{}'::jsonb;
    END;
      
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
    ('Erreur générale: ' || SQLERRM)::text,
    '{}'::jsonb;
END;
$$;