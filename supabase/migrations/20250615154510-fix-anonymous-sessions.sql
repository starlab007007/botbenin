
-- Mise à jour des fonctions pour gérer correctement les sessions anonymes
-- après suppression de la contrainte NOT NULL sur bot_user_id

-- 1. Mettre à jour create_anonymous_visitor_session pour ne pas essayer de créer d'entrée dans enhanced_chat_sessions
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
  -- Chercher une session existante en qualifiant explicitement la table
  SELECT avs.session_token INTO existing_token
  FROM public.anonymous_visitor_sessions avs
  WHERE avs.fingerprint_id = p_fingerprint_id
    AND avs.bot_id = p_bot_id
    AND avs.entry_point = COALESCE(p_entry_point, 'direct')
    AND (p_referrer_url IS NULL OR avs.referrer_url = p_referrer_url)
  LIMIT 1;

  IF existing_token IS NOT NULL THEN
    -- Mettre à jour l'activité de la session existante
    UPDATE public.anonymous_visitor_sessions 
    SET last_activity = NOW()
    WHERE session_token = existing_token;
    
    RETURN existing_token;
  END IF;

  -- Créer une nouvelle session avec un token unique
  session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
  
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

-- 2. Créer une fonction pour créer un bot_user uniquement quand nécessaire
CREATE OR REPLACE FUNCTION public.create_bot_user_if_not_exists(
    p_bot_id uuid,
    p_session_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_user_id uuid;
  v_anonymous_session_exists boolean;
BEGIN
  -- Vérifier si un bot_user existe déjà pour cette session
  SELECT id INTO v_bot_user_id 
  FROM public.bot_users
  WHERE bot_id = p_bot_id AND session_id = p_session_id;

  -- Si trouvé, retourner l'ID existant
  IF v_bot_user_id IS NOT NULL THEN
    -- Mettre à jour la dernière activité
    UPDATE public.bot_users 
    SET last_active = NOW()
    WHERE id = v_bot_user_id;
    
    RETURN v_bot_user_id;
  END IF;

  -- Vérifier que la session anonyme existe
  SELECT EXISTS (
    SELECT 1 FROM public.anonymous_visitor_sessions
    WHERE bot_id = p_bot_id AND session_token = p_session_id
  ) INTO v_anonymous_session_exists;

  -- Si la session anonyme n'existe pas, la créer
  IF NOT v_anonymous_session_exists THEN
    RAISE NOTICE 'Session anonyme non trouvée, création impossible pour token: %', p_session_id;
    RETURN NULL;
  END IF;

  -- Créer le bot_user pour cette session
  INSERT INTO public.bot_users (
    bot_id, 
    session_id, 
    user_name, 
    is_authenticated, 
    last_active
  )
  VALUES (
    p_bot_id, 
    p_session_id, 
    'Visiteur Anonyme', 
    false, 
    NOW()
  )
  RETURNING id INTO v_bot_user_id;

  RETURN v_bot_user_id;
END;
$$;

-- 3. Améliorer la fonction save_chat_message pour mieux gérer les sessions anonymes
CREATE OR REPLACE FUNCTION public.save_chat_message(
    p_bot_id uuid,
    p_session_token text,
    p_message_content text,
    p_message_type text,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_ip_address text DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_user_id uuid;
  v_message_id uuid;
  v_ip_addr inet;
  v_final_token text;
BEGIN
  -- Gestion robuste du token
  IF p_session_token IS NULL OR TRIM(p_session_token) = '' THEN
    v_final_token := 'anon_recovery_' || encode(gen_random_bytes(12), 'hex');
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token) 
    VALUES ('empty_session_token_recovered', p_bot_id, v_final_token);
  ELSE
    v_final_token := p_session_token;
  END IF;

  -- Conversion IP sécurisée
  BEGIN
    v_ip_addr := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip_addr := NULL;
  END;

  -- Créer le bot_user si nécessaire UNIQUEMENT
  v_bot_user_id := public.create_bot_user_if_not_exists(p_bot_id, v_final_token);

  IF v_bot_user_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de créer ou trouver le bot_user pour la session: %', v_final_token;
  END IF;

  -- Sauvegarder le message avec métadonnées enrichies
  INSERT INTO public.chat_messages (
    bot_id,
    bot_user_id,
    message_content,
    message_type,
    metadata,
    ip_address,
    user_agent
  )
  VALUES (
    p_bot_id,
    v_bot_user_id,
    p_message_content,
    p_message_type,
    p_metadata || jsonb_build_object(
      'session_token', v_final_token,
      'saved_at', NOW()::text,
      'original_token', p_session_token
    ),
    v_ip_addr,
    p_user_agent
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;
