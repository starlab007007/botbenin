
-- Corriger l'ambiguïté de session_token dans create_anonymous_visitor_session
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
  -- Chercher une session existante avec qualification explicite de la table
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

-- Également corriger la fonction track_link_click qui pourrait avoir le même problème
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
  fingerprint_hash text;
  fingerprint_id uuid;
  session_token text;
BEGIN
  -- Récupérer l'ID du lien et du bot
  SELECT sl.id, sl.bot_id INTO link_id, bot_id
  FROM public.shortened_links sl
  WHERE sl.short_code = p_short_code AND sl.is_active = true;
  
  IF link_id IS NULL THEN
    RAISE EXCEPTION 'Lien raccourci non trouvé: %', p_short_code;
  END IF;
  
  -- Générer un hash de fingerprint basique
  fingerprint_hash := encode(sha256((COALESCE(p_user_agent, '') || COALESCE(p_short_code, ''))::bytea), 'hex');
  
  -- Créer ou récupérer le fingerprint
  fingerprint_id := public.create_or_get_visitor_fingerprint(
    fingerprint_hash,
    jsonb_build_object('user_agent', p_user_agent),
    '{}',
    NULL,
    NULL,
    NULL,
    p_user_agent
  );
  
  -- Créer une session de visiteur
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
