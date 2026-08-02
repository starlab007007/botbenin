
-- 1. Rendre le create_bot_user_if_not_exists encore plus tolérant : création systématique si le bot_user ou le session_id n'existe pas.
CREATE OR REPLACE FUNCTION public.create_bot_user_if_not_exists(
  p_bot_id uuid,
  p_session_id text,
  p_user_name text DEFAULT NULL,
  p_user_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- SI le session_id est nul ou vide, générer une valeur par défaut
  IF p_session_id IS NULL OR TRIM(p_session_id) = '' THEN
    -- Ajout d'un prefix pour bien traquer ces anomalies
    p_session_id := 'anon_fallback_' || encode(gen_random_bytes(12), 'hex');
  END IF;
  
  -- Chercher un utilisateur existant
  SELECT id INTO user_id
  FROM bot_users
  WHERE bot_id = p_bot_id AND session_id = p_session_id;
  
  -- Si pas trouvé, créer un nouvel utilisateur
  IF user_id IS NULL THEN
    INSERT INTO bot_users (bot_id, session_id, user_name, user_email, last_active)
    VALUES (p_bot_id, p_session_id, p_user_name, p_user_email, NOW())
    RETURNING id INTO user_id;
  ELSE
    -- Mettre à jour l’activité
    UPDATE bot_users 
    SET last_active = NOW(),
        user_name = COALESCE(p_user_name, user_name),
        user_email = COALESCE(p_user_email, user_email)
    WHERE id = user_id;
  END IF;
  
  RETURN user_id;
END;
$$;

-- 2. (Optionnel, conseillé en debug) Ajouter une table logs_session_anomalies pour tracer les appels foireux
CREATE TABLE IF NOT EXISTS public.logs_session_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type text DEFAULT 'empty_session_token',
  bot_id uuid,
  input_token text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Ajout d’un log inutilisé dans save_chat_message si token absent
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
BEGIN
  -- Try to cast IP
  BEGIN
    v_ip_addr := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip_addr := NULL;
  END;

  -- Log si p_session_token est null/empty
  IF p_session_token IS NULL OR TRIM(p_session_token) = '' THEN
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token) VALUES ('empty_session_token', p_bot_id, p_session_token);
  END IF;

  -- Appel robuste
  v_bot_user_id := public.create_bot_user_if_not_exists(p_bot_id, p_session_token);

  IF v_bot_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create or retrieve bot user for session token: %', p_session_token;
  END IF;

  -- Write the message (avec le token, quoiqu’il arrive)
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
    p_metadata || jsonb_build_object('session_token', p_session_token),
    v_ip_addr,
    p_user_agent
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;
;
