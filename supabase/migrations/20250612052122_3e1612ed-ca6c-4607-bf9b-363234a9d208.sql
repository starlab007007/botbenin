
-- Amélioration du système de tracking des visiteurs anonymes et liens raccourcis
-- Ajout de tables pour le tracking avancé des visiteurs

-- Table pour le fingerprinting des navigateurs
CREATE TABLE public.visitor_fingerprints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_hash text NOT NULL UNIQUE,
  browser_info jsonb NOT NULL DEFAULT '{}',
  screen_info jsonb NOT NULL DEFAULT '{}',
  timezone text,
  language text,
  platform text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_seen timestamp with time zone DEFAULT now()
);

-- Table pour les sessions de visiteurs anonymes
CREATE TABLE public.anonymous_visitor_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_id uuid REFERENCES public.visitor_fingerprints(id) ON DELETE CASCADE,
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  entry_point text, -- 'direct', 'shortened_link', 'social_share', etc.
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  geolocation jsonb,
  ip_address inet,
  started_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  total_interactions integer DEFAULT 0,
  pages_visited integer DEFAULT 1,
  time_spent_seconds integer DEFAULT 0,
  converted_to_lead boolean DEFAULT false,
  lead_info jsonb,
  is_active boolean DEFAULT true
);

-- Table pour collecter progressivement les informations des visiteurs
CREATE TABLE public.visitor_progressive_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_session_id uuid NOT NULL REFERENCES public.anonymous_visitor_sessions(id) ON DELETE CASCADE,
  data_type text NOT NULL, -- 'email', 'name', 'phone', 'company', etc.
  data_value text NOT NULL,
  collection_method text NOT NULL, -- 'form', 'chat', 'inference', etc.
  confidence_score numeric DEFAULT 1.0,
  verified boolean DEFAULT false,
  collected_at timestamp with time zone DEFAULT now()
);

-- Table pour les événements de tracking détaillés
CREATE TABLE public.visitor_tracking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_session_id uuid NOT NULL REFERENCES public.anonymous_visitor_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'page_view', 'click', 'scroll', 'message_sent', 'file_download', etc.
  event_data jsonb NOT NULL DEFAULT '{}',
  page_url text,
  element_id text,
  element_class text,
  timestamp timestamp with time zone DEFAULT now()
);

-- Table pour les campagnes de partage social
CREATE TABLE public.social_sharing_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.bot_owners(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  campaign_description text,
  target_platforms jsonb NOT NULL DEFAULT '[]', -- ['whatsapp', 'telegram', 'facebook', etc.]
  custom_message text,
  tracking_parameters jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_visitor_fingerprints_hash ON public.visitor_fingerprints(fingerprint_hash);
CREATE INDEX idx_anonymous_visitor_sessions_bot_id ON public.anonymous_visitor_sessions(bot_id);
CREATE INDEX idx_anonymous_visitor_sessions_fingerprint ON public.anonymous_visitor_sessions(fingerprint_id);
CREATE INDEX idx_anonymous_visitor_sessions_started_at ON public.anonymous_visitor_sessions(started_at);
CREATE INDEX idx_visitor_progressive_data_session ON public.visitor_progressive_data(visitor_session_id);
CREATE INDEX idx_visitor_tracking_events_session ON public.visitor_tracking_events(visitor_session_id);
CREATE INDEX idx_visitor_tracking_events_timestamp ON public.visitor_tracking_events(timestamp);

-- Fonction pour créer ou récupérer un fingerprint de visiteur
CREATE OR REPLACE FUNCTION public.create_or_get_visitor_fingerprint(
  p_fingerprint_hash text,
  p_browser_info jsonb DEFAULT '{}',
  p_screen_info jsonb DEFAULT '{}',
  p_timezone text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fingerprint_id uuid;
BEGIN
  -- Chercher un fingerprint existant
  SELECT id INTO fingerprint_id
  FROM public.visitor_fingerprints
  WHERE fingerprint_hash = p_fingerprint_hash;
  
  -- Si pas trouvé, créer un nouveau fingerprint
  IF fingerprint_id IS NULL THEN
    INSERT INTO public.visitor_fingerprints (
      fingerprint_hash, browser_info, screen_info, timezone, 
      language, platform, user_agent
    )
    VALUES (
      p_fingerprint_hash, p_browser_info, p_screen_info, p_timezone,
      p_language, p_platform, p_user_agent
    )
    RETURNING id INTO fingerprint_id;
  ELSE
    -- Mettre à jour les informations
    UPDATE public.visitor_fingerprints 
    SET 
      browser_info = COALESCE(p_browser_info, browser_info),
      screen_info = COALESCE(p_screen_info, screen_info),
      timezone = COALESCE(p_timezone, timezone),
      language = COALESCE(p_language, language),
      platform = COALESCE(p_platform, platform),
      user_agent = COALESCE(p_user_agent, user_agent),
      last_seen = NOW(),
      updated_at = NOW()
    WHERE id = fingerprint_id;
  END IF;
  
  RETURN fingerprint_id;
END;
$$;

-- Fonction pour créer une session de visiteur anonyme
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
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
  session_token text;
BEGIN
  -- Générer un token de session unique
  session_token := 'anon_' || encode(gen_random_bytes(16), 'hex');
  
  -- Créer la session
  INSERT INTO public.anonymous_visitor_sessions (
    fingerprint_id, bot_id, session_token, entry_point,
    referrer_url, utm_source, utm_medium, utm_campaign, ip_address
  )
  VALUES (
    p_fingerprint_id, p_bot_id, session_token, p_entry_point,
    p_referrer_url, p_utm_source, p_utm_medium, p_utm_campaign, p_ip_address
  )
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Fonction pour enregistrer un événement de tracking
CREATE OR REPLACE FUNCTION public.track_visitor_event(
  p_session_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}',
  p_page_url text DEFAULT NULL,
  p_element_id text DEFAULT NULL,
  p_element_class text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id uuid;
BEGIN
  -- Enregistrer l'événement
  INSERT INTO public.visitor_tracking_events (
    visitor_session_id, event_type, event_data, page_url, element_id, element_class
  )
  VALUES (
    p_session_id, p_event_type, p_event_data, p_page_url, p_element_id, p_element_class
  )
  RETURNING id INTO event_id;
  
  -- Mettre à jour l'activité de la session
  UPDATE public.anonymous_visitor_sessions 
  SET 
    last_activity = NOW(),
    total_interactions = total_interactions + 1
  WHERE id = p_session_id;
  
  RETURN event_id;
END;
$$;

-- Fonction pour collecter progressivement les données des visiteurs
CREATE OR REPLACE FUNCTION public.collect_visitor_data(
  p_session_id uuid,
  p_data_type text,
  p_data_value text,
  p_collection_method text DEFAULT 'chat',
  p_confidence_score numeric DEFAULT 1.0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  data_id uuid;
BEGIN
  -- Vérifier si cette donnée existe déjà pour cette session
  SELECT id INTO data_id
  FROM public.visitor_progressive_data
  WHERE visitor_session_id = p_session_id 
    AND data_type = p_data_type;
  
  IF data_id IS NULL THEN
    -- Créer une nouvelle entrée
    INSERT INTO public.visitor_progressive_data (
      visitor_session_id, data_type, data_value, collection_method, confidence_score
    )
    VALUES (
      p_session_id, p_data_type, p_data_value, p_collection_method, p_confidence_score
    )
    RETURNING id INTO data_id;
  ELSE
    -- Mettre à jour avec la meilleure information
    UPDATE public.visitor_progressive_data 
    SET 
      data_value = p_data_value,
      collection_method = p_collection_method,
      confidence_score = GREATEST(confidence_score, p_confidence_score),
      collected_at = NOW()
    WHERE id = data_id;
  END IF;
  
  RETURN data_id;
END;
$$;

-- Vue pour les statistiques complètes des visiteurs par bot
CREATE OR REPLACE VIEW public.bot_visitor_analytics AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  
  -- Statistiques des sessions
  COUNT(DISTINCT avs.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN avs.started_at >= NOW() - INTERVAL '24 hours' THEN avs.id END) as sessions_24h,
  COUNT(DISTINCT CASE WHEN avs.started_at >= NOW() - INTERVAL '7 days' THEN avs.id END) as sessions_7d,
  COUNT(DISTINCT CASE WHEN avs.started_at >= NOW() - INTERVAL '30 days' THEN avs.id END) as sessions_30d,
  
  -- Statistiques des visiteurs uniques
  COUNT(DISTINCT avs.fingerprint_id) as unique_visitors,
  COUNT(DISTINCT CASE WHEN avs.started_at >= NOW() - INTERVAL '24 hours' THEN avs.fingerprint_id END) as unique_visitors_24h,
  COUNT(DISTINCT CASE WHEN avs.started_at >= NOW() - INTERVAL '7 days' THEN avs.fingerprint_id END) as unique_visitors_7d,
  
  -- Statistiques de conversion
  COUNT(DISTINCT CASE WHEN avs.converted_to_lead = true THEN avs.id END) as converted_sessions,
  CASE 
    WHEN COUNT(DISTINCT avs.id) > 0 THEN 
      ROUND((COUNT(DISTINCT CASE WHEN avs.converted_to_lead = true THEN avs.id END)::numeric / COUNT(DISTINCT avs.id) * 100), 2)
    ELSE 0 
  END as conversion_rate_percent,
  
  -- Statistiques d'engagement
  COALESCE(AVG(avs.total_interactions), 0) as avg_interactions_per_session,
  COALESCE(AVG(avs.time_spent_seconds), 0) as avg_time_spent_seconds,
  COALESCE(AVG(avs.pages_visited), 0) as avg_pages_per_session,
  
  -- Sources de trafic
  COUNT(DISTINCT CASE WHEN avs.entry_point = 'shortened_link' THEN avs.id END) as sessions_from_short_links,
  COUNT(DISTINCT CASE WHEN avs.entry_point = 'social_share' THEN avs.id END) as sessions_from_social,
  COUNT(DISTINCT CASE WHEN avs.entry_point = 'direct' THEN avs.id END) as sessions_direct,
  
  -- Activité récente
  MAX(avs.last_activity) as last_visitor_activity,
  COUNT(DISTINCT CASE WHEN avs.is_active = true THEN avs.id END) as active_sessions
  
FROM public.bots b
LEFT JOIN public.anonymous_visitor_sessions avs ON b.id = avs.bot_id
GROUP BY b.id, b.name, b.owner_id;

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.visitor_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_progressive_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_sharing_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies pour l'accès aux données (les propriétaires de bots peuvent voir leurs données)
CREATE POLICY "Owners can view visitor sessions of their bots" ON public.anonymous_visitor_sessions
  FOR SELECT USING (
    bot_id IN (
      SELECT b.id FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE bo.user_id = auth.uid()
    )
  );

CREATE POLICY "Public insert for visitor sessions" ON public.anonymous_visitor_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update for visitor sessions" ON public.anonymous_visitor_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Owners can view progressive data of their bot visitors" ON public.visitor_progressive_data
  FOR SELECT USING (
    visitor_session_id IN (
      SELECT avs.id FROM public.anonymous_visitor_sessions avs
      JOIN public.bots b ON avs.bot_id = b.id
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE bo.user_id = auth.uid()
    )
  );

CREATE POLICY "Public insert for visitor data collection" ON public.visitor_progressive_data
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can view tracking events of their bot visitors" ON public.visitor_tracking_events
  FOR SELECT USING (
    visitor_session_id IN (
      SELECT avs.id FROM public.anonymous_visitor_sessions avs
      JOIN public.bots b ON avs.bot_id = b.id
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE bo.user_id = auth.uid()
    )
  );

CREATE POLICY "Public insert for tracking events" ON public.visitor_tracking_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can manage their social campaigns" ON public.social_sharing_campaigns
  FOR ALL USING (
    owner_id IN (SELECT id FROM public.bot_owners WHERE user_id = auth.uid())
  );

-- Mettre à jour la fonction track_link_click pour inclure le tracking des visiteurs
CREATE OR REPLACE FUNCTION public.track_link_click(
  p_short_code text,
  p_ip_address inet DEFAULT NULL,
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
  session_id uuid;
BEGIN
  -- Récupérer l'ID du lien et du bot
  SELECT sl.id, sl.bot_id INTO link_id, bot_id
  FROM public.shortened_links sl
  WHERE sl.short_code = p_short_code AND sl.is_active = true;
  
  IF link_id IS NULL THEN
    RAISE EXCEPTION 'Lien raccourci non trouvé: %', p_short_code;
  END IF;
  
  -- Générer un hash de fingerprint basique (on l'améliorera côté client)
  fingerprint_hash := encode(sha256((COALESCE(p_user_agent, '') || COALESCE(p_ip_address::text, ''))::bytea), 'hex');
  
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
  session_id := public.create_anonymous_visitor_session(
    fingerprint_id,
    bot_id,
    'shortened_link',
    p_referrer,
    'shortened_link',
    'link',
    p_short_code,
    p_ip_address
  );
  
  -- Enregistrer le clic
  INSERT INTO public.link_clicks (shortened_link_id, ip_address, user_agent, referrer)
  VALUES (link_id, p_ip_address, p_user_agent, p_referrer);
  
  -- Incrémenter le compteur
  UPDATE public.shortened_links 
  SET click_count = click_count + 1, updated_at = NOW()
  WHERE id = link_id;
  
  RETURN bot_id;
END;
$$;
;
