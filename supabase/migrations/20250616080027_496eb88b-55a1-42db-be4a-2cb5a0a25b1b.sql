
-- Correction complète de toutes les ambiguïtés de session_token dans les fonctions RPC

-- 1. Corriger la fonction get_chat_history pour éliminer l'ambiguïté
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

  -- Retourner l'historique avec qualification explicite des colonnes
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
        -- Stratégie 2: Par session_token avec qualification explicite
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

-- 2. Corriger la fonction create_anonymous_visitor_session
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
BEGIN
  -- Chercher une session existante avec qualification explicite des colonnes
  SELECT avs.session_token INTO existing_token
  FROM public.anonymous_visitor_sessions avs
  WHERE avs.fingerprint_id = p_fingerprint_id
    AND avs.bot_id = p_bot_id
    AND avs.entry_point = COALESCE(p_entry_point, 'direct')
    AND (p_referrer_url IS NULL OR avs.referrer_url = p_referrer_url)
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
  session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
  
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

-- 3. Corriger la fonction get_unified_chat_history (si elle existe)
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
        -- Recherche par session_token avec qualification explicite
        (p_session_token IS NOT NULL AND (
            uch.session_id = p_session_token
            OR uch.enhanced_session_token = p_session_token
            OR uch.metadata->>'session_token' = p_session_token
            OR uch.metadata->>'sessionToken' = p_session_token
        ))
        -- Recherche par bot_user_id
        OR (p_bot_user_id IS NOT NULL AND uch.bot_user_id = p_bot_user_id)
        -- Sans critère spécifique
        OR (p_session_token IS NULL AND p_bot_user_id IS NULL)
      )
  ORDER BY uch.message_timestamp ASC
  LIMIT p_limit;
END;
$$;

-- 4. Créer une fonction de diagnostic pour vérifier la cohérence
CREATE OR REPLACE FUNCTION public.diagnose_session_token_issues()
RETURNS TABLE(
  issue_type text,
  count bigint,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sessions anonymes sans bot_users correspondants
  RETURN QUERY
  SELECT 
    'orphaned_anonymous_sessions'::text,
    COUNT(*)::bigint,
    jsonb_agg(
      jsonb_build_object(
        'bot_id', avs.bot_id,
        'session_token', LEFT(avs.session_token, 20) || '...',
        'started_at', avs.started_at
      )
    )
  FROM public.anonymous_visitor_sessions avs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.bot_users bu 
    WHERE bu.bot_id = avs.bot_id 
    AND bu.session_id = avs.session_token
  );

  -- Messages avec session_token dans metadata mais sans bot_user correspondant
  RETURN QUERY
  SELECT 
    'messages_without_sessions'::text,
    COUNT(*)::bigint,
    jsonb_agg(
      jsonb_build_object(
        'message_id', cm.id,
        'bot_id', cm.bot_id,
        'session_token', LEFT(COALESCE(cm.metadata->>'session_token', 'null'), 20) || '...'
      )
    )
  FROM public.chat_messages cm
  WHERE cm.metadata->>'session_token' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.bot_users bu 
    WHERE bu.bot_id = cm.bot_id 
    AND bu.session_id = cm.metadata->>'session_token'
  );

  -- Sessions dupliquées
  RETURN QUERY
  SELECT 
    'duplicate_bot_user_sessions'::text,
    COUNT(*)::bigint,
    jsonb_agg(
      jsonb_build_object(
        'bot_id', subq.bot_id,
        'session_id', LEFT(subq.session_id, 20) || '...',
        'count', subq.cnt
      )
    )
  FROM (
    SELECT bot_id, session_id, COUNT(*) as cnt
    FROM public.bot_users
    WHERE session_id IS NOT NULL
    GROUP BY bot_id, session_id
    HAVING COUNT(*) > 1
  ) subq;
END;
$$;

-- 5. Fonction de nettoyage et réconciliation
CREATE OR REPLACE FUNCTION public.fix_session_inconsistencies()
RETURNS TABLE(
  action text,
  count integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reconciled_count integer := 0;
  session_record RECORD;
BEGIN
  -- Étape 1: Réconcilier les sessions anonymes orphelines
  FOR session_record IN 
    SELECT DISTINCT avs.bot_id, avs.session_token
    FROM public.anonymous_visitor_sessions avs
    WHERE NOT EXISTS (
      SELECT 1 FROM public.bot_users bu 
      WHERE bu.bot_id = avs.bot_id 
      AND bu.session_id = avs.session_token
    )
  LOOP
    BEGIN
      PERFORM public.enhanced_session_reconciliation(session_record.bot_id, session_record.session_token);
      reconciled_count := reconciled_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Continuer même en cas d'erreur
      NULL;
    END;
  END LOOP;

  RETURN QUERY SELECT 'reconciled_sessions'::text, reconciled_count, 'Sessions anonymes réconciliées avec bot_users';

  -- Étape 2: Nettoyer les sessions dupliquées
  WITH duplicate_sessions AS (
    SELECT bu.bot_id, bu.session_id, MIN(bu.id) as keep_id
    FROM public.bot_users bu
    WHERE bu.session_id IS NOT NULL
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

  GET DIAGNOSTICS reconciled_count = ROW_COUNT;
  RETURN QUERY SELECT 'removed_duplicates'::text, reconciled_count, 'Sessions dupliquées supprimées';
END;
$$;

-- 6. S'assurer que gen_random_bytes est disponible
CREATE EXTENSION IF NOT EXISTS pgcrypto;
;
