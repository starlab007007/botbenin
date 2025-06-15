
-- Fonction robuste pour get_chat_history avec debug amélioré
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
  debug_info jsonb := '{}';
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

  -- Log pour debug
  RAISE NOTICE 'Recherche messages pour bot_id: %, bot_user_id: %, session_token: %', 
    p_bot_id, p_bot_user_id, p_session_token;

  -- Recherche TRÈS large pour couvrir tous les cas possibles
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
        -- Cas 1: Par bot_user_id direct
        (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id)
        OR
        -- Cas 2: Par session_token dans les métadonnées (toutes variantes)
        (p_session_token IS NOT NULL AND (
            cm.metadata->>'session_token' = p_session_token
            OR cm.metadata->>'sessionToken' = p_session_token
            OR cm.metadata->>'+session_token' = p_session_token
        ))
        OR
        -- Cas 3: Par session_id dans bot_users
        (p_session_token IS NOT NULL AND bu.session_id = p_session_token)
        OR
        -- Cas 4: Recherche partielle si le token a un préfixe
        (p_session_token IS NOT NULL AND (
            cm.metadata->>'session_token' LIKE '%' || SUBSTRING(p_session_token FROM 6) || '%'
            OR bu.session_id LIKE '%' || SUBSTRING(p_session_token FROM 6) || '%'
        ))
      )
  ORDER BY cm.created_at ASC;
END;
$$;

-- Fonction de debug pour analyser les tokens en base
CREATE OR REPLACE FUNCTION public.debug_session_tokens(
    p_bot_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    message_id uuid,
    metadata_session_token text,
    bot_user_session_id text,
    message_type text,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id as message_id,
    cm.metadata->>'session_token' as metadata_session_token,
    bu.session_id as bot_user_session_id,
    cm.message_type,
    cm.created_at
  FROM public.chat_messages cm
  LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
  WHERE cm.bot_id = p_bot_id
  ORDER BY cm.created_at DESC
  LIMIT p_limit;
END;
$$;
