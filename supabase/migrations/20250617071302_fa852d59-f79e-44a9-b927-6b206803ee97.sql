
-- Corriger définitivement l'ambiguïté des colonnes session_token
CREATE OR REPLACE FUNCTION public.enhanced_session_reconciliation(p_bot_id uuid, p_session_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_user_id uuid;
  v_anonymous_session_exists boolean;
  v_fingerprint_id uuid;
BEGIN
  -- Vérifier que le bot existe (avec logging pour diagnostic)
  IF NOT EXISTS (SELECT 1 FROM public.bots WHERE id = p_bot_id AND (is_active IS NULL OR is_active = true)) THEN
    -- Log détaillé pour diagnostic
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token, details) 
    VALUES ('bot_validation_failed', p_bot_id, p_session_token, 
            jsonb_build_object(
              'attempted_at', NOW(), 
              'bot_check_query', 'SELECT 1 FROM public.bots WHERE id = ' || p_bot_id::text,
              'session_token', p_session_token
            ));
    RAISE EXCEPTION 'Bot % does not exist or is inactive', p_bot_id;
  END IF;

  -- Stratégie 1: Chercher un bot_user existant avec qualification explicite des colonnes
  SELECT bu.id INTO v_bot_user_id 
  FROM public.bot_users bu
  WHERE bu.bot_id = p_bot_id AND bu.session_id = p_session_token;

  IF v_bot_user_id IS NOT NULL THEN
    UPDATE public.bot_users 
    SET last_active = NOW()
    WHERE id = v_bot_user_id;
    RETURN v_bot_user_id;
  END IF;

  -- Stratégie 2: Chercher dans les métadonnées des messages avec qualification explicite
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
    WHERE id = v_bot_user_id;
    RETURN v_bot_user_id;
  END IF;

  -- Stratégie 3: Vérifier les sessions anonymes
  SELECT EXISTS(
    SELECT 1 FROM public.anonymous_visitor_sessions avs
    WHERE avs.bot_id = p_bot_id AND avs.session_token = p_session_token
  ) INTO v_anonymous_session_exists;

  -- Si session anonyme existe, créer le bot_user correspondant
  IF v_anonymous_session_exists THEN
    INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
    VALUES (p_bot_id, p_session_token, 'Visiteur Anonyme', false, NOW())
    RETURNING id INTO v_bot_user_id;
    RETURN v_bot_user_id;
  END IF;

  -- Stratégie finale: Créer une nouvelle entrée
  INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
  VALUES (p_bot_id, p_session_token, 'Session Récupérée', false, NOW())
  RETURNING id INTO v_bot_user_id;

  -- Log la création réussie
  INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token, details) 
  VALUES ('session_created_successfully', p_bot_id, p_session_token, 
          jsonb_build_object('bot_user_id', v_bot_user_id, 'created_at', NOW()));

  RETURN v_bot_user_id;
END;
$$;

-- Améliorer la fonction de création de session anonyme pour éviter l'ambiguïté
CREATE OR REPLACE FUNCTION public.create_anonymous_visitor_session(
  p_fingerprint_id uuid, 
  p_bot_id uuid, 
  p_entry_point text DEFAULT 'direct'::text, 
  p_referrer_url text DEFAULT NULL::text, 
  p_utm_source text DEFAULT NULL::text, 
  p_utm_medium text DEFAULT NULL::text, 
  p_utm_campaign text DEFAULT NULL::text, 
  p_ip_address inet DEFAULT NULL::inet
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
  -- Vérifier d'abord que le bot existe et est actif
  IF NOT EXISTS (
    SELECT 1 FROM public.bots 
    WHERE id = p_bot_id 
    AND (is_active IS NULL OR is_active = true)
  ) THEN
    RAISE EXCEPTION 'Cannot create session: Bot % does not exist or is inactive', p_bot_id;
  END IF;

  -- Chercher une session existante avec qualification explicite
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

  -- Créer une nouvelle session avec un token unique et vérifié
  LOOP
    session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
    
    -- Vérifier l'unicité
    IF NOT EXISTS (
      SELECT 1 FROM public.anonymous_visitor_sessions 
      WHERE session_token = session_token
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

-- Fonction de diagnostic améliorée pour identifier les problèmes
CREATE OR REPLACE FUNCTION public.diagnose_bot_session_issues(p_bot_id uuid DEFAULT NULL)
RETURNS TABLE(
  issue_type text,
  count bigint,
  details jsonb,
  suggested_action text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Bots inactifs ou manquants
  RETURN QUERY
  SELECT 
    'inactive_bots'::text,
    COUNT(*)::bigint,
    jsonb_agg(jsonb_build_object('bot_id', b.id, 'name', b.name, 'is_active', b.is_active)),
    'Activate bots or clean up references'::text
  FROM public.bots b
  WHERE (p_bot_id IS NULL OR b.id = p_bot_id)
    AND (b.is_active = false OR b.is_active IS NULL);

  -- 2. Sessions orphelines
  RETURN QUERY
  SELECT 
    'orphaned_sessions'::text,
    COUNT(*)::bigint,
    jsonb_agg(jsonb_build_object('bot_id', avs.bot_id, 'session_token', LEFT(avs.session_token, 20))),
    'Run enhanced_session_reconciliation'::text
  FROM public.anonymous_visitor_sessions avs
  WHERE (p_bot_id IS NULL OR avs.bot_id = p_bot_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.bot_users bu 
      WHERE bu.bot_id = avs.bot_id AND bu.session_id = avs.session_token
    );

  -- 3. Messages sans sessions valides
  RETURN QUERY
  SELECT 
    'messages_without_sessions'::text,
    COUNT(*)::bigint,
    jsonb_agg(jsonb_build_object('message_id', cm.id, 'bot_id', cm.bot_id)),
    'Create missing bot_users entries'::text
  FROM public.chat_messages cm
  WHERE (p_bot_id IS NULL OR cm.bot_id = p_bot_id)
    AND cm.bot_user_id IS NULL;

  -- 4. Anomalies récentes
  RETURN QUERY
  SELECT 
    'recent_anomalies'::text,
    COUNT(*)::bigint,
    jsonb_agg(jsonb_build_object('anomaly_type', lsa.anomaly_type, 'details', lsa.details)),
    'Review and fix root causes'::text
  FROM public.logs_session_anomalies lsa
  WHERE (p_bot_id IS NULL OR lsa.bot_id = p_bot_id)
    AND lsa.created_at > NOW() - INTERVAL '1 hour';
END;
$$;

-- Fonction de réparation automatique
CREATE OR REPLACE FUNCTION public.auto_fix_session_issues(p_bot_id uuid DEFAULT NULL)
RETURNS TABLE(
  action_taken text,
  affected_count integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fixed_count integer;
  session_record RECORD;
BEGIN
  -- 1. Activer les bots inactifs (si approprié)
  UPDATE public.bots 
  SET is_active = true, updated_at = NOW()
  WHERE (p_bot_id IS NULL OR id = p_bot_id)
    AND (is_active = false OR is_active IS NULL);
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  IF fixed_count > 0 THEN
    RETURN QUERY SELECT 'activated_bots'::text, fixed_count, 'Bots réactivés automatiquement';
  END IF;

  -- 2. Réconcilier les sessions orphelines
  fixed_count := 0;
  FOR session_record IN 
    SELECT DISTINCT avs.bot_id, avs.session_token
    FROM public.anonymous_visitor_sessions avs
    WHERE (p_bot_id IS NULL OR avs.bot_id = p_bot_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.bot_users bu 
        WHERE bu.bot_id = avs.bot_id AND bu.session_id = avs.session_token
      )
    LIMIT 100  -- Limiter pour éviter les timeouts
  LOOP
    BEGIN
      PERFORM public.enhanced_session_reconciliation(session_record.bot_id, session_record.session_token);
      fixed_count := fixed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log l'erreur mais continuer
      INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token, details) 
      VALUES ('auto_fix_failed', session_record.bot_id, session_record.session_token, 
              jsonb_build_object('error', SQLERRM, 'attempted_at', NOW()));
    END;
  END LOOP;

  IF fixed_count > 0 THEN
    RETURN QUERY SELECT 'reconciled_sessions'::text, fixed_count, 'Sessions réconciliées automatiquement';
  END IF;

  -- 3. Nettoyer les anciennes anomalies (plus de 24h)
  DELETE FROM public.logs_session_anomalies 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  IF fixed_count > 0 THEN
    RETURN QUERY SELECT 'cleaned_old_logs'::text, fixed_count, 'Anciens logs nettoyés';
  END IF;
END;
$$;
;
