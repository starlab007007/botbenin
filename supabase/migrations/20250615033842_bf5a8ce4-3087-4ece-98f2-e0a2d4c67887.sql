
-- Corriger la fonction get_chat_history pour éliminer l'ambiguïté sur session_token
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
  -- Vérifier l'autorisation (propriétaire du bot)
  SELECT EXISTS (
      SELECT 1
      FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_authorized;

  IF NOT is_authorized THEN
      RAISE EXCEPTION 'Permission denied to access messages for this bot.';
  END IF;

  -- Recherche robuste SANS ambiguïté - qualification explicite des colonnes
  RETURN QUERY
  SELECT
      jsonb_build_object(
          'message_id', cm.id,
          'bot_id', cm.bot_id,
          'bot_user_id', cm.bot_user_id,
          'created_at', cm.created_at,
          'message_content', cm.message_content,
          'message_type', cm.message_type,
          'message_timestamp', cm.created_at,
          'ip_address', cm.ip_address,
          'user_agent', cm.user_agent,
          'metadata', cm.metadata,
          'session_id', COALESCE(bu.session_id, cm.metadata->>'session_token', 'unknown'),
          'user_name', bu.user_name,
          'user_email', bu.user_email
      )
  FROM
      public.chat_messages cm
  LEFT JOIN
      public.bot_users bu ON cm.bot_user_id = bu.id
  WHERE
      cm.bot_id = p_bot_id
      AND (
        -- Cas 1: Recherche par bot_user_id direct
        (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id)
        OR
        -- Cas 2: Recherche par session_token - qualification explicite des tables
        (p_session_token IS NOT NULL AND (
            -- Token exact dans bot_users.session_id
            bu.session_id = p_session_token
            OR
            -- Token exact dans metadata des messages
            cm.metadata->>'session_token' = p_session_token
            OR
            cm.metadata->>'sessionToken' = p_session_token
            OR
            -- Recherche partielle si préfixe perdu (fallback sécurisé)
            (LENGTH(p_session_token) > 10 AND (
                bu.session_id LIKE '%' || RIGHT(p_session_token, 8) || '%'
                OR cm.metadata::text LIKE '%' || RIGHT(p_session_token, 8) || '%'
            ))
        ))
      )
  ORDER BY cm.created_at ASC;
END;
$$;

-- Corriger également la fonction create_anonymous_visitor_session pour éviter les ambiguïtés potentielles
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
;
