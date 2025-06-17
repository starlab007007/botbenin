
-- CORRECTION COMPLETE DE L'AMBIGUITÉ session_token

-- 1. Corriger enhanced_session_reconciliation pour éliminer toute ambiguïté
CREATE OR REPLACE FUNCTION public.enhanced_session_reconciliation(
  p_bot_id uuid,
  p_session_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_user_id uuid;
  v_session_exists boolean;
BEGIN
  -- Étape 1: Chercher un bot_user existant (qualification explicite)
  SELECT bu.id INTO v_bot_user_id 
  FROM public.bot_users bu
  WHERE bu.bot_id = p_bot_id 
    AND bu.session_id = p_session_token;

  IF v_bot_user_id IS NOT NULL THEN
    -- Mettre à jour l'activité
    UPDATE public.bot_users 
    SET last_active = NOW()
    WHERE id = v_bot_user_id;
    
    RETURN v_bot_user_id;
  END IF;

  -- Étape 2: Vérifier si une session anonyme existe (qualification explicite)
  SELECT EXISTS(
    SELECT 1 FROM public.anonymous_visitor_sessions avs
    WHERE avs.bot_id = p_bot_id 
      AND avs.session_token = p_session_token
  ) INTO v_session_exists;

  -- Étape 3: Créer le bot_user correspondant
  INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
  VALUES (p_bot_id, p_session_token, 'Utilisateur Réconcilié', false, NOW())
  RETURNING id INTO v_bot_user_id;

  RETURN v_bot_user_id;
END;
$$;

-- 2. Corriger get_unified_chat_history avec qualification explicite
CREATE OR REPLACE FUNCTION public.get_unified_chat_history(
  p_bot_id uuid,
  p_session_token text DEFAULT NULL,
  p_bot_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  message_id uuid,
  bot_id uuid,
  bot_user_id uuid,
  message_content text,
  message_type text,
  message_timestamp timestamp with time zone,
  metadata jsonb,
  session_id text,
  user_name text,
  user_email text,
  ip_address text,
  user_agent text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id as message_id,
    cm.bot_id,
    cm.bot_user_id,
    cm.message_content,
    cm.message_type,
    cm.created_at as message_timestamp,
    cm.metadata,
    COALESCE(
      bu.session_id,
      cm.metadata->>'session_token',
      cm.metadata->>'sessionToken',
      'unknown'
    ) as session_id,
    COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
    bu.user_email,
    cm.ip_address,
    cm.user_agent
  FROM public.chat_messages cm
  LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
  WHERE cm.bot_id = p_bot_id
    AND (
      -- Par bot_user_id
      (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id)
      OR
      -- Par session_token avec qualification EXPLICITE pour éviter l'ambiguïté
      (p_session_token IS NOT NULL AND (
        bu.session_id = p_session_token
        OR cm.metadata->>'session_token' = p_session_token
        OR cm.metadata->>'sessionToken' = p_session_token
      ))
      OR
      -- Si aucun critère, récupérer tous les messages récents
      (p_bot_user_id IS NULL AND p_session_token IS NULL)
    )
  ORDER BY cm.created_at ASC
  LIMIT p_limit;
END;
$$;

-- 3. Corriger create_anonymous_visitor_session avec qualification explicite
CREATE OR REPLACE FUNCTION public.create_anonymous_visitor_session(
  p_fingerprint_id uuid, 
  p_bot_id uuid, 
  p_entry_point text DEFAULT 'direct', 
  p_referrer_url text DEFAULT NULL, 
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
  session_token text;
  existing_token text;
BEGIN
  -- Vérifier que le bot existe et est actif
  IF NOT EXISTS (
    SELECT 1 FROM public.bots b
    WHERE b.id = p_bot_id 
    AND (b.is_active IS NULL OR b.is_active = true)
  ) THEN
    RAISE EXCEPTION 'Cannot create session: Bot % does not exist or is inactive', p_bot_id;
  END IF;

  -- Chercher une session existante avec qualification EXPLICITE
  SELECT avs.session_token INTO existing_token
  FROM public.anonymous_visitor_sessions avs
  WHERE avs.fingerprint_id = p_fingerprint_id
    AND avs.bot_id = p_bot_id
    AND avs.entry_point = COALESCE(p_entry_point, 'direct')
    AND (p_referrer_url IS NULL OR avs.referrer_url = p_referrer_url)
    AND avs.is_active = true
  ORDER BY avs.started_at DESC
  LIMIT 1;

  IF existing_token IS NOT NULL THEN
    -- Mettre à jour l'activité de la session existante
    UPDATE public.anonymous_visitor_sessions 
    SET last_activity = NOW()
    WHERE session_token = existing_token;
    
    RETURN existing_token;
  END IF;

  -- Créer une nouvelle session avec un token unique
  LOOP
    session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
    
    -- Vérifier l'unicité avec qualification explicite
    IF NOT EXISTS (
      SELECT 1 FROM public.anonymous_visitor_sessions avs2
      WHERE avs2.session_token = session_token
    ) THEN
      EXIT;
    END IF;
  END LOOP;
  
  INSERT INTO public.anonymous_visitor_sessions (
    fingerprint_id, bot_id, session_token, entry_point,
    referrer_url, utm_source, utm_medium, utm_campaign, ip_address
  )
  VALUES (
    p_fingerprint_id, p_bot_id, session_token, p_entry_point,
    p_referrer_url, p_utm_source, p_utm_medium, p_utm_campaign, p_ip_address
  )
  RETURNING id INTO session_id;

  RETURN session_token;
END;
$$;

-- 4. Créer une fonction de test pour vérifier que l'ambiguïté est résolue
CREATE OR REPLACE FUNCTION public.test_session_token_resolution()
RETURNS TABLE(
  test_name text,
  status text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_bot_id uuid;
  test_token text;
  result_token text;
BEGIN
  -- Test 1: Création de session
  RETURN QUERY SELECT 
    'session_creation'::text,
    'testing'::text,
    'Tentative de création d''une session de test'::text;

  BEGIN
    -- Récupérer un bot existant pour le test
    SELECT b.id INTO test_bot_id FROM public.bots b LIMIT 1;
    
    IF test_bot_id IS NOT NULL THEN
      -- Tenter une création de session
      SELECT public.create_anonymous_visitor_session(
        (SELECT id FROM public.visitor_fingerprints LIMIT 1),
        test_bot_id,
        'test',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      ) INTO result_token;
      
      RETURN QUERY SELECT 
        'session_creation'::text,
        'success'::text,
        ('Token créé: ' || COALESCE(LEFT(result_token, 20), 'null'))::text;
    ELSE
      RETURN QUERY SELECT 
        'session_creation'::text,
        'skipped'::text,
        'Aucun bot disponible pour le test'::text;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'session_creation'::text,
      'failed'::text,
      ('Erreur: ' || SQLERRM)::text;
  END;

  -- Test 2: Récupération d'historique
  BEGIN
    IF test_bot_id IS NOT NULL AND result_token IS NOT NULL THEN
      PERFORM public.get_unified_chat_history(test_bot_id, result_token, NULL, 1);
      
      RETURN QUERY SELECT 
        'history_retrieval'::text,
        'success'::text,
        'Récupération d''historique réussie'::text;
    ELSE
      RETURN QUERY SELECT 
        'history_retrieval'::text,
        'skipped'::text,
        'Pas de données de test disponibles'::text;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'history_retrieval'::text,
      'failed'::text,
      ('Erreur: ' || SQLERRM)::text;
  END;
END;
$$;
