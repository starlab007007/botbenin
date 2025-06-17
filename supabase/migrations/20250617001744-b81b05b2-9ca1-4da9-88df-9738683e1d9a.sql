
-- Correction complète du problème des bots inexistants et nettoyage des données orphelines

-- 1. Identifier et nettoyer les liens raccourcis orphelins
WITH orphaned_links AS (
    SELECT sl.id, sl.short_code, sl.bot_id
    FROM public.shortened_links sl
    LEFT JOIN public.bots b ON sl.bot_id = b.id
    WHERE b.id IS NULL
)
UPDATE public.shortened_links 
SET is_active = false, 
    updated_at = NOW(),
    original_url = CONCAT(original_url, ' [BOT_DELETED]')
FROM orphaned_links ol
WHERE shortened_links.id = ol.id;

-- 2. Améliorer la fonction de vérification pour être plus tolérante
CREATE OR REPLACE FUNCTION public.verify_bot_exists_for_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier que le bot existe avant de créer une session anonyme
  IF NOT EXISTS (SELECT 1 FROM public.bots WHERE id = NEW.bot_id) THEN
    -- Log l'erreur mais ne pas bloquer complètement
    INSERT INTO public.logs_session_anomalies(anomaly_type, bot_id, input_token, details) 
    VALUES ('bot_not_found', NEW.bot_id, NEW.session_token, 
            jsonb_build_object('attempted_at', NOW(), 'entry_point', NEW.entry_point));
    
    -- Au lieu de lever une exception, on peut soit :
    -- Option 1: Bloquer (comportement actuel)
    RAISE EXCEPTION 'Bot with ID % does not exist', NEW.bot_id;
    
    -- Option 2: Permettre la création mais marquer comme orpheline (commenté pour l'instant)
    -- NEW.entry_point := 'orphaned_bot';
    -- RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Fonction pour nettoyer automatiquement les données orphelines
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_bot_data()
RETURNS TABLE(
  cleaned_links integer,
  cleaned_sessions integer, 
  cleaned_messages integer,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  links_count integer := 0;
  sessions_count integer := 0;
  messages_count integer := 0;
BEGIN
  -- Nettoyer les liens raccourcis orphelins
  UPDATE public.shortened_links 
  SET is_active = false, updated_at = NOW()
  WHERE bot_id NOT IN (SELECT id FROM public.bots)
    AND is_active = true;
  
  GET DIAGNOSTICS links_count = ROW_COUNT;
  
  -- Nettoyer les sessions anonymes orphelines
  DELETE FROM public.anonymous_visitor_sessions
  WHERE bot_id NOT IN (SELECT id FROM public.bots);
  
  GET DIAGNOSTICS sessions_count = ROW_COUNT;
  
  -- Nettoyer les messages orphelins
  DELETE FROM public.chat_messages
  WHERE bot_id NOT IN (SELECT id FROM public.bots);
  
  GET DIAGNOSTICS messages_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    links_count,
    sessions_count, 
    messages_count,
    jsonb_build_object(
      'cleaned_at', NOW(),
      'links_deactivated', links_count,
      'sessions_removed', sessions_count,
      'messages_removed', messages_count
    );
END;
$$;

-- 4. Améliorer la fonction track_link_click pour gérer les bots inexistants
CREATE OR REPLACE FUNCTION public.track_link_click(
    p_short_code text, 
    p_user_agent text DEFAULT NULL, 
    p_referrer text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  link_id uuid;
  bot_id uuid;
  bot_exists boolean;
  fingerprint_hash text;
  fingerprint_id uuid;
  session_token text;
BEGIN
  -- Récupérer l'ID du lien et du bot
  SELECT sl.id, sl.bot_id INTO link_id, bot_id
  FROM public.shortened_links sl
  WHERE sl.short_code = p_short_code AND sl.is_active = true;
  
  IF link_id IS NULL THEN
    RAISE EXCEPTION 'Lien raccourci non trouvé ou inactif: %', p_short_code;
  END IF;
  
  -- Vérifier si le bot existe toujours
  SELECT EXISTS (SELECT 1 FROM public.bots WHERE id = bot_id) INTO bot_exists;
  
  IF NOT bot_exists THEN
    -- Désactiver le lien et lever une exception informative
    UPDATE public.shortened_links 
    SET is_active = false, updated_at = NOW()
    WHERE id = link_id;
    
    RAISE EXCEPTION 'Le bot associé à ce lien n''existe plus. Lien désactivé automatiquement.';
  END IF;
  
  -- Continuer avec le processus normal si le bot existe
  fingerprint_hash := encode(sha256((COALESCE(p_user_agent, '') || COALESCE(p_short_code, ''))::bytea), 'hex');
  
  fingerprint_id := public.create_or_get_visitor_fingerprint(
    fingerprint_hash,
    jsonb_build_object('user_agent', p_user_agent),
    '{}',
    NULL,
    NULL,
    NULL,
    p_user_agent
  );
  
  session_token := public.create_anonymous_visitor_session(
    fingerprint_id,
    bot_id,
    'shortened_link',
    p_referrer,
    'shortened_link',
    'link',
    p_short_code,
    NULL
  );
  
  -- Enregistrer le clic
  INSERT INTO public.link_clicks (shortened_link_id, user_agent, referrer)
  VALUES (link_id, p_user_agent, p_referrer);
  
  -- Incrémenter le compteur
  UPDATE public.shortened_links 
  SET click_count = click_count + 1, updated_at = NOW()
  WHERE id = link_id;
  
  RETURN bot_id;
END;
$$;

-- 5. Créer une table pour logger les anomalies si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.logs_session_anomalies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_type text NOT NULL,
    bot_id uuid,
    input_token text,
    details jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT NOW()
);

-- 6. Exécuter le nettoyage immédiat
SELECT * FROM public.cleanup_orphaned_bot_data();

-- 7. Diagnostic des liens raccourcis problématiques
SELECT 
    sl.short_code,
    sl.bot_id,
    sl.is_active,
    sl.click_count,
    sl.created_at,
    CASE WHEN b.id IS NULL THEN 'BOT_MISSING' ELSE 'BOT_EXISTS' END as bot_status,
    b.name as bot_name
FROM public.shortened_links sl
LEFT JOIN public.bots b ON sl.bot_id = b.id
WHERE sl.is_active = true
ORDER BY sl.created_at DESC;
