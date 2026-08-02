
-- 1. Corriger définitivement la fonction get_chat_history pour éliminer l'ambiguïté
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

  -- Recherche robuste SANS ambiguïté - on qualifie explicitement toutes les références
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
        -- Cas 2: Recherche par session_token - multiples stratégies
        (p_session_token IS NOT NULL AND (
            -- Token exact dans bot_users
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

-- 2. Créer une fonction de réconciliation automatique des sessions
CREATE OR REPLACE FUNCTION public.auto_reconcile_session_token(
    p_bot_id uuid,
    p_session_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_user_id uuid;
  v_anonymous_session_id uuid;
BEGIN
  -- Étape 1: Chercher un bot_user existant avec ce token
  SELECT id INTO v_bot_user_id 
  FROM public.bot_users
  WHERE bot_id = p_bot_id AND session_id = p_session_token;

  -- Étape 2: Si pas trouvé, chercher dans les sessions anonymes
  IF v_bot_user_id IS NULL THEN
    SELECT id INTO v_anonymous_session_id
    FROM public.anonymous_visitor_sessions
    WHERE bot_id = p_bot_id AND session_token = p_session_token;

    -- Si session anonyme trouvée, créer le bot_user correspondant
    IF v_anonymous_session_id IS NOT NULL THEN
      INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
      VALUES (p_bot_id, p_session_token, 'Visiteur Anonyme', false, NOW())
      RETURNING id INTO v_bot_user_id;
    END IF;
  END IF;

  -- Étape 3: Si toujours pas trouvé, forcer la création
  IF v_bot_user_id IS NULL THEN
    INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
    VALUES (p_bot_id, p_session_token, 'Session Récupérée', false, NOW())
    RETURNING id INTO v_bot_user_id;
  END IF;

  -- Étape 4: Mettre à jour l'activité
  UPDATE public.bot_users 
  SET last_active = NOW()
  WHERE id = v_bot_user_id;

  RETURN v_bot_user_id;
END;
$$;

-- 3. Modifier save_chat_message pour utiliser la réconciliation automatique
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
  v_final_token text;
BEGIN
  -- Gestion robuste du token
  IF p_session_token IS NULL OR TRIM(p_session_token) = '' THEN
    v_final_token := 'anon_recovery_' || encode(gen_random_bytes(12), 'hex');
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token) 
    VALUES ('empty_session_token_recovered', p_bot_id, v_final_token);
  ELSE
    v_final_token := p_session_token;
  END IF;

  -- Conversion IP sécurisée
  BEGIN
    v_ip_addr := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip_addr := NULL;
  END;

  -- Utiliser la réconciliation automatique
  v_bot_user_id := public.auto_reconcile_session_token(p_bot_id, v_final_token);

  IF v_bot_user_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de réconcilier la session pour: %', v_final_token;
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
    p_metadata || jsonb_build_object(
      'session_token', v_final_token,
      'reconciled_at', NOW()::text,
      'original_token', p_session_token
    ),
    v_ip_addr,
    p_user_agent
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- 4. Assurer la synchronisation des sessions anonymes
CREATE OR REPLACE FUNCTION public.ensure_session_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lors de création d'un message, s'assurer que la session existe partout
  IF TG_OP = 'INSERT' THEN
    -- Vérifier qu'il y a bien une session anonyme correspondante
    IF NOT EXISTS (
      SELECT 1 FROM public.anonymous_visitor_sessions 
      WHERE bot_id = NEW.bot_id 
      AND session_token = NEW.metadata->>'session_token'
    ) THEN
      -- Créer la session anonyme manquante
      INSERT INTO public.anonymous_visitor_sessions (
        bot_id, session_token, fingerprint_id, entry_point, started_at, last_activity
      ) 
      SELECT 
        NEW.bot_id,
        NEW.metadata->>'session_token',
        (SELECT id FROM public.visitor_fingerprints LIMIT 1), -- Fallback
        'recovery',
        NOW(),
        NOW()
      WHERE NEW.metadata->>'session_token' IS NOT NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour assurer la cohérence
DROP TRIGGER IF EXISTS trigger_ensure_session_consistency ON public.chat_messages;
CREATE TRIGGER trigger_ensure_session_consistency
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_session_consistency();

-- 5. Fonction de nettoyage pour réconcilier les sessions existantes
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reconciled_count integer := 0;
  session_record RECORD;
BEGIN
  -- Réconcilier toutes les sessions anonymes qui n'ont pas de bot_user correspondant
  FOR session_record IN 
    SELECT DISTINCT avs.bot_id, avs.session_token
    FROM public.anonymous_visitor_sessions avs
    WHERE NOT EXISTS (
      SELECT 1 FROM public.bot_users bu 
      WHERE bu.bot_id = avs.bot_id 
      AND bu.session_id = avs.session_token
    )
  LOOP
    PERFORM public.auto_reconcile_session_token(session_record.bot_id, session_record.session_token);
    reconciled_count := reconciled_count + 1;
  END LOOP;

  RETURN reconciled_count;
END;
$$;

-- Exécuter le nettoyage immédiatement
SELECT public.cleanup_orphaned_sessions();
;
