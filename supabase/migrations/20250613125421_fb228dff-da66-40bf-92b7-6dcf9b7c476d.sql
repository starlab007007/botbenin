
-- D'abord, supprimer les vues existantes qui pourraient causer des conflits
DROP VIEW IF EXISTS public.detailed_bot_stats CASCADE;
DROP VIEW IF EXISTS public.complete_bot_analytics CASCADE;
DROP VIEW IF EXISTS public.bot_visitor_analytics CASCADE;
DROP VIEW IF EXISTS public.bot_conversation_history CASCADE;

-- Créer une vue pour les statistiques détaillées des bots avec toutes les métriques
CREATE OR REPLACE VIEW public.detailed_bot_stats AS
WITH bot_base AS (
  SELECT 
    b.id as bot_id,
    b.name as bot_name,
    b.owner_id,
    b.is_active,
    b.share_enabled,
    b.created_at as bot_created_at
  FROM public.bots b
),
user_stats AS (
  SELECT 
    bu.bot_id,
    COUNT(DISTINCT bu.id) as total_unique_users,
    COUNT(DISTINCT CASE 
      WHEN bu.last_active >= NOW() - INTERVAL '24 hours' 
      THEN bu.id 
    END) as active_users_24h,
    COUNT(DISTINCT CASE 
      WHEN bu.last_active >= NOW() - INTERVAL '7 days' 
      THEN bu.id 
    END) as active_users_7d,
    MAX(bu.last_active) as last_user_activity
  FROM public.bot_users bu
  GROUP BY bu.bot_id
),
session_stats AS (
  SELECT 
    ecs.bot_id,
    COUNT(*) as total_sessions,
    COUNT(CASE 
      WHEN ecs.started_at >= NOW() - INTERVAL '24 hours' 
      THEN 1 
    END) as sessions_24h,
    COUNT(CASE WHEN ecs.is_active = true THEN 1 END) as active_sessions,
    AVG(ecs.total_messages) as avg_messages_per_session,
    AVG(ecs.session_duration_minutes) as avg_session_duration_minutes
  FROM public.enhanced_chat_sessions ecs
  GROUP BY ecs.bot_id
),
message_stats AS (
  SELECT 
    cm.bot_id,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN cm.message_type = 'user' THEN 1 END) as user_messages,
    COUNT(CASE WHEN cm.message_type = 'bot' THEN 1 END) as bot_messages,
    COUNT(CASE 
      WHEN cm.created_at >= NOW() - INTERVAL '24 hours' 
      THEN 1 
    END) as messages_24h,
    MAX(cm.created_at) as last_message_at
  FROM public.chat_messages cm
  GROUP BY cm.bot_id
),
link_stats AS (
  SELECT 
    sl.bot_id,
    COUNT(*) as total_short_links,
    COALESCE(SUM(sl.click_count), 0) as total_link_clicks
  FROM public.shortened_links sl
  WHERE sl.is_active = true
  GROUP BY sl.bot_id
)
SELECT 
  bb.bot_id,
  bb.bot_name,
  bb.owner_id,
  bb.is_active,
  bb.share_enabled,
  bb.bot_created_at,
  COALESCE(us.total_unique_users, 0) as total_unique_users,
  COALESCE(us.active_users_24h, 0) as active_users_24h,
  COALESCE(us.active_users_7d, 0) as active_users_7d,
  COALESCE(ss.total_sessions, 0) as total_sessions,
  COALESCE(ss.sessions_24h, 0) as sessions_24h,
  COALESCE(ss.active_sessions, 0) as active_sessions,
  COALESCE(ms.total_messages, 0) as total_messages,
  COALESCE(ms.user_messages, 0) as user_messages,
  COALESCE(ms.bot_messages, 0) as bot_messages,
  COALESCE(ms.messages_24h, 0) as messages_24h,
  COALESCE(ss.avg_messages_per_session, 0) as avg_messages_per_session,
  COALESCE(ss.avg_session_duration_minutes, 0) as avg_session_duration_minutes,
  COALESCE(ls.total_short_links, 0) as total_short_links,
  COALESCE(ls.total_link_clicks, 0) as total_link_clicks,
  us.last_user_activity,
  ms.last_message_at
FROM bot_base bb
LEFT JOIN user_stats us ON bb.bot_id = us.bot_id
LEFT JOIN session_stats ss ON bb.bot_id = ss.bot_id
LEFT JOIN message_stats ms ON bb.bot_id = ms.bot_id
LEFT JOIN link_stats ls ON bb.bot_id = ls.bot_id;

-- Créer une vue pour les analytics complètes des bots
CREATE OR REPLACE VIEW public.complete_bot_analytics AS
WITH base_stats AS (
  SELECT * FROM public.detailed_bot_stats
),
engagement_stats AS (
  SELECT 
    dbs.bot_id,
    -- Calculer le taux d'engagement (utilisateurs actifs 7j / utilisateurs totaux)
    CASE 
      WHEN dbs.total_unique_users > 0 
      THEN ROUND((dbs.active_users_7d::numeric / dbs.total_unique_users::numeric) * 100, 1)
      ELSE 0 
    END as engagement_rate_7d,
    -- Utilisateurs actifs 30 jours (approximation)
    COALESCE((
      SELECT COUNT(DISTINCT bu.id)
      FROM public.bot_users bu 
      WHERE bu.bot_id = dbs.bot_id 
        AND bu.last_active >= NOW() - INTERVAL '30 days'
    ), 0) as active_users_30d
  FROM base_stats dbs
)
SELECT 
  bs.*,
  es.engagement_rate_7d,
  es.active_users_30d,
  -- Calculer le taux de réponse
  CASE 
    WHEN bs.user_messages > 0 
    THEN ROUND((bs.bot_messages::numeric / bs.user_messages::numeric) * 100, 1)
    ELSE 0 
  END as response_rate_percent
FROM base_stats bs
LEFT JOIN engagement_stats es ON bs.bot_id = es.bot_id;

-- Créer une vue pour les analytics des visiteurs
CREATE OR REPLACE VIEW public.bot_visitor_analytics AS
WITH visitor_sessions AS (
  SELECT 
    avs.bot_id,
    COUNT(*) as total_sessions,
    COUNT(CASE 
      WHEN avs.started_at >= NOW() - INTERVAL '24 hours' 
      THEN 1 
    END) as sessions_24h,
    COUNT(CASE 
      WHEN avs.started_at >= NOW() - INTERVAL '7 days' 
      THEN 1 
    END) as sessions_7d,
    COUNT(CASE 
      WHEN avs.started_at >= NOW() - INTERVAL '30 days' 
      THEN 1 
    END) as sessions_30d,
    COUNT(DISTINCT avs.fingerprint_id) as unique_visitors,
    COUNT(DISTINCT CASE 
      WHEN avs.started_at >= NOW() - INTERVAL '24 hours' 
      THEN avs.fingerprint_id 
    END) as unique_visitors_24h,
    COUNT(DISTINCT CASE 
      WHEN avs.started_at >= NOW() - INTERVAL '7 days' 
      THEN avs.fingerprint_id 
    END) as unique_visitors_7d,
    COUNT(CASE WHEN avs.converted_to_lead = true THEN 1 END) as converted_sessions,
    AVG(avs.total_interactions) as avg_interactions_per_session,
    AVG(avs.time_spent_seconds) as avg_time_spent_seconds,
    AVG(avs.pages_visited) as avg_pages_per_session,
    COUNT(CASE WHEN avs.entry_point = 'shortened_link' THEN 1 END) as sessions_from_short_links,
    COUNT(CASE WHEN avs.entry_point = 'social_share' THEN 1 END) as sessions_from_social,
    COUNT(CASE WHEN avs.entry_point = 'direct' THEN 1 END) as sessions_direct,
    MAX(avs.last_activity) as last_visitor_activity,
    COUNT(CASE WHEN avs.is_active = true THEN 1 END) as active_sessions
  FROM public.anonymous_visitor_sessions avs
  GROUP BY avs.bot_id
)
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  COALESCE(vs.total_sessions, 0) as total_sessions,
  COALESCE(vs.sessions_24h, 0) as sessions_24h,
  COALESCE(vs.sessions_7d, 0) as sessions_7d,
  COALESCE(vs.sessions_30d, 0) as sessions_30d,
  COALESCE(vs.unique_visitors, 0) as unique_visitors,
  COALESCE(vs.unique_visitors_24h, 0) as unique_visitors_24h,
  COALESCE(vs.unique_visitors_7d, 0) as unique_visitors_7d,
  COALESCE(vs.converted_sessions, 0) as converted_sessions,
  CASE 
    WHEN vs.total_sessions > 0 
    THEN ROUND((vs.converted_sessions::numeric / vs.total_sessions::numeric) * 100, 1)
    ELSE 0 
  END as conversion_rate_percent,
  COALESCE(vs.avg_interactions_per_session, 0) as avg_interactions_per_session,
  COALESCE(vs.avg_time_spent_seconds, 0) as avg_time_spent_seconds,
  COALESCE(vs.avg_pages_per_session, 0) as avg_pages_per_session,
  COALESCE(vs.sessions_from_short_links, 0) as sessions_from_short_links,
  COALESCE(vs.sessions_from_social, 0) as sessions_from_social,
  COALESCE(vs.sessions_direct, 0) as sessions_direct,
  vs.last_visitor_activity,
  COALESCE(vs.active_sessions, 0) as active_sessions
FROM public.bots b
LEFT JOIN visitor_sessions vs ON b.id = vs.bot_id;

-- Créer une vue pour l'historique complet des conversations
CREATE OR REPLACE VIEW public.bot_conversation_history AS
WITH session_info AS (
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
    ecs.ip_address,
    ecs.referrer_url,
    ecs.entry_point
  FROM public.enhanced_chat_sessions ecs
),
message_with_order AS (
  SELECT 
    cm.*,
    ROW_NUMBER() OVER (
      PARTITION BY cm.bot_id, bu.session_id 
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
  bu.user_name,
  bu.user_email,
  bu.session_id,
  si.session_id_full,
  si.session_start,
  si.session_end,
  si.session_message_count,
  si.session_metadata,
  si.user_agent,
  COALESCE(mwo.ip_address, si.ip_address::text) as ip_address,
  mwo.message_order_in_session,
  (SELECT name FROM public.bots WHERE id = mwo.bot_id) as bot_name
FROM message_with_order mwo
LEFT JOIN public.bot_users bu ON mwo.bot_user_id = bu.id
LEFT JOIN session_info si ON si.bot_user_id = mwo.bot_user_id
ORDER BY mwo.created_at DESC;

-- Créer des fonctions pour mettre à jour les sessions automatiquement
CREATE OR REPLACE FUNCTION public.update_session_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
  session_token text;
BEGIN
  -- Chercher une session active pour ce bot_user
  SELECT ecs.id INTO session_id
  FROM public.enhanced_chat_sessions ecs
  WHERE ecs.bot_user_id = NEW.bot_user_id 
    AND ecs.is_active = true
  ORDER BY ecs.started_at DESC
  LIMIT 1;
  
  -- Si aucune session active, créer une nouvelle session
  IF session_id IS NULL THEN
    session_token := 'chat_' || encode(gen_random_bytes(16), 'hex');
    
    INSERT INTO public.enhanced_chat_sessions (
      bot_id, bot_user_id, session_token, ip_address, user_agent, entry_point
    )
    VALUES (
      NEW.bot_id, 
      NEW.bot_user_id, 
      session_token,
      NEW.ip_address::inet,
      NEW.user_agent,
      'chat'
    )
    RETURNING id INTO session_id;
  END IF;
  
  -- Mettre à jour la session
  UPDATE public.enhanced_chat_sessions 
  SET 
    last_activity = NOW(),
    total_messages = total_messages + 1,
    user_messages = user_messages + CASE WHEN NEW.message_type = 'user' THEN 1 ELSE 0 END,
    bot_messages = bot_messages + CASE WHEN NEW.message_type = 'bot' THEN 1 ELSE 0 END,
    session_duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
  WHERE id = session_id;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour mettre à jour les sessions
DROP TRIGGER IF EXISTS update_session_on_message_trigger ON public.chat_messages;
CREATE TRIGGER update_session_on_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_on_message();

-- Créer une fonction pour mettre à jour l'activité des bot_users
CREATE OR REPLACE FUNCTION public.update_bot_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mettre à jour la dernière activité du bot_user
  UPDATE public.bot_users 
  SET last_active = NOW()
  WHERE id = NEW.bot_user_id;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour mettre à jour l'activité des bot_users
DROP TRIGGER IF EXISTS update_bot_user_activity_trigger ON public.chat_messages;
CREATE TRIGGER update_bot_user_activity_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bot_user_activity();
;
