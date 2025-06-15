
-- 1. Drop the existing function so we can change its return type
DROP FUNCTION IF EXISTS public.create_anonymous_visitor_session(uuid, uuid, text, text, text, text, text, inet);

-- 2. Re-create create_anonymous_visitor_session with the correct return type (text)
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
RETURNS text -- return the session_token
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
  session_token text;
BEGIN
  -- Try to find an existing session (by fingerprint, bot, and entry_point)
  SELECT session_token INTO session_token
  FROM public.anonymous_visitor_sessions
  WHERE fingerprint_id = p_fingerprint_id
    AND bot_id = p_bot_id
    AND entry_point = COALESCE(p_entry_point, 'direct')
    AND (p_referrer_url IS NULL OR referrer_url = p_referrer_url)
    LIMIT 1;

  IF session_token IS NOT NULL THEN
    RETURN session_token;
  END IF;

  -- Otherwise, create one
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

-- 3. Robustify save_chat_message: always ensures bot_user link by session_token (won't insert duplicate users)
CREATE OR REPLACE FUNCTION public.save_chat_message(
    p_bot_id uuid,
    p_session_token text,
    p_message_content text,
    p_message_type text, -- 'user' or 'bot'
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

  -- Ensure bot_user exists for session & bot (idempotent)
  v_bot_user_id := public.create_bot_user_if_not_exists(p_bot_id, p_session_token);

  IF v_bot_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create or retrieve bot user for session token: %', p_session_token;
  END IF;

  -- Write the message (always embed session_token in metadata for robust linking)
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

-- 4. Robustify get_chat_history for admin panel and everywhere: recover all messages by bot_user_id or any session_token variant

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
  -- Authorization check (bot owner only)
  SELECT EXISTS (
      SELECT 1
      FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_authorized;

  IF NOT is_authorized THEN
      RAISE EXCEPTION 'Permission denied to access messages for this bot.';
  END IF;

  -- Recover robustly (by bot_user, or any session_token key or value match, in both message metadata and bot_users)
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
      cm.bot_id = p_bot_id
      AND (
        (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id)
        OR
        (p_session_token IS NOT NULL AND (
          -- direct in message
          cm.metadata->>'session_token' = p_session_token OR
          cm.metadata->>'sessionToken' = p_session_token OR
          -- attached user
          bu.session_id = p_session_token OR
          -- variant (prefix lost, suffix/prefix only) fallback
          cm.metadata::text ILIKE CONCAT('%', p_session_token, '%') OR
          bu.session_id ILIKE CONCAT('%', p_session_token, '%')
        ))
      )
  ORDER BY cm.created_at ASC;
END;
$$;

-- 5. Add function to reconcile orphaned bot_users for a session token (for future use if needed)
CREATE OR REPLACE FUNCTION public.reconcile_bot_user_session_token(
  p_bot_id uuid,
  p_session_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_user_id uuid;
BEGIN
  -- Try to find existing match
  SELECT id INTO v_bot_user_id FROM public.bot_users
    WHERE bot_id = p_bot_id AND session_id = p_session_token LIMIT 1;

  IF v_bot_user_id IS NOT NULL THEN
    RETURN v_bot_user_id;
  END IF;

  -- Try to match by old/variant tokens in recent chat_messages
  SELECT cm.bot_user_id
    INTO v_bot_user_id
    FROM public.chat_messages cm
    WHERE cm.bot_id = p_bot_id
      AND (cm.metadata->>'session_token' = p_session_token OR
           cm.metadata->>'sessionToken' = p_session_token OR
           cm.metadata::text ILIKE CONCAT('%', p_session_token, '%'))
    LIMIT 1;

  IF v_bot_user_id IS NOT NULL THEN
    -- Patch bot_users table if session_id is missing
    UPDATE public.bot_users SET session_id = p_session_token, last_active = NOW()
      WHERE id = v_bot_user_id AND (session_id IS NULL OR session_id = '');
    RETURN v_bot_user_id;
  END IF;

  -- As last resort, create a new one
  v_bot_user_id := public.create_bot_user_if_not_exists(p_bot_id, p_session_token);
  RETURN v_bot_user_id;
END;
$$;
