
-- Table pour les liens raccourcis
CREATE TABLE public.shortened_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.bot_owners(id) ON DELETE CASCADE,
  short_code text NOT NULL UNIQUE,
  original_url text NOT NULL,
  click_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Index pour les recherches rapides
CREATE INDEX idx_shortened_links_short_code ON public.shortened_links(short_code);
CREATE INDEX idx_shortened_links_bot_id ON public.shortened_links(bot_id);

-- Table pour le tracking des clics sur les liens
CREATE TABLE public.link_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shortened_link_id uuid NOT NULL REFERENCES public.shortened_links(id) ON DELETE CASCADE,
  clicked_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  referrer text,
  country text,
  city text
);

-- Table améliorée pour les sessions de chat avec tracking complet
CREATE TABLE public.enhanced_chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  bot_user_id uuid NOT NULL REFERENCES public.bot_users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  total_messages integer DEFAULT 0,
  user_messages integer DEFAULT 0,
  bot_messages integer DEFAULT 0,
  session_duration_minutes numeric DEFAULT 0,
  ip_address inet,
  user_agent text,
  referrer_url text,
  entry_point text, -- 'direct', 'shortened_link', 'public_url', etc.
  shortened_link_id uuid REFERENCES public.shortened_links(id),
  is_active boolean DEFAULT true,
  session_metadata jsonb DEFAULT '{}'::jsonb
);

-- Index pour les performances
CREATE INDEX idx_enhanced_chat_sessions_bot_id ON public.enhanced_chat_sessions(bot_id);
CREATE INDEX idx_enhanced_chat_sessions_started_at ON public.enhanced_chat_sessions(started_at);
CREATE INDEX idx_enhanced_chat_sessions_is_active ON public.enhanced_chat_sessions(is_active);

-- Fonction pour générer un code court unique
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Fonction pour créer un lien raccourci pour un bot
CREATE OR REPLACE FUNCTION create_shortened_link(p_bot_id uuid, p_owner_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  short_code text;
  original_url text;
  production_domain text := 'https://ia.bot.bj';
BEGIN
  -- Vérifier si un lien existe déjà pour ce bot
  SELECT sl.short_code INTO short_code
  FROM public.shortened_links sl
  WHERE sl.bot_id = p_bot_id AND sl.is_active = true;
  
  IF short_code IS NOT NULL THEN
    RETURN production_domain || '/s/' || short_code;
  END IF;
  
  -- Générer un code unique
  LOOP
    short_code := generate_short_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shortened_links WHERE short_code = short_code);
  END LOOP;
  
  -- Créer l'URL originale
  SELECT CONCAT(production_domain, '/chat?bot=', p_bot_id) INTO original_url;
  
  -- Insérer le nouveau lien
  INSERT INTO public.shortened_links (bot_id, owner_id, short_code, original_url)
  VALUES (p_bot_id, p_owner_id, short_code, original_url);
  
  RETURN production_domain || '/s/' || short_code;
END;
$$;

-- Vue pour les statistiques complètes des bots
CREATE OR REPLACE VIEW public.complete_bot_analytics AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  b.is_active,
  b.created_at as bot_created_at,
  
  -- Statistiques des utilisateurs
  COUNT(DISTINCT bu.id) as total_unique_users,
  COUNT(DISTINCT CASE WHEN bu.last_active >= NOW() - INTERVAL '24 hours' THEN bu.id END) as active_users_24h,
  COUNT(DISTINCT CASE WHEN bu.last_active >= NOW() - INTERVAL '7 days' THEN bu.id END) as active_users_7d,
  COUNT(DISTINCT CASE WHEN bu.last_active >= NOW() - INTERVAL '30 days' THEN bu.id END) as active_users_30d,
  
  -- Statistiques des sessions
  COUNT(DISTINCT ecs.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN ecs.started_at >= NOW() - INTERVAL '24 hours' THEN ecs.id END) as sessions_24h,
  COUNT(DISTINCT CASE WHEN ecs.is_active = true THEN ecs.id END) as active_sessions,
  
  -- Statistiques des messages
  COALESCE(SUM(ecs.total_messages), 0) as total_messages,
  COALESCE(SUM(ecs.user_messages), 0) as user_messages,
  COALESCE(SUM(ecs.bot_messages), 0) as bot_messages,
  COALESCE(SUM(CASE WHEN ecs.started_at >= NOW() - INTERVAL '24 hours' THEN ecs.total_messages ELSE 0 END), 0) as messages_24h,
  
  -- Métriques de qualité
  CASE 
    WHEN COUNT(DISTINCT ecs.id) > 0 THEN 
      ROUND(COALESCE(SUM(ecs.total_messages), 0)::numeric / COUNT(DISTINCT ecs.id), 2)
    ELSE 0 
  END as avg_messages_per_session,
  
  CASE 
    WHEN COUNT(DISTINCT ecs.id) > 0 THEN 
      ROUND(COALESCE(AVG(ecs.session_duration_minutes), 0), 2)
    ELSE 0 
  END as avg_session_duration_minutes,
  
  -- Statistiques des liens raccourcis
  COUNT(DISTINCT sl.id) as total_short_links,
  COALESCE(SUM(sl.click_count), 0) as total_link_clicks,
  
  -- Activité récente
  MAX(bu.last_active) as last_user_activity,
  MAX(ecs.last_activity) as last_session_activity,
  MAX(cm.created_at) as last_message_at
  
FROM public.bots b
LEFT JOIN public.bot_users bu ON b.id = bu.bot_id
LEFT JOIN public.enhanced_chat_sessions ecs ON b.id = ecs.bot_id
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
LEFT JOIN public.shortened_links sl ON b.id = sl.bot_id AND sl.is_active = true
GROUP BY b.id, b.name, b.owner_id, b.is_active, b.created_at;

-- Fonction pour enregistrer un clic sur un lien raccourci
CREATE OR REPLACE FUNCTION track_link_click(
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
BEGIN
  -- Récupérer l'ID du lien et du bot
  SELECT sl.id, sl.bot_id INTO link_id, bot_id
  FROM public.shortened_links sl
  WHERE sl.short_code = p_short_code AND sl.is_active = true;
  
  IF link_id IS NULL THEN
    RAISE EXCEPTION 'Lien raccourci non trouvé: %', p_short_code;
  END IF;
  
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

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.shortened_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policies pour shortened_links
CREATE POLICY "Les propriétaires peuvent voir leurs liens raccourcis" ON public.shortened_links
  FOR SELECT USING (
    owner_id IN (SELECT id FROM public.bot_owners WHERE user_id = auth.uid())
  );

CREATE POLICY "Les propriétaires peuvent créer des liens raccourcis" ON public.shortened_links
  FOR INSERT WITH CHECK (
    owner_id IN (SELECT id FROM public.bot_owners WHERE user_id = auth.uid())
  );

CREATE POLICY "Les propriétaires peuvent modifier leurs liens raccourcis" ON public.shortened_links
  FOR UPDATE USING (
    owner_id IN (SELECT id FROM public.bot_owners WHERE user_id = auth.uid())
  );

-- Policies pour link_clicks (lecture seule pour les propriétaires)
CREATE POLICY "Les propriétaires peuvent voir les clics de leurs liens" ON public.link_clicks
  FOR SELECT USING (
    shortened_link_id IN (
      SELECT sl.id FROM public.shortened_links sl
      JOIN public.bot_owners bo ON sl.owner_id = bo.id
      WHERE bo.user_id = auth.uid()
    )
  );

-- Policies pour enhanced_chat_sessions
CREATE POLICY "Les propriétaires peuvent voir les sessions de leurs bots" ON public.enhanced_chat_sessions
  FOR SELECT USING (
    bot_id IN (
      SELECT b.id FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE bo.user_id = auth.uid()
    )
  );

CREATE POLICY "Insertion libre pour les sessions de chat" ON public.enhanced_chat_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Mise à jour libre pour les sessions de chat" ON public.enhanced_chat_sessions
  FOR UPDATE USING (true);
