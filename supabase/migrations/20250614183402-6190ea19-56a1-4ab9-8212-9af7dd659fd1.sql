
-- FIX: Supprimer la vue existante pour permettre la recréation
DROP VIEW IF EXISTS public.bot_message_history;

-- MIGRATION: Activer la sécurité au niveau des lignes (RLS) sur les tables de session
ALTER TABLE public.anonymous_visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_chat_sessions ENABLE ROW LEVEL SECURITY;

-- MIGRATION: Supprimer les anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "Bot owners can view their anonymous sessions" ON public.anonymous_visitor_sessions;
DROP POLICY IF EXISTS "Bot owners can view their enhanced sessions" ON public.enhanced_chat_sessions;

-- MIGRATION: Politique pour permettre aux propriétaires de bots de voir les sessions anonymes de leurs bots
CREATE POLICY "Bot owners can view their anonymous sessions"
ON public.anonymous_visitor_sessions
FOR SELECT
USING (
  (SELECT b.owner_id FROM public.bots b WHERE b.id = bot_id) IN (
    SELECT bo.id FROM public.bot_owners bo WHERE bo.user_id = auth.uid()
  )
);

-- MIGRATION: Politique pour permettre aux propriétaires de bots de voir les sessions améliorées de leurs bots
CREATE POLICY "Bot owners can view their enhanced sessions"
ON public.enhanced_chat_sessions
FOR SELECT
USING (
  (SELECT b.owner_id FROM public.bots b WHERE b.id = bot_id) IN (
    SELECT bo.id FROM public.bot_owners bo WHERE bo.user_id = auth.uid()
  )
);

-- MIGRATION: Supprimer les anciennes fonctions pour les recréer proprement
DROP FUNCTION IF EXISTS public.send_manual_bot_response(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.send_manual_bot_response(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_or_create_bot_user_for_session(uuid, text, text);

-- MIGRATION: Activer la sécurité au niveau des lignes (RLS)
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- MIGRATION: Supprimer les anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "Bot owners can manage their bot users" ON public.bot_users;
DROP POLICY IF EXISTS "Bot owners can view their bot messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Bot owners can send manual responses" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their sessions" ON public.chat_messages;


-- MIGRATION: Politique pour permettre aux propriétaires de bots de gérer les utilisateurs de leurs bots
CREATE POLICY "Bot owners can manage their bot users"
ON public.bot_users
FOR ALL
USING (
  (SELECT b.owner_id FROM public.bots b WHERE b.id = bot_id) IN (
    SELECT bo.id FROM public.bot_owners bo WHERE bo.user_id = auth.uid()
  )
)
WITH CHECK (
  (SELECT b.owner_id FROM public.bots b WHERE b.id = bot_id) IN (
    SELECT bo.id FROM public.bot_owners bo WHERE bo.user_id = auth.uid()
  )
);

-- MIGRATION: Politique pour permettre aux propriétaires de bots de voir les messages de leurs bots
CREATE POLICY "Bot owners can view their bot messages"
ON public.chat_messages
FOR SELECT
USING (
  (SELECT b.owner_id FROM public.bots b WHERE b.id = bot_id) IN (
    SELECT bo.id FROM public.bot_owners bo WHERE bo.user_id = auth.uid()
  )
);

-- MIGRATION: Politique pour permettre aux propriétaires de bots d'envoyer des réponses manuelles
CREATE POLICY "Bot owners can send manual responses"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  message_type = 'bot' AND
  (SELECT b.owner_id FROM public.bots b WHERE b.id = bot_id) IN (
    SELECT bo.id FROM public.bot_owners bo WHERE bo.user_id = auth.uid()
  )
);

-- MIGRATION: Politique pour permettre aux utilisateurs d'envoyer des messages
CREATE POLICY "Users can send messages in their sessions"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  message_type = 'user'
);

-- MIGRATION: Recréer la fonction pour obtenir ou créer un utilisateur de bot pour une session
CREATE OR REPLACE FUNCTION public.get_or_create_bot_user_for_session(
  p_bot_id uuid,
  p_session_token text,
  p_user_name text DEFAULT NULL
) 
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_bot_user_id uuid;
BEGIN
  SELECT bu.id INTO v_bot_user_id
  FROM public.bot_users bu
  WHERE bu.bot_id = p_bot_id 
    AND bu.session_id = p_session_token;
  
  IF v_bot_user_id IS NULL THEN
    INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated)
    VALUES (p_bot_id, p_session_token, COALESCE(p_user_name, 'Session ' || LEFT(p_session_token, 8)), false)
    RETURNING id INTO v_bot_user_id;
  END IF;
  
  RETURN v_bot_user_id;
END;
$$;

-- MIGRATION: Recréer la fonction pour envoyer une réponse manuelle
CREATE OR REPLACE FUNCTION public.send_manual_bot_response(
  p_bot_id uuid,
  p_session_token text,
  p_message_content text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_bot_user_id uuid;
  v_message_id uuid;
  v_admin_user_id uuid := auth.uid();
BEGIN
  -- La vérification de propriété est maintenant gérée par les politiques RLS.
  -- L'insertion échouera si l'utilisateur n'est pas propriétaire.
  
  v_bot_user_id := public.get_or_create_bot_user_for_session(
    p_bot_id, 
    p_session_token, 
    'Admin Response'
  );
  
  INSERT INTO public.chat_messages (bot_id, bot_user_id, message_content, message_type, ip_address, user_agent, metadata)
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

-- FIX: Recréer la vue pour l'historique des messages pour s'assurer qu'elle est correcte
CREATE VIEW public.bot_message_history
AS
 SELECT b.owner_id,
    cm.id AS message_id,
    cm.bot_id,
    cm.bot_user_id,
    cm.created_at AS message_timestamp,
    cm.metadata,
    bu.created_at AS user_first_seen,
    bu.last_active AS user_last_active,
    cm.user_agent,
    b.name AS bot_name,
    bu.user_name,
    bu.user_email,
    cm.message_content,
    cm.message_type,
    bu.session_id,
    cm.ip_address::text AS ip_address
   FROM ((public.chat_messages cm
     JOIN public.bot_users bu ON ((cm.bot_user_id = bu.id)))
     JOIN public.bots b ON ((cm.bot_id = b.id)));

-- MIGRATION: Activer les mises à jour en temps réel pour les messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- MIGRATION: Activer les mises à jour en temps réel pour les utilisateurs du bot
ALTER TABLE public.bot_users REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_users;

