
-- Créer une vue pour l'historique complet des conversations de bot
CREATE OR REPLACE VIEW public.bot_message_history AS
SELECT 
  cm.id as message_id,
  cm.bot_id,
  cm.bot_user_id,
  cm.message_content,
  cm.message_type,
  cm.created_at as message_timestamp,
  cm.ip_address,
  cm.user_agent,
  cm.metadata,
  bu.user_name,
  bu.user_email,
  bu.session_id,
  bu.created_at as user_first_seen,
  bu.last_active as user_last_active,
  b.name as bot_name,
  bo.user_id as owner_id
FROM public.chat_messages cm
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
LEFT JOIN public.bots b ON cm.bot_id = b.id
LEFT JOIN public.bot_owners bo ON b.owner_id = bo.id
ORDER BY cm.created_at DESC;

-- Fonction pour créer ou récupérer un bot_user_id pour une session
CREATE OR REPLACE FUNCTION public.get_or_create_bot_user_for_session(
  p_bot_id uuid,
  p_session_token text,
  p_user_name text DEFAULT NULL
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bot_user_id uuid;
BEGIN
  -- Chercher un bot_user existant pour cette session
  SELECT bu.id INTO bot_user_id
  FROM public.bot_users bu
  WHERE bu.bot_id = p_bot_id 
    AND bu.session_id = p_session_token;
  
  -- Si pas trouvé, créer un nouveau bot_user
  IF bot_user_id IS NULL THEN
    INSERT INTO public.bot_users (
      bot_id, 
      session_id, 
      user_name, 
      is_authenticated
    )
    VALUES (
      p_bot_id, 
      p_session_token, 
      COALESCE(p_user_name, 'Session ' || LEFT(p_session_token, 8)),
      false
    )
    RETURNING id INTO bot_user_id;
  END IF;
  
  RETURN bot_user_id;
END;
$$;

-- Fonction pour envoyer une réponse manuelle en tant que bot
CREATE OR REPLACE FUNCTION public.send_manual_bot_response(
  p_bot_id uuid,
  p_session_token text,
  p_message_content text,
  p_admin_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bot_user_id uuid;
  message_id uuid;
  bot_owner_id uuid;
BEGIN
  -- Vérifier que l'utilisateur est propriétaire du bot
  SELECT bo.user_id INTO bot_owner_id
  FROM public.bots b
  JOIN public.bot_owners bo ON b.owner_id = bo.id
  WHERE b.id = p_bot_id;
  
  IF bot_owner_id != p_admin_user_id THEN
    RAISE EXCEPTION 'Accès non autorisé à ce bot';
  END IF;
  
  -- Obtenir ou créer le bot_user pour cette session
  bot_user_id := public.get_or_create_bot_user_for_session(
    p_bot_id, 
    p_session_token, 
    'Admin Response'
  );
  
  -- Insérer le message de réponse
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
    bot_user_id,
    p_message_content,
    'bot',
    '127.0.0.1',
    'Admin Panel',
    jsonb_build_object(
      'source', 'manual_admin_response',
      'admin_user_id', p_admin_user_id,
      'session_token', p_session_token
    )
  )
  RETURNING id INTO message_id;
  
  RETURN message_id;
END;
$$;

-- Politique RLS pour la vue bot_message_history
ALTER VIEW public.bot_message_history SET (security_invoker = true);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chat_messages_bot_session 
ON public.chat_messages(bot_id, bot_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bot_users_session 
ON public.bot_users(bot_id, session_id);
