
-- migration_name: create_get_chat_history_function

CREATE OR REPLACE FUNCTION public.get_chat_history(
    p_bot_id uuid,
    p_bot_user_id uuid DEFAULT NULL,
    p_session_token text DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_authorized boolean;
BEGIN
    -- Authorization check: Ensure the caller owns the bot.
    SELECT EXISTS (
        SELECT 1
        FROM public.bots b
        JOIN public.bot_owners bo ON b.owner_id = bo.id
        WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
    ) INTO is_authorized;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Permission denied to access messages for this bot.';
    END IF;

    -- If authorized, return the chat history.
    RETURN QUERY
    SELECT
        jsonb_build_object(
            'id', cm.id,
            'bot_id', cm.bot_id,
            'bot_user_id', cm.bot_user_id,
            'created_at', cm.created_at,
            'message_content', cm.message_content,
            'message_type', cm.message_type,
            'ip_address', cm.ip_address,
            'user_agent', cm.user_agent,
            'metadata', cm.metadata,
            'bot_users', jsonb_build_object(
                'user_name', bu.user_name,
                'user_email', bu.user_email,
                'session_id', bu.session_id,
                'created_at', bu.created_at,
                'last_active', bu.last_active
            ),
            'bots', jsonb_build_object(
                'name', b.name,
                'owner_id', b.owner_id
            )
        )
    FROM
        public.chat_messages cm
    LEFT JOIN
        public.bot_users bu ON cm.bot_user_id = bu.id
    LEFT JOIN
        public.bots b ON cm.bot_id = b.id
    WHERE
        cm.bot_id = p_bot_id AND
        (
            -- At least one of the identifiers must be provided for the OR condition to be meaningful
            (p_bot_user_id IS NOT NULL OR p_session_token IS NOT NULL) AND
            (
              (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id) OR
              (p_session_token IS NOT NULL AND cm.metadata->>'session_token' = p_session_token) OR
              (p_session_token IS NOT NULL AND bu.session_id = p_session_token)
            )
        );
END;
$$;

-- Améliorer la fonction send_manual_bot_response pour gérer les sessions anonymes
CREATE OR REPLACE FUNCTION public.send_manual_bot_response(
    p_bot_id uuid, 
    p_session_token text, 
    p_message_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_user_id uuid;
  v_message_id uuid;
  v_admin_user_id uuid := auth.uid();
  is_authorized boolean;
BEGIN
  -- Vérifier l'autorisation
  SELECT EXISTS (
    SELECT 1
    FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_authorized;

  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Permission denied to send message for this bot.';
  END IF;

  -- Chercher ou créer un bot_user pour cette session
  SELECT id INTO v_bot_user_id
  FROM public.bot_users
  WHERE bot_id = p_bot_id AND session_id = p_session_token;

  IF v_bot_user_id IS NULL THEN
    -- Créer un nouveau bot_user pour cette session
    INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated)
    VALUES (
      p_bot_id, 
      p_session_token, 
      'Anonymous User ' || RIGHT(p_session_token, 8),
      false
    )
    RETURNING id INTO v_bot_user_id;
  END IF;

  -- Insérer le message
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
    'Admin Panel',
    jsonb_build_object(
      'source', 'manual_admin_response',
      'admin_user_id', v_admin_user_id,
      'session_token', p_session_token
    )
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;
