
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
  -- Attempt to cast IP address, but don't fail if it's not a valid inet format
  BEGIN
    v_ip_addr := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip_addr := NULL;
  END;

  -- 1. Ensure a bot_user exists for this session and bot
  v_bot_user_id := public.create_bot_user_if_not_exists(p_bot_id, p_session_token);

  IF v_bot_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create or retrieve bot user for session token: %', p_session_token;
  END IF;

  -- 2. Insert the chat message into the history
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
