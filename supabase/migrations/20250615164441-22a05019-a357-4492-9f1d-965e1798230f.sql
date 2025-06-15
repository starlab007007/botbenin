
-- Plan d'amélioration backend - Phase 1: Corrections critiques et optimisations (Version corrigée)

-- 1. Corriger les violations de clés étrangères pour anonymous_visitor_sessions
-- Ajouter une vérification avant insertion
CREATE OR REPLACE FUNCTION public.verify_bot_exists_for_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier que le bot existe avant de créer une session anonyme
  IF NOT EXISTS (SELECT 1 FROM public.bots WHERE id = NEW.bot_id) THEN
    RAISE EXCEPTION 'Bot with ID % does not exist', NEW.bot_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verify_bot_exists_trigger ON public.anonymous_visitor_sessions;
CREATE TRIGGER verify_bot_exists_trigger
  BEFORE INSERT ON public.anonymous_visitor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_bot_exists_for_session();

-- 2. Améliorer la fonction de réconciliation des sessions pour être plus robuste
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

-- 3. Améliorer la fonction save_chat_message pour utiliser la réconciliation améliorée
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
  -- Validation des paramètres
  IF p_bot_id IS NULL THEN
    RAISE EXCEPTION 'Bot ID cannot be null';
  END IF;

  -- Gestion robuste du token
  IF p_session_token IS NULL OR TRIM(p_session_token) = '' THEN
    v_final_token := 'recovery_' || encode(gen_random_bytes(12), 'hex');
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token) 
    VALUES ('null_token_recovery', p_bot_id, v_final_token);
  ELSE
    v_final_token := p_session_token;
  END IF;

  -- Conversion IP sécurisée
  BEGIN
    v_ip_addr := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip_addr := NULL;
  END;

  -- Utiliser la réconciliation améliorée
  v_bot_user_id := public.enhanced_session_reconciliation(p_bot_id, v_final_token);

  IF v_bot_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to reconcile session for token: %', v_final_token;
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
      'session_token', v_final_token,
      'reconciled_at', NOW()::text,
      'original_token', p_session_token,
      'reconciliation_method', 'enhanced'
    ),
    v_ip_addr,
    p_user_agent
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- 4. Optimiser get_chat_history pour une récupération plus fiable
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
  -- Vérifier l'autorisation
  SELECT EXISTS (
      SELECT 1
      FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_authorized;

  IF NOT is_authorized THEN
      RAISE EXCEPTION 'Permission denied to access messages for this bot.';
  END IF;

  -- Récupération optimisée avec stratégies multiples
  RETURN QUERY
  SELECT
      jsonb_build_object(
          'id', cm.id,
          'message_id', cm.id,
          'bot_id', cm.bot_id,
          'bot_user_id', cm.bot_user_id,
          'created_at', cm.created_at,
          'message_timestamp', cm.created_at,
          'message_content', cm.message_content,
          'message_type', cm.message_type,
          'ip_address', cm.ip_address,
          'user_agent', cm.user_agent,
          'metadata', cm.metadata,
          'session_id', COALESCE(
            bu.session_id, 
            cm.metadata->>'session_token',
            cm.metadata->>'sessionToken',
            'unknown'
          ),
          'user_name', COALESCE(bu.user_name, 'Utilisateur Anonyme'),
          'user_email', bu.user_email,
          'user_first_seen', bu.created_at,
          'user_last_active', bu.last_active,
          'bot_name', b.name,
          'owner_id', b.owner_id
      )
  FROM
      public.chat_messages cm
  LEFT JOIN
      public.bot_users bu ON cm.bot_user_id = bu.id
  LEFT JOIN
      public.bots b ON cm.bot_id = b.id
  WHERE
      cm.bot_id = p_bot_id
      AND (
        -- Stratégie 1: Par bot_user_id direct
        (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id)
        OR
        -- Stratégie 2: Par session_token avec multiples variantes
        (p_session_token IS NOT NULL AND (
            bu.session_id = p_session_token
            OR cm.metadata->>'session_token' = p_session_token
            OR cm.metadata->>'sessionToken' = p_session_token
            -- Recherche partielle pour les tokens tronqués
            OR (LENGTH(p_session_token) > 8 AND (
                bu.session_id LIKE '%' || RIGHT(p_session_token, 8) || '%'
                OR cm.metadata::text LIKE '%' || RIGHT(p_session_token, 8) || '%'
            ))
        ))
        -- Si aucun critère spécifique, récupérer les messages récents
        OR (p_bot_user_id IS NULL AND p_session_token IS NULL)
      )
  ORDER BY cm.created_at ASC;
END;
$$;

-- 5. Créer une fonction de nettoyage pour consolider les données
CREATE OR REPLACE FUNCTION public.cleanup_and_consolidate_chat_data(
    p_bot_id uuid DEFAULT NULL
)
RETURNS TABLE(
    cleaned_sessions integer,
    reconciled_users integer,
    orphaned_messages integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_count integer := 0;
  reconciled_count integer := 0;
  orphaned_count integer := 0;
  session_record RECORD;
BEGIN
  -- Étape 1: Réconcilier les sessions orphelines
  FOR session_record IN 
    SELECT DISTINCT avs.bot_id, avs.session_token
    FROM public.anonymous_visitor_sessions avs
    WHERE (p_bot_id IS NULL OR avs.bot_id = p_bot_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.bot_users bu 
        WHERE bu.bot_id = avs.bot_id 
        AND bu.session_id = avs.session_token
      )
  LOOP
    BEGIN
      PERFORM public.enhanced_session_reconciliation(session_record.bot_id, session_record.session_token);
      reconciled_count := reconciled_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log l'erreur mais continuer
      INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token) 
      VALUES ('reconciliation_failed', session_record.bot_id, session_record.session_token);
    END;
  END LOOP;

  -- Étape 2: Nettoyer les sessions dupliquées
  WITH duplicate_sessions AS (
    SELECT bu.bot_id, bu.session_id, MIN(bu.id) as keep_id
    FROM public.bot_users bu
    WHERE (p_bot_id IS NULL OR bu.bot_id = p_bot_id)
      AND bu.session_id IS NOT NULL
    GROUP BY bu.bot_id, bu.session_id
    HAVING COUNT(*) > 1
  )
  UPDATE public.chat_messages cm
  SET bot_user_id = ds.keep_id
  FROM duplicate_sessions ds, public.bot_users bu_old
  WHERE cm.bot_user_id = bu_old.id
    AND bu_old.bot_id = ds.bot_id
    AND bu_old.session_id = ds.session_id
    AND bu_old.id != ds.keep_id;

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;

  -- Étape 3: Supprimer les bot_users dupliqués
  WITH duplicate_sessions AS (
    SELECT bu.bot_id, bu.session_id, MIN(bu.id) as keep_id
    FROM public.bot_users bu
    WHERE (p_bot_id IS NULL OR bu.bot_id = p_bot_id)
      AND bu.session_id IS NOT NULL
    GROUP BY bu.bot_id, bu.session_id
    HAVING COUNT(*) > 1
  )
  DELETE FROM public.bot_users bu
  WHERE EXISTS (
    SELECT 1 FROM duplicate_sessions ds
    WHERE bu.bot_id = ds.bot_id
      AND bu.session_id = ds.session_id
      AND bu.id != ds.keep_id
  );

  -- Étape 4: Identifier les messages orphelins
  SELECT COUNT(*) INTO orphaned_count
  FROM public.chat_messages cm
  WHERE (p_bot_id IS NULL OR cm.bot_id = p_bot_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.bot_users bu
      WHERE bu.id = cm.bot_user_id
    );

  RETURN QUERY SELECT cleaned_count, reconciled_count, orphaned_count;
END;
$$;

-- 6. Créer des index pour améliorer les performances (sans CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_chat_messages_bot_session_lookup 
ON public.chat_messages (bot_id, (metadata->>'session_token'));

CREATE INDEX IF NOT EXISTS idx_bot_users_bot_session 
ON public.bot_users (bot_id, session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_bot_token 
ON public.anonymous_visitor_sessions (bot_id, session_token);

-- 7. Améliorer la vue bot_conversation_history pour plus de fiabilité
DROP VIEW IF EXISTS public.bot_conversation_history;
CREATE VIEW public.bot_conversation_history AS
WITH enhanced_sessions AS (
  SELECT 
    ecs.id as session_id_full,
    ecs.bot_id,
    ecs.bot_user_id,
    ecs.started_at as session_start,
    ecs.ended_at as session_end,
    ecs.total_messages as session_message_count,
    ecs.session_metadata,
    ecs.session_token,
    ecs.user_agent,
    COALESCE(ecs.ip_address::text, '') as ip_address,
    ecs.referrer_url,
    ecs.entry_point
  FROM public.enhanced_chat_sessions ecs
),
message_with_order AS (
  SELECT 
    cm.*,
    ROW_NUMBER() OVER (
      PARTITION BY cm.bot_id, COALESCE(bu.session_id, cm.metadata->>'session_token')
      ORDER BY cm.created_at
    ) as message_order_in_session
  FROM public.chat_messages cm
  LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
)
SELECT 
  mwo.id as message_id,
  mwo.bot_id,
  (SELECT owner_id FROM public.bots WHERE id = mwo.bot_id) as owner_id,
  mwo.message_content,
  mwo.message_type,
  mwo.created_at as message_timestamp,
  mwo.bot_user_id,
  bu.created_at as user_first_seen,
  bu.last_active as user_last_active,
  COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
  bu.user_email,
  COALESCE(bu.session_id, mwo.metadata->>'session_token', 'unknown') as session_id,
  es.session_id_full,
  es.session_start,
  es.session_end,
  es.session_message_count,
  es.session_metadata,
  es.user_agent,
  COALESCE(mwo.ip_address, es.ip_address) as ip_address,
  mwo.message_order_in_session,
  (SELECT name FROM public.bots WHERE id = mwo.bot_id) as bot_name
FROM message_with_order mwo
LEFT JOIN public.bot_users bu ON mwo.bot_user_id = bu.id
LEFT JOIN enhanced_sessions es ON es.bot_user_id = mwo.bot_user_id
ORDER BY mwo.created_at DESC;
