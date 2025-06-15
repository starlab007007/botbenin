
-- Phase 1: Consolidation des tables et correction de l'architecture

-- 1. Nettoyer les données existantes avec bot_id inexistant
DELETE FROM public.chat_messages 
WHERE bot_id NOT IN (SELECT id FROM public.bots);

DELETE FROM public.enhanced_chat_sessions 
WHERE bot_id NOT IN (SELECT id FROM public.bots);

DELETE FROM public.anonymous_visitor_sessions 
WHERE bot_id NOT IN (SELECT id FROM public.bots);

DELETE FROM public.bot_users 
WHERE bot_id NOT IN (SELECT id FROM public.bots);

-- 2. Créer une table de logs pour traquer les anomalies de session
CREATE TABLE IF NOT EXISTS public.logs_session_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type TEXT NOT NULL,
  bot_id UUID,
  input_token TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fonction améliorée de réconciliation des sessions
CREATE OR REPLACE FUNCTION public.enhanced_session_reconciliation(
    p_bot_id uuid,
    p_session_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_user_id uuid;
  v_anonymous_session_exists boolean;
  v_fingerprint_id uuid;
BEGIN
  -- Vérifier que le bot existe
  IF NOT EXISTS (SELECT 1 FROM public.bots WHERE id = p_bot_id) THEN
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token) 
    VALUES ('bot_not_found', p_bot_id, p_session_token);
    RAISE EXCEPTION 'Bot % does not exist', p_bot_id;
  END IF;

  -- Stratégie 1: Chercher un bot_user existant
  SELECT id INTO v_bot_user_id 
  FROM public.bot_users
  WHERE bot_id = p_bot_id AND session_id = p_session_token;

  IF v_bot_user_id IS NOT NULL THEN
    UPDATE public.bot_users 
    SET last_active = NOW()
    WHERE id = v_bot_user_id;
    RETURN v_bot_user_id;
  END IF;

  -- Stratégie 2: Chercher dans les métadonnées des messages
  SELECT DISTINCT cm.bot_user_id INTO v_bot_user_id
  FROM public.chat_messages cm
  WHERE cm.bot_id = p_bot_id
    AND (
      cm.metadata->>'session_token' = p_session_token
      OR cm.metadata->>'sessionToken' = p_session_token
    )
  LIMIT 1;

  -- Si trouvé dans les messages, corriger bot_users
  IF v_bot_user_id IS NOT NULL THEN
    UPDATE public.bot_users 
    SET session_id = p_session_token, last_active = NOW()
    WHERE id = v_bot_user_id AND (session_id IS NULL OR session_id = '');
    RETURN v_bot_user_id;
  END IF;

  -- Stratégie 3: Vérifier si une session anonyme existe
  SELECT EXISTS (
    SELECT 1 FROM public.anonymous_visitor_sessions
    WHERE bot_id = p_bot_id AND session_token = p_session_token
  ) INTO v_anonymous_session_exists;

  -- Si pas de session anonyme, créer un fingerprint et une session
  IF NOT v_anonymous_session_exists THEN
    -- Créer un fingerprint basique
    INSERT INTO public.visitor_fingerprints (fingerprint_hash, browser_info)
    VALUES (
      encode(sha256(p_session_token::bytea), 'hex'),
      jsonb_build_object('recovery', true)
    )
    RETURNING id INTO v_fingerprint_id;

    -- Créer la session anonyme
    INSERT INTO public.anonymous_visitor_sessions (
      fingerprint_id, bot_id, session_token, entry_point
    )
    VALUES (v_fingerprint_id, p_bot_id, p_session_token, 'recovery');
  END IF;

  -- Créer le bot_user final
  INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
  VALUES (p_bot_id, p_session_token, 'Session Réconciliée', false, NOW())
  RETURNING id INTO v_bot_user_id;

  RETURN v_bot_user_id;
END;
$$;

-- 4. Vue unifiée pour l'historique des conversations
CREATE OR REPLACE VIEW public.unified_conversation_history AS
SELECT 
  cm.id as message_id,
  cm.bot_id,
  cm.bot_user_id,
  cm.created_at as message_timestamp,
  cm.message_content,
  cm.message_type,
  cm.ip_address,
  cm.user_agent,
  cm.metadata,
  
  -- Informations utilisateur
  bu.session_id,
  bu.user_name,
  bu.user_email,
  bu.created_at as user_first_seen,
  bu.last_active as user_last_active,
  
  -- Informations bot
  b.name as bot_name,
  b.owner_id,
  
  -- Informations session améliorée
  ecs.session_token as enhanced_session_token,
  ecs.started_at as session_start,
  ecs.last_activity as session_last_activity,
  ecs.total_messages as session_total_messages,
  ecs.entry_point
  
FROM public.chat_messages cm
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
LEFT JOIN public.bots b ON cm.bot_id = b.id
LEFT JOIN public.enhanced_chat_sessions ecs ON (
  ecs.bot_user_id = cm.bot_user_id 
  OR ecs.session_token = bu.session_id
  OR ecs.session_token = cm.metadata->>'session_token'
)
ORDER BY cm.created_at ASC;

-- 5. Trigger pour s'assurer de la cohérence lors de nouvelles sessions
CREATE OR REPLACE FUNCTION public.verify_bot_exists_for_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier que le bot existe avant de sauvegarder un message
  IF NOT EXISTS (SELECT 1 FROM public.bots WHERE id = NEW.bot_id) THEN
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token) 
    VALUES ('message_for_nonexistent_bot', NEW.bot_id, NEW.metadata->>'session_token');
    RAISE EXCEPTION 'Cannot save message for non-existent bot %', NEW.bot_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS verify_bot_exists_before_message ON public.chat_messages;
CREATE TRIGGER verify_bot_exists_before_message
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.verify_bot_exists_for_message();

-- 6. Fonction RPC améliorée pour récupérer l'historique
CREATE OR REPLACE FUNCTION public.get_unified_chat_history(
    p_bot_id uuid,
    p_session_token text DEFAULT NULL,
    p_bot_user_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 100
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
      jsonb_build_object(
          'id', uch.message_id,
          'message_id', uch.message_id,
          'bot_id', uch.bot_id,
          'bot_user_id', uch.bot_user_id,
          'created_at', uch.message_timestamp,
          'message_timestamp', uch.message_timestamp,
          'message_content', uch.message_content,
          'message_type', uch.message_type,
          'ip_address', uch.ip_address,
          'user_agent', uch.user_agent,
          'metadata', uch.metadata,
          'session_id', COALESCE(
            uch.session_id, 
            uch.enhanced_session_token,
            uch.metadata->>'session_token',
            'unknown'
          ),
          'user_name', COALESCE(uch.user_name, 'Utilisateur Anonyme'),
          'user_email', uch.user_email,
          'user_first_seen', uch.user_first_seen,
          'user_last_active', uch.user_last_active,
          'bot_name', uch.bot_name,
          'owner_id', uch.owner_id,
          'session_start', uch.session_start,
          'entry_point', uch.entry_point
      )
  FROM
      public.unified_conversation_history uch
  WHERE
      uch.bot_id = p_bot_id
      AND (
        -- Recherche par session_token
        (p_session_token IS NOT NULL AND (
            uch.session_id = p_session_token
            OR uch.enhanced_session_token = p_session_token
            OR uch.metadata->>'session_token' = p_session_token
            OR uch.metadata->>'sessionToken' = p_session_token
        ))
        -- Recherche par bot_user_id
        OR (p_bot_user_id IS NOT NULL AND uch.bot_user_id = p_bot_user_id)
        -- Si aucun critère, récupérer les messages récents
        OR (p_session_token IS NULL AND p_bot_user_id IS NULL)
      )
  ORDER BY uch.message_timestamp ASC
  LIMIT p_limit;
END;
$$;
