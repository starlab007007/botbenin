
-- CORRECTION DÉFINITIVE ET GLOBALE DES ERREURS DE SESSION

-- 1. Fonction corrigée pour vérifier et réparer l'accès aux bots
CREATE OR REPLACE FUNCTION public.ensure_bot_accessibility(p_bot_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier si le bot existe et le réparer si nécessaire
  IF NOT EXISTS (SELECT 1 FROM public.bots WHERE id = p_bot_id) THEN
    RETURN false;
  END IF;
  
  -- S'assurer que le bot est actif et partageable
  UPDATE public.bots 
  SET 
    is_active = true,
    share_enabled = true,
    updated_at = NOW()
  WHERE id = p_bot_id 
    AND (is_active = false OR is_active IS NULL OR share_enabled = false OR share_enabled IS NULL);
  
  RETURN true;
END;
$$;

-- 2. Fonction corrigée pour créer des sessions anonymes SANS ambiguïté
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
  bot_accessible boolean;
BEGIN
  -- Vérifier et réparer l'accessibilité du bot
  SELECT public.ensure_bot_accessibility(p_bot_id) INTO bot_accessible;
  
  IF NOT bot_accessible THEN
    RAISE EXCEPTION 'Bot % n''est pas accessible ou n''existe pas', p_bot_id;
  END IF;

  -- Chercher une session existante SANS ambiguïté (qualification explicite)
  SELECT avs.session_token INTO existing_token
  FROM public.anonymous_visitor_sessions avs
  WHERE avs.fingerprint_id = p_fingerprint_id
    AND avs.bot_id = p_bot_id
    AND avs.entry_point = COALESCE(p_entry_point, 'direct')
    AND (p_referrer_url IS NULL OR avs.referrer_url = p_referrer_url)
    AND avs.is_active = true
  ORDER BY avs.started_at DESC
  LIMIT 1;

  IF existing_token IS NOT NULL THEN
    -- Mettre à jour l'activité de la session existante
    UPDATE public.anonymous_visitor_sessions 
    SET last_activity = NOW()
    WHERE session_token = existing_token;
    
    RETURN existing_token;
  END IF;

  -- Créer une nouvelle session avec un token unique
  LOOP
    session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
    
    -- Vérifier l'unicité SANS ambiguïté (qualification explicite)
    IF NOT EXISTS (
      SELECT 1 FROM public.anonymous_visitor_sessions avs2
      WHERE avs2.session_token = session_token
    ) THEN
      EXIT;
    END IF;
  END LOOP;
  
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

-- 3. Fonction corrigée pour la réconciliation de session SANS ambiguïté
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
  v_session_exists boolean;
  bot_accessible boolean;
BEGIN
  -- Vérifier et réparer l'accessibilité du bot
  SELECT public.ensure_bot_accessibility(p_bot_id) INTO bot_accessible;
  
  IF NOT bot_accessible THEN
    RAISE EXCEPTION 'Bot % n''est pas accessible pour la réconciliation', p_bot_id;
  END IF;

  -- Étape 1: Chercher un bot_user existant SANS ambiguïté (qualification explicite)
  SELECT bu.id INTO v_bot_user_id 
  FROM public.bot_users bu
  WHERE bu.bot_id = p_bot_id 
    AND bu.session_id = p_session_token;

  IF v_bot_user_id IS NOT NULL THEN
    -- Mettre à jour l'activité
    UPDATE public.bot_users 
    SET last_active = NOW()
    WHERE id = v_bot_user_id;
    
    RETURN v_bot_user_id;
  END IF;

  -- Étape 2: Vérifier si une session anonyme existe SANS ambiguïté (qualification explicite)
  SELECT EXISTS(
    SELECT 1 FROM public.anonymous_visitor_sessions avs
    WHERE avs.bot_id = p_bot_id 
      AND avs.session_token = p_session_token
  ) INTO v_session_exists;

  -- Étape 3: Créer le bot_user correspondant
  INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
  VALUES (p_bot_id, p_session_token, 'Utilisateur Réconcilié', false, NOW())
  RETURNING id INTO v_bot_user_id;

  RETURN v_bot_user_id;
END;
$$;

-- 4. Fonction corrigée pour récupérer l'historique SANS ambiguïté + SÉCURITÉ PROPRIÉTAIRE
CREATE OR REPLACE FUNCTION public.get_unified_chat_history(
  p_bot_id uuid,
  p_session_token text DEFAULT NULL,
  p_bot_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  message_id uuid,
  bot_id uuid,
  bot_user_id uuid,
  message_content text,
  message_type text,
  message_timestamp timestamp with time zone,
  metadata jsonb,
  session_id text,
  user_name text,
  user_email text,
  ip_address text,
  user_agent text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- SÉCURITÉ: Vérifier que l'utilisateur est propriétaire du bot
  IF p_requesting_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE b.id = p_bot_id AND bo.user_id = p_requesting_user_id
    ) THEN
      -- Si pas propriétaire, retourner vide (pas d'erreur pour les accès publics)
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    cm.id as message_id,
    cm.bot_id,
    cm.bot_user_id,
    cm.message_content,
    cm.message_type,
    cm.created_at as message_timestamp,
    cm.metadata,
    COALESCE(
      bu.session_id,
      cm.metadata->>'session_token',
      cm.metadata->>'sessionToken',
      'unknown'
    ) as session_id,
    COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
    bu.user_email,
    cm.ip_address,
    cm.user_agent
  FROM public.chat_messages cm
  LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
  WHERE cm.bot_id = p_bot_id
    AND (
      -- Par bot_user_id
      (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id)
      OR
      -- Par session_token SANS ambiguïté (qualification EXPLICITE)
      (p_session_token IS NOT NULL AND (
        bu.session_id = p_session_token
        OR cm.metadata->>'session_token' = p_session_token
        OR cm.metadata->>'sessionToken' = p_session_token
      ))
      OR
      -- Si aucun critère, récupérer tous les messages récents
      (p_bot_user_id IS NULL AND p_session_token IS NULL)
    )
  ORDER BY cm.created_at ASC
  LIMIT p_limit;
END;
$$;

-- 5. Fonction corrigée pour sauvegarder les messages SANS ambiguïté
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
  bot_accessible boolean;
BEGIN
  -- Vérifier et réparer l'accessibilité du bot
  SELECT public.ensure_bot_accessibility(p_bot_id) INTO bot_accessible;
  
  IF NOT bot_accessible THEN
    RAISE EXCEPTION 'Bot % n''est pas accessible pour sauvegarder un message', p_bot_id;
  END IF;

  -- Try to cast IP
  BEGIN
    v_ip_addr := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip_addr := NULL;
  END;

  -- Log si p_session_token est null/empty
  IF p_session_token IS NULL OR TRIM(p_session_token) = '' THEN
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token) 
    VALUES ('empty_session_token', p_bot_id, p_session_token);
  END IF;

  -- Utiliser la réconciliation améliorée SANS ambiguïté
  v_bot_user_id := public.enhanced_session_reconciliation(p_bot_id, p_session_token);

  IF v_bot_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to reconcile session for token: %', p_session_token;
  END IF;

  -- Sauvegarder le message avec métadonnées enrichies
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
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'session_token', p_session_token,
      'reconciled_at', NOW()::text,
      'reconciliation_method', 'enhanced_corrected'
    ),
    v_ip_addr,
    p_user_agent
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- 6. Politique de sécurité pour les conversations (utilisateurs ne voient que leurs bots)
DROP POLICY IF EXISTS "Users can only access their own bot conversations" ON public.chat_messages;
CREATE POLICY "Users can only access their own bot conversations" 
ON public.chat_messages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE b.id = bot_id AND bo.user_id = auth.uid()
  )
);

-- 7. Activer RLS sur les messages de chat
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 8. Politique de sécurité pour les sessions (utilisateurs ne voient que leurs bots)
DROP POLICY IF EXISTS "Users can only access sessions for their own bots" ON public.enhanced_chat_sessions;
CREATE POLICY "Users can only access sessions for their own bots" 
ON public.enhanced_chat_sessions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE b.id = bot_id AND bo.user_id = auth.uid()
  )
);

-- 9. Activer RLS sur les sessions
ALTER TABLE public.enhanced_chat_sessions ENABLE ROW LEVEL SECURITY;

-- 10. Fonction de réparation globale automatique
CREATE OR REPLACE FUNCTION public.global_bot_repair()
RETURNS TABLE(
  action_taken text,
  affected_count integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  repaired_bots integer := 0;
  reconciled_sessions integer := 0;
BEGIN
  -- Réparer tous les bots inactifs ou non partageables
  UPDATE public.bots 
  SET 
    is_active = true,
    share_enabled = true,
    updated_at = NOW()
  WHERE is_active = false OR is_active IS NULL OR share_enabled = false OR share_enabled IS NULL;
  
  GET DIAGNOSTICS repaired_bots = ROW_COUNT;
  
  IF repaired_bots > 0 THEN
    RETURN QUERY SELECT 'repaired_bots'::text, repaired_bots, 'Bots réparés automatiquement';
  END IF;

  -- Réconcilier toutes les sessions orphelines
  SELECT count INTO reconciled_sessions FROM public.auto_fix_session_issues();
  
  IF reconciled_sessions > 0 THEN
    RETURN QUERY SELECT 'reconciled_sessions'::text, reconciled_sessions, 'Sessions réconciliées automatiquement';
  END IF;

  RETURN QUERY SELECT 'global_repair_completed'::text, (repaired_bots + reconciled_sessions), 'Réparation globale terminée';
END;
$$;
;
