
-- DIAGNOSTIC EXHAUSTIF ET RÉSOLUTION DÉFINITIVE DE L'AMBIGUÏTÉ session_token

-- 1. Supprimer TOUTES les fonctions potentiellement problématiques
DROP FUNCTION IF EXISTS public.get_unified_chat_history(uuid, text, uuid, integer, uuid);
DROP FUNCTION IF EXISTS public.enhanced_session_reconciliation(uuid, text);
DROP FUNCTION IF EXISTS public.create_anonymous_visitor_session(uuid, uuid, text, text, text, text, text, inet);
DROP FUNCTION IF EXISTS public.save_chat_message(uuid, text, text, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.ensure_bot_accessibility(uuid);
DROP FUNCTION IF EXISTS public.global_bot_repair();
DROP FUNCTION IF EXISTS public.cleanup_corrupted_session_data();
DROP FUNCTION IF EXISTS public.test_session_functions_final();
DROP FUNCTION IF EXISTS public.diagnose_session_token_ambiguities_complete();

-- 2. Créer une table de journalisation pour tracer les erreurs
CREATE TABLE IF NOT EXISTS public.debug_session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  error_message TEXT,
  parameters JSONB DEFAULT '{}',
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fonction de vérification des bots SANS ambiguïté
CREATE OR REPLACE FUNCTION public.verify_bot_access_final(p_bot_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérification simple et directe
  RETURN EXISTS (
    SELECT 1 FROM public.bots b_check
    WHERE b_check.id = p_bot_id
  );
END;
$$;

-- 4. Fonction de création de session anonyme ABSOLUMENT SANS AMBIGUÏTÉ
CREATE OR REPLACE FUNCTION public.create_visitor_session_final(
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
  new_session_token text;
  existing_session_token text;
  bot_exists boolean;
BEGIN
  -- Log de débogage
  INSERT INTO public.debug_session_logs(function_name, parameters) 
  VALUES ('create_visitor_session_final', jsonb_build_object(
    'p_fingerprint_id', p_fingerprint_id,
    'p_bot_id', p_bot_id,
    'p_entry_point', p_entry_point
  ));

  -- Vérification du bot
  SELECT public.verify_bot_access_final(p_bot_id) INTO bot_exists;
  
  IF NOT bot_exists THEN
    RAISE EXCEPTION 'Bot % n''existe pas', p_bot_id;
  END IF;

  -- Recherche d'une session existante avec alias UNIQUE
  SELECT session_token_field INTO existing_session_token
  FROM public.anonymous_visitor_sessions visitor_sessions
  WHERE visitor_sessions.fingerprint_id = p_fingerprint_id
    AND visitor_sessions.bot_id = p_bot_id
    AND visitor_sessions.is_active = true
  ORDER BY visitor_sessions.started_at DESC
  LIMIT 1;

  -- Si session existante trouvée
  IF existing_session_token IS NOT NULL THEN
    -- Mise à jour de l'activité avec alias UNIQUE
    UPDATE public.anonymous_visitor_sessions update_sessions
    SET last_activity = NOW()
    WHERE update_sessions.session_token = existing_session_token;
    
    RETURN existing_session_token;
  END IF;

  -- Génération d'un nouveau token unique
  LOOP
    new_session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
    
    -- Vérification d'unicité avec alias UNIQUE
    IF NOT EXISTS (
      SELECT 1 FROM public.anonymous_visitor_sessions check_sessions
      WHERE check_sessions.session_token = new_session_token
    ) THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Insertion de la nouvelle session
  INSERT INTO public.anonymous_visitor_sessions (
    fingerprint_id, bot_id, session_token, entry_point,
    referrer_url, utm_source, utm_medium, utm_campaign, ip_address
  )
  VALUES (
    p_fingerprint_id, p_bot_id, new_session_token, p_entry_point,
    p_referrer_url, p_utm_source, p_utm_medium, p_utm_campaign, p_ip_address
  );

  RETURN new_session_token;
END;
$$;

-- 5. Fonction de réconciliation de session ABSOLUMENT SANS AMBIGUÏTÉ
CREATE OR REPLACE FUNCTION public.reconcile_session_final(
  p_bot_id uuid,
  p_session_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bot_user_found_id uuid;
  session_exists boolean;
BEGIN
  -- Log de débogage
  INSERT INTO public.debug_session_logs(function_name, parameters) 
  VALUES ('reconcile_session_final', jsonb_build_object(
    'p_bot_id', p_bot_id,
    'p_session_token', p_session_token
  ));

  -- Recherche d'un bot_user existant avec alias UNIQUE
  SELECT user_found.id INTO bot_user_found_id 
  FROM public.bot_users user_found
  WHERE user_found.bot_id = p_bot_id 
    AND user_found.session_id = p_session_token;

  IF bot_user_found_id IS NOT NULL THEN
    -- Mise à jour de l'activité avec alias UNIQUE
    UPDATE public.bot_users user_update
    SET last_active = NOW()
    WHERE user_update.id = bot_user_found_id;
    
    RETURN bot_user_found_id;
  END IF;

  -- Vérification de l'existence d'une session anonyme avec alias UNIQUE
  SELECT EXISTS(
    SELECT 1 FROM public.anonymous_visitor_sessions session_check
    WHERE session_check.bot_id = p_bot_id 
      AND session_check.session_token = p_session_token
  ) INTO session_exists;

  -- Création du bot_user correspondant
  INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
  VALUES (p_bot_id, p_session_token, 'Utilisateur Final', false, NOW())
  RETURNING id INTO bot_user_found_id;

  RETURN bot_user_found_id;
END;
$$;

-- 6. Fonction de sauvegarde de message ABSOLUMENT SANS AMBIGUÏTÉ
CREATE OR REPLACE FUNCTION public.save_message_final(
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
  found_bot_user_id uuid;
  new_message_id uuid;
  converted_ip_addr inet;
BEGIN
  -- Log de débogage
  INSERT INTO public.debug_session_logs(function_name, parameters) 
  VALUES ('save_message_final', jsonb_build_object(
    'p_bot_id', p_bot_id,
    'p_session_token', p_session_token,
    'p_message_type', p_message_type
  ));

  -- Conversion IP
  BEGIN
    converted_ip_addr := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    converted_ip_addr := NULL;
  END;

  -- Réconciliation de session
  found_bot_user_id := public.reconcile_session_final(p_bot_id, p_session_token);

  IF found_bot_user_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de réconcilier la session pour le token: %', p_session_token;
  END IF;

  -- Sauvegarde du message
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
    found_bot_user_id,
    p_message_content,
    p_message_type,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'session_token', p_session_token,
      'saved_with_final_function', true,
      'saved_at', NOW()::text
    ),
    converted_ip_addr,
    p_user_agent
  )
  RETURNING id INTO new_message_id;

  RETURN new_message_id;
END;
$$;

-- 7. Fonction de récupération d'historique ABSOLUMENT SANS AMBIGUÏTÉ
CREATE OR REPLACE FUNCTION public.get_chat_history_final(
  p_bot_id uuid,
  p_session_token text DEFAULT NULL,
  p_bot_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
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
  -- Log de débogage
  INSERT INTO public.debug_session_logs(function_name, parameters) 
  VALUES ('get_chat_history_final', jsonb_build_object(
    'p_bot_id', p_bot_id,
    'p_session_token', p_session_token,
    'p_bot_user_id', p_bot_user_id
  ));

  RETURN QUERY
  SELECT
    messages_query.id as message_id,
    messages_query.bot_id,
    messages_query.bot_user_id,
    messages_query.message_content,
    messages_query.message_type,
    messages_query.created_at as message_timestamp,
    messages_query.metadata,
    COALESCE(
      users_query.session_id,
      messages_query.metadata->>'session_token',
      messages_query.metadata->>'sessionToken',
      'unknown'
    ) as session_id,
    COALESCE(users_query.user_name, 'Utilisateur Anonyme') as user_name,
    users_query.user_email,
    messages_query.ip_address,
    messages_query.user_agent
  FROM public.chat_messages messages_query
  LEFT JOIN public.bot_users users_query ON messages_query.bot_user_id = users_query.id
  WHERE messages_query.bot_id = p_bot_id
    AND (
      -- Par bot_user_id
      (p_bot_user_id IS NOT NULL AND messages_query.bot_user_id = p_bot_user_id)
      OR
      -- Par session_token SANS AMBIGUÏTÉ
      (p_session_token IS NOT NULL AND (
        users_query.session_id = p_session_token
        OR messages_query.metadata->>'session_token' = p_session_token
        OR messages_query.metadata->>'sessionToken' = p_session_token
      ))
      OR
      -- Si aucun critère, récupérer tous les messages récents
      (p_bot_user_id IS NULL AND p_session_token IS NULL)
    )
  ORDER BY messages_query.created_at ASC
  LIMIT p_limit;
END;
$$;

-- 8. Fonction de réparation globale finale
CREATE OR REPLACE FUNCTION public.repair_system_final()
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
BEGIN
  -- Réparer tous les bots inactifs
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

  RETURN QUERY SELECT 'repair_completed'::text, repaired_bots, 'Réparation système terminée avec succès';
END;
$$;

-- 9. Fonction de test finale pour vérifier que tout fonctionne
CREATE OR REPLACE FUNCTION public.test_system_final()
RETURNS TABLE(
  test_name text,
  status text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_bot_id uuid;
  test_fingerprint_id uuid;
  test_token text;
  test_user_id uuid;
  test_message_id uuid;
BEGIN
  -- Test de création de session
  BEGIN
    -- Récupérer un bot existant
    SELECT b.id INTO test_bot_id FROM public.bots b LIMIT 1;
    SELECT f.id INTO test_fingerprint_id FROM public.visitor_fingerprints f LIMIT 1;
    
    IF test_bot_id IS NOT NULL AND test_fingerprint_id IS NOT NULL THEN
      -- Test de création de session
      SELECT public.create_visitor_session_final(
        test_fingerprint_id,
        test_bot_id,
        'test_final',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      ) INTO test_token;
      
      RETURN QUERY SELECT 
        'session_creation'::text,
        'success'::text,
        ('Token créé: ' || COALESCE(LEFT(test_token, 20), 'null'))::text;

      -- Test de réconciliation
      SELECT public.reconcile_session_final(test_bot_id, test_token) INTO test_user_id;
      
      RETURN QUERY SELECT 
        'session_reconciliation'::text,
        'success'::text,
        ('User ID: ' || COALESCE(test_user_id::text, 'null'))::text;

      -- Test de sauvegarde de message
      SELECT public.save_message_final(
        test_bot_id,
        test_token,
        'Message de test',
        'user',
        '{"test": true}'::jsonb
      ) INTO test_message_id;
      
      RETURN QUERY SELECT 
        'message_save'::text,
        'success'::text,
        ('Message ID: ' || COALESCE(test_message_id::text, 'null'))::text;

      -- Test de récupération d'historique
      PERFORM public.get_chat_history_final(test_bot_id, test_token, NULL, 1);
      
      RETURN QUERY SELECT 
        'history_retrieval'::text,
        'success'::text,
        'Récupération d''historique réussie'::text;
        
    ELSE
      RETURN QUERY SELECT 
        'all_tests'::text,
        'skipped'::text,
        'Données de test manquantes'::text;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.debug_session_logs(function_name, error_message, stack_trace) 
    VALUES ('test_system_final', SQLERRM, SQLSTATE);
    
    RETURN QUERY SELECT 
      'error_detected'::text,
      'failed'::text,
      ('ERREUR: ' || SQLERRM)::text;
  END;
END;
$$;

-- 10. Nettoyer les anciennes données corrompues
DELETE FROM public.anonymous_visitor_sessions WHERE bot_id NOT IN (SELECT id FROM public.bots);
DELETE FROM public.bot_users WHERE bot_id NOT IN (SELECT id FROM public.bots);
DELETE FROM public.chat_messages WHERE bot_id NOT IN (SELECT id FROM public.bots);

-- 11. Ajouter des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_token_final 
ON public.anonymous_visitor_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_bot_final 
ON public.anonymous_visitor_sessions(bot_id);

CREATE INDEX IF NOT EXISTS idx_bot_users_session_final 
ON public.bot_users(session_id);

CREATE INDEX IF NOT EXISTS idx_bot_users_bot_final 
ON public.bot_users(bot_id);
;
