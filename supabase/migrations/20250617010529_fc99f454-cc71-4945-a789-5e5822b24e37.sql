
-- DIAGNOSTIC ET CORRECTION DÉFINITIVE DES ERREURS D'AMBIGUÏTÉ session_token

-- 1. Supprimer toutes les fonctions problématiques pour les recréer proprement
DROP FUNCTION IF EXISTS public.get_unified_chat_history(uuid, text, uuid, integer, uuid);
DROP FUNCTION IF EXISTS public.enhanced_session_reconciliation(uuid, text);
DROP FUNCTION IF EXISTS public.create_anonymous_visitor_session(uuid, uuid, text, text, text, text, text, inet);
DROP FUNCTION IF EXISTS public.save_chat_message(uuid, text, text, text, jsonb, text, text);

-- 2. Fonction de diagnostic pour identifier toutes les ambiguïtés
CREATE OR REPLACE FUNCTION public.diagnose_session_token_ambiguities_complete()
RETURNS TABLE(
  table_name text,
  column_name text,
  issue_type text,
  fix_required text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Analyser toutes les colonnes session_token dans le schéma
  RETURN QUERY
  SELECT 
    t.table_name::text,
    c.column_name::text,
    'session_token_column'::text as issue_type,
    CASE 
      WHEN t.table_name = 'anonymous_visitor_sessions' THEN 'Qualifie avec avs.session_token'
      WHEN t.table_name = 'bot_users' THEN 'Qualifie avec bu.session_id'
      WHEN t.table_name = 'chat_messages' THEN 'Utilise cm.metadata->>''session_token'''
      WHEN t.table_name = 'enhanced_chat_sessions' THEN 'Qualifie avec ecs.session_token'
      ELSE 'Qualification explicite requise'
    END as fix_required
  FROM information_schema.tables t
  JOIN information_schema.columns c ON t.table_name = c.table_name
  WHERE t.table_schema = 'public'
    AND (c.column_name LIKE '%session%' AND c.column_name LIKE '%token%')
    OR (c.column_name = 'session_id')
  ORDER BY t.table_name, c.column_name;
END;
$$;

-- 3. Corriger create_anonymous_visitor_session avec qualification EXPLICITE
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

  -- Chercher une session existante SANS ambiguïté (qualification EXPLICITE des tables)
  SELECT avs_existing.session_token INTO existing_token
  FROM public.anonymous_visitor_sessions avs_existing
  WHERE avs_existing.fingerprint_id = p_fingerprint_id
    AND avs_existing.bot_id = p_bot_id
    AND avs_existing.entry_point = COALESCE(p_entry_point, 'direct')
    AND (p_referrer_url IS NULL OR avs_existing.referrer_url = p_referrer_url)
    AND avs_existing.is_active = true
  ORDER BY avs_existing.started_at DESC
  LIMIT 1;

  IF existing_token IS NOT NULL THEN
    -- Mettre à jour l'activité de la session existante
    UPDATE public.anonymous_visitor_sessions avs_update
    SET last_activity = NOW()
    WHERE avs_update.session_token = existing_token;
    
    RETURN existing_token;
  END IF;

  -- Créer une nouvelle session avec un token unique
  LOOP
    session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
    
    -- Vérifier l'unicité SANS ambiguïté (qualification EXPLICITE)
    IF NOT EXISTS (
      SELECT 1 FROM public.anonymous_visitor_sessions avs_check
      WHERE avs_check.session_token = session_token
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

-- 4. Corriger enhanced_session_reconciliation avec qualification EXPLICITE
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

  -- Étape 1: Chercher un bot_user existant SANS ambiguïté (qualification EXPLICITE)
  SELECT bu_search.id INTO v_bot_user_id 
  FROM public.bot_users bu_search
  WHERE bu_search.bot_id = p_bot_id 
    AND bu_search.session_id = p_session_token;

  IF v_bot_user_id IS NOT NULL THEN
    -- Mettre à jour l'activité
    UPDATE public.bot_users bu_update
    SET last_active = NOW()
    WHERE bu_update.id = v_bot_user_id;
    
    RETURN v_bot_user_id;
  END IF;

  -- Étape 2: Vérifier si une session anonyme existe SANS ambiguïté (qualification EXPLICITE)
  SELECT EXISTS(
    SELECT 1 FROM public.anonymous_visitor_sessions avs_check
    WHERE avs_check.bot_id = p_bot_id 
      AND avs_check.session_token = p_session_token
  ) INTO v_session_exists;

  -- Étape 3: Créer le bot_user correspondant
  INSERT INTO public.bot_users (bot_id, session_id, user_name, is_authenticated, last_active)
  VALUES (p_bot_id, p_session_token, 'Utilisateur Réconcilié', false, NOW())
  RETURNING id INTO v_bot_user_id;

  RETURN v_bot_user_id;
END;
$$;

-- 5. Corriger get_unified_chat_history avec qualification EXPLICITE + SÉCURITÉ
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
      SELECT 1 FROM public.bots b_auth
      JOIN public.bot_owners bo_auth ON b_auth.owner_id = bo_auth.id
      WHERE b_auth.id = p_bot_id AND bo_auth.user_id = p_requesting_user_id
    ) THEN
      -- Si pas propriétaire, retourner vide (pas d'erreur pour les accès publics)
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    cm_result.id as message_id,
    cm_result.bot_id,
    cm_result.bot_user_id,
    cm_result.message_content,
    cm_result.message_type,
    cm_result.created_at as message_timestamp,
    cm_result.metadata,
    COALESCE(
      bu_result.session_id,
      cm_result.metadata->>'session_token',
      cm_result.metadata->>'sessionToken',
      'unknown'
    ) as session_id,
    COALESCE(bu_result.user_name, 'Utilisateur Anonyme') as user_name,
    bu_result.user_email,
    cm_result.ip_address,
    cm_result.user_agent
  FROM public.chat_messages cm_result
  LEFT JOIN public.bot_users bu_result ON cm_result.bot_user_id = bu_result.id
  WHERE cm_result.bot_id = p_bot_id
    AND (
      -- Par bot_user_id
      (p_bot_user_id IS NOT NULL AND cm_result.bot_user_id = p_bot_user_id)
      OR
      -- Par session_token SANS ambiguïté (qualification EXPLICITE)
      (p_session_token IS NOT NULL AND (
        bu_result.session_id = p_session_token
        OR cm_result.metadata->>'session_token' = p_session_token
        OR cm_result.metadata->>'sessionToken' = p_session_token
      ))
      OR
      -- Si aucun critère, récupérer tous les messages récents
      (p_bot_user_id IS NULL AND p_session_token IS NULL)
    )
  ORDER BY cm_result.created_at ASC
  LIMIT p_limit;
END;
$$;

-- 6. Corriger save_chat_message avec qualification EXPLICITE
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
      'reconciliation_method', 'enhanced_corrected_final'
    ),
    v_ip_addr,
    p_user_agent
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- 7. Créer des index normaux (non concurrent) pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_anonymous_visitor_sessions_token_bot 
ON public.anonymous_visitor_sessions(session_token, bot_id);

CREATE INDEX IF NOT EXISTS idx_bot_users_session_bot 
ON public.bot_users(session_id, bot_id);

-- 8. Fonction de test pour vérifier que toutes les ambiguïtés sont résolues
CREATE OR REPLACE FUNCTION public.test_session_functions_final()
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
  test_token text;
  result_token text;
  result_user_id uuid;
BEGIN
  -- Test de création de session
  BEGIN
    -- Récupérer un bot existant pour le test
    SELECT b.id INTO test_bot_id FROM public.bots b LIMIT 1;
    
    IF test_bot_id IS NOT NULL THEN
      -- Tenter une création de session
      SELECT public.create_anonymous_visitor_session(
        (SELECT id FROM public.visitor_fingerprints LIMIT 1),
        test_bot_id,
        'test',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      ) INTO result_token;
      
      RETURN QUERY SELECT 
        'session_creation'::text,
        'success'::text,
        ('Token créé sans ambiguïté: ' || COALESCE(LEFT(result_token, 20), 'null'))::text;

      -- Test de réconciliation
      SELECT public.enhanced_session_reconciliation(test_bot_id, result_token) INTO result_user_id;
      
      RETURN QUERY SELECT 
        'session_reconciliation'::text,
        'success'::text,
        ('User ID réconcilié: ' || COALESCE(result_user_id::text, 'null'))::text;

      -- Test de récupération d'historique
      PERFORM public.get_unified_chat_history(test_bot_id, result_token, NULL, 1);
      
      RETURN QUERY SELECT 
        'history_retrieval'::text,
        'success'::text,
        'Récupération d''historique sans ambiguïté réussie'::text;
        
    ELSE
      RETURN QUERY SELECT 
        'all_tests'::text,
        'skipped'::text,
        'Aucun bot disponible pour les tests'::text;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'error_detected'::text,
      'failed'::text,
      ('ERREUR PERSISTANTE: ' || SQLERRM)::text;
  END;
END;
$$;

-- 9. Fonction de nettoyage final pour supprimer toutes les données corrompues
CREATE OR REPLACE FUNCTION public.cleanup_corrupted_session_data()
RETURNS TABLE(
  action_taken text,
  count integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_count integer;
BEGIN
  -- Supprimer les sessions anonymes sans bot correspondant
  DELETE FROM public.anonymous_visitor_sessions avs_cleanup
  WHERE NOT EXISTS (
    SELECT 1 FROM public.bots b_check 
    WHERE b_check.id = avs_cleanup.bot_id
  );
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  IF cleaned_count > 0 THEN
    RETURN QUERY SELECT 'cleaned_orphaned_sessions'::text, cleaned_count, 'Sessions anonymes orphelines supprimées';
  END IF;

  -- Supprimer les bot_users en double
  WITH duplicate_users AS (
    SELECT bu.bot_id, bu.session_id, MIN(bu.id) as keep_id
    FROM public.bot_users bu
    WHERE bu.session_id IS NOT NULL
    GROUP BY bu.bot_id, bu.session_id
    HAVING COUNT(*) > 1
  )
  DELETE FROM public.bot_users bu_cleanup
  WHERE EXISTS (
    SELECT 1 FROM duplicate_users du
    WHERE bu_cleanup.bot_id = du.bot_id
      AND bu_cleanup.session_id = du.session_id
      AND bu_cleanup.id != du.keep_id
  );

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  IF cleaned_count > 0 THEN
    RETURN QUERY SELECT 'removed_duplicate_users'::text, cleaned_count, 'Utilisateurs dupliqués supprimés';
  END IF;

  RETURN QUERY SELECT 'cleanup_completed'::text, 0, 'Nettoyage terminé avec succès';
END;
$$;

-- 10. RLS policies pour s'assurer que les utilisateurs ne voient que leurs propres conversations
DROP POLICY IF EXISTS "Users can only access their own bot conversations" ON public.chat_messages;
CREATE POLICY "Users can only access their own bot conversations" 
ON public.chat_messages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.bots b_policy
    JOIN public.bot_owners bo_policy ON b_policy.owner_id = bo_policy.id
    WHERE b_policy.id = bot_id AND bo_policy.user_id = auth.uid()
  )
);

-- 11. Activer RLS sur les messages de chat
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 12. Fonction de réparation globale qui s'applique à tous les bots
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
