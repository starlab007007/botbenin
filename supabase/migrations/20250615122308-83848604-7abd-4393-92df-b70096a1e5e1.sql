
-- Nouvelle version robuste pour get_chat_history
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
  -- Autorisation du propriétaire
  SELECT EXISTS (
      SELECT 1
      FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_authorized;

  IF NOT is_authorized THEN
      RAISE EXCEPTION 'Permission denied to access messages for this bot.';
  END IF;

  -- Recherche robuste par bot_user_id, session_token et variantes
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
        -- Par l'id user strict
        (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id)
        OR
        -- Par session_token ou variantes (metadata ou bot_user)
        (p_session_token IS NOT NULL AND (
            COALESCE(cm.metadata->>'session_token', cm.metadata->>'sessionToken') = p_session_token
            OR bu.session_id = p_session_token
        ))
      );
END;
$$;
