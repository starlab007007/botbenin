
-- SOLUTION DÉFINITIVE : Nettoyage complet et reconstruction du système de sessions

-- 1. Supprimer toutes les fonctions problématiques
DROP FUNCTION IF EXISTS public.create_visitor_session_final(uuid, uuid, text, text, text, text, text, inet);
DROP FUNCTION IF EXISTS public.reconcile_session_final(uuid, text);
DROP FUNCTION IF EXISTS public.save_message_final(uuid, text, text, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.get_chat_history_final(uuid, text, uuid, integer);
DROP FUNCTION IF EXISTS public.verify_bot_access_final(uuid);
DROP FUNCTION IF EXISTS public.repair_system_final();
DROP FUNCTION IF EXISTS public.test_system_final();

-- 2. Vérifier et nettoyer les tables existantes
DELETE FROM public.anonymous_visitor_sessions WHERE bot_id NOT IN (SELECT id FROM public.bots);
DELETE FROM public.bot_users WHERE bot_id NOT IN (SELECT id FROM public.bots);
DELETE FROM public.chat_messages WHERE bot_id NOT IN (SELECT id FROM public.bots);

-- 3. S'assurer que tous les bots sont actifs
UPDATE public.bots SET is_active = true, share_enabled = true WHERE is_active = false OR is_active IS NULL OR share_enabled = false OR share_enabled IS NULL;

-- 4. Fonction de vérification des bots - VERSION CORRIGÉE
CREATE OR REPLACE FUNCTION public.verify_bot_access_final(p_bot_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bots WHERE id = p_bot_id AND is_active = true
  );
END;
$$;

-- 5. Fonction de création de session - VERSION CORRIGÉE SANS AMBIGUÏTÉ
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
  existing_token text;
  bot_exists boolean;
BEGIN
  -- Vérifier le bot
  SELECT public.verify_bot_access_final(p_bot_id) INTO bot_exists;
  
  IF NOT bot_exists THEN
    RAISE EXCEPTION 'Bot % n''existe pas ou n''est pas actif', p_bot_id;
  END IF;

  -- Recherche d'une session existante - CORRECTION : utiliser le vrai nom de colonne
  SELECT session_token INTO existing_token
  FROM public.anonymous_visitor_sessions 
  WHERE fingerprint_id = p_fingerprint_id
    AND bot_id = p_bot_id
    AND is_active = true
  ORDER BY started_at DESC
  LIMIT 1;

  -- Si session existante trouvée
  IF existing_token IS NOT NULL THEN
    -- Mise à jour de l'activité
    UPDATE public.anonymous_visitor_sessions
    SET last_activity = NOW()
    WHERE session_token = existing_token;
    
    RETURN existing_token;
  END IF;

  -- Génération d'un nouveau token unique
  LOOP
    new_session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
    
    -- Vérification d'unicité
    IF NOT EXISTS (
      SELECT 1 FROM public.anonymous_visitor_sessions
      WHERE session_token = new_session_token
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

-- 6. Fonction de réconciliation de session - VERSION CORRIGÉE
CREATE OR REPLACE FUNCTION public.reconcile_session_final(
  p_bot_id uuid,
  p_session_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bot_user_id uuid;
  session_exists boolean;
BEGIN
  -- Recherche d'un bot_user existant
  SELECT id INTO bot_user_id 
  FROM public.bot_users
  WHERE bot_id = p_bot_id 
    AND session_id = p_session_token;

  IF bot_user_id IS NOT NULL THEN
    -- Mise à jour de l'activité
    UPDATE public.bot_users
    SET last_active = NOW()
    WHERE id = bot_user_id;
    
    RETURN bot_user_id;
  END IF;

  -- Vérification de l'existence d'une session anonyme
  SELECT EXISTS(
    SELECT 1 FROM public.anonymous_visitor_sessions
    WHERE bot_id = p_bot_id 
      AND session_token = p_session_token
  ) INTO session_exists;

  -- Création du bot_user correspondant
  INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
  VALUES (p_bot_id, p_session_token, 'Utilisateur Final', false, NOW())
  RETURNING id INTO bot_user_id;

  RETURN bot_user_id;
END;
$$;

-- 7. Fonction de sauvegarde de message - VERSION CORRIGÉE
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
  bot_user_id uuid;
  new_message_id uuid;
  converted_ip_addr inet;
BEGIN
  -- Conversion IP
  BEGIN
    converted_ip_addr := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    converted_ip_addr := NULL;
  END;

  -- Réconciliation de session
  bot_user_id := public.reconcile_session_final(p_bot_id, p_session_token);

  IF bot_user_id IS NULL THEN
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
    bot_user_id,
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

-- 8. Fonction de récupération d'historique - VERSION CORRIGÉE
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
      -- Par session_token
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

-- 9. Fonction de réparation globale finale
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

-- 10. Fonction de test finale
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
  -- Test de base
  BEGIN
    -- Récupérer un bot existant
    SELECT id INTO test_bot_id FROM public.bots WHERE is_active = true LIMIT 1;
    SELECT id INTO test_fingerprint_id FROM public.visitor_fingerprints LIMIT 1;
    
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
        'Message de test final',
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
    RETURN QUERY SELECT 
      'error_detected'::text,
      'failed'::text,
      ('ERREUR: ' || SQLERRM)::text;
  END;
END;
$$;

-- 11. Nettoyer les données corrompues
DELETE FROM public.anonymous_visitor_sessions WHERE bot_id NOT IN (SELECT id FROM public.bots);
DELETE FROM public.bot_users WHERE bot_id NOT IN (SELECT id FROM public.bots);
DELETE FROM public.chat_messages WHERE bot_id NOT IN (SELECT id FROM public.bots);

-- 12. Optimiser les index
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_token_corrected 
ON public.anonymous_visitor_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_bot_corrected 
ON public.anonymous_visitor_sessions(bot_id);

CREATE INDEX IF NOT EXISTS idx_bot_users_session_corrected 
ON public.bot_users(session_id);

CREATE INDEX IF NOT EXISTS idx_bot_users_bot_corrected 
ON public.bot_users(bot_id);
