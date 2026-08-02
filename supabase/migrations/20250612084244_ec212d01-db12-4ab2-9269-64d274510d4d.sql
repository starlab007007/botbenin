
-- Créer une vue pour les statistiques détaillées des bots par propriétaire
CREATE OR REPLACE VIEW public.detailed_bot_stats AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  b.is_active,
  b.share_enabled,
  b.created_at as bot_created_at,
  COUNT(DISTINCT bu.id) as total_unique_users,
  COUNT(DISTINCT cs.id) as total_sessions,
  COUNT(cm.id) as total_messages,
  COUNT(CASE WHEN bu.last_active >= NOW() - INTERVAL '24 hours' THEN bu.id END) as active_users_24h,
  COUNT(CASE WHEN cs.started_at >= NOW() - INTERVAL '24 hours' THEN cs.id END) as sessions_24h,
  COUNT(CASE WHEN cm.created_at >= NOW() - INTERVAL '24 hours' THEN cm.id END) as messages_24h,
  COUNT(CASE WHEN bu.last_active >= NOW() - INTERVAL '7 days' THEN bu.id END) as active_users_7d,
  MAX(bu.last_active) as last_user_activity,
  MAX(cm.created_at) as last_message_at,
  AVG(cs.total_messages) as avg_messages_per_session,
  COUNT(CASE WHEN cm.message_type = 'user' THEN cm.id END) as user_messages,
  COUNT(CASE WHEN cm.message_type = 'bot' THEN cm.id END) as bot_messages,
  EXTRACT(EPOCH FROM (MAX(cs.ended_at) - MIN(cs.started_at)))/3600 as total_conversation_hours
FROM public.bots b
LEFT JOIN public.bot_users bu ON b.id = bu.bot_id
LEFT JOIN public.chat_sessions cs ON b.id = cs.bot_id
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
GROUP BY b.id, b.name, b.owner_id, b.is_active, b.share_enabled, b.created_at;

-- Créer une vue pour l'historique complet des conversations
CREATE OR REPLACE VIEW public.bot_conversation_history AS
SELECT 
  cm.id as message_id,
  cm.bot_id,
  b.name as bot_name,
  b.owner_id,
  cm.message_content,
  cm.message_type,
  cm.created_at as message_timestamp,
  cm.user_agent,
  cm.ip_address,
  bu.id as bot_user_id,
  bu.user_name,
  bu.user_email,
  bu.session_id,
  bu.created_at as user_first_seen,
  bu.last_active as user_last_active,
  cs.id as session_id_full,
  cs.started_at as session_start,
  cs.ended_at as session_end,
  cs.total_messages as session_message_count,
  cs.session_metadata,
  ROW_NUMBER() OVER (PARTITION BY cs.id ORDER BY cm.created_at) as message_order_in_session
FROM public.chat_messages cm
JOIN public.bots b ON cm.bot_id = b.id
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
LEFT JOIN public.chat_sessions cs ON cm.bot_id = cs.bot_id AND bu.id = cs.bot_user_id
ORDER BY cm.created_at DESC;

-- Créer une vue pour les métriques de performance par bot
CREATE OR REPLACE VIEW public.bot_performance_metrics AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  DATE_TRUNC('day', cm.created_at) as date,
  COUNT(DISTINCT bu.id) as unique_users,
  COUNT(DISTINCT cs.id) as sessions,
  COUNT(cm.id) as total_messages,
  COUNT(CASE WHEN cm.message_type = 'user' THEN cm.id END) as user_messages,
  COUNT(CASE WHEN cm.message_type = 'bot' THEN cm.id END) as bot_responses,
  AVG(cs.total_messages) as avg_messages_per_session,
  COUNT(DISTINCT cm.ip_address) as unique_ips,
  EXTRACT(EPOCH FROM AVG(cs.ended_at - cs.started_at))/60 as avg_session_duration_minutes
FROM public.bots b
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
LEFT JOIN public.chat_sessions cs ON b.id = cs.bot_id
WHERE cm.created_at >= NOW() - INTERVAL '30 days'
GROUP BY b.id, b.name, b.owner_id, DATE_TRUNC('day', cm.created_at)
ORDER BY date DESC;

-- Fonction pour obtenir les statistiques détaillées d'un propriétaire de bot
CREATE OR REPLACE FUNCTION public.get_owner_dashboard_stats(owner_uuid uuid)
RETURNS TABLE (
  total_bots bigint,
  active_bots bigint,
  total_users bigint,
  total_sessions bigint,
  total_messages bigint,
  active_users_24h bigint,
  messages_24h bigint,
  avg_session_duration numeric,
  top_performing_bot_id uuid,
  top_performing_bot_name text,
  last_activity timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  WITH owner_stats AS (
    SELECT 
      COUNT(DISTINCT dbs.bot_id) as total_bots,
      COUNT(DISTINCT CASE WHEN dbs.is_active = true THEN dbs.bot_id END) as active_bots,
      SUM(dbs.total_unique_users) as total_users,
      SUM(dbs.total_sessions) as total_sessions,
      SUM(dbs.total_messages) as total_messages,
      SUM(dbs.active_users_24h) as active_users_24h,
      SUM(dbs.messages_24h) as messages_24h,
      AVG(dbs.avg_messages_per_session) as avg_session_duration,
      MAX(dbs.last_user_activity) as last_activity
    FROM public.detailed_bot_stats dbs
    WHERE dbs.owner_id = owner_uuid
  ),
  top_bot AS (
    SELECT 
      dbs.bot_id,
      dbs.bot_name
    FROM public.detailed_bot_stats dbs
    WHERE dbs.owner_id = owner_uuid
    ORDER BY dbs.total_messages DESC
    LIMIT 1
  )
  SELECT 
    os.total_bots,
    os.active_bots,
    os.total_users,
    os.total_sessions,
    os.total_messages,
    os.active_users_24h,
    os.messages_24h,
    os.avg_session_duration,
    tb.bot_id as top_performing_bot_id,
    tb.bot_name as top_performing_bot_name,
    os.last_activity
  FROM owner_stats os
  CROSS JOIN top_bot tb;
$$;

-- Fonction pour obtenir l'historique détaillé d'un bot spécifique
CREATE OR REPLACE FUNCTION public.get_bot_detailed_history(
  bot_uuid uuid, 
  owner_uuid uuid,
  limit_count integer DEFAULT 100,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  message_id uuid,
  message_content text,
  message_type text,
  message_timestamp timestamp with time zone,
  user_name text,
  user_email text,
  session_id text,
  ip_address text,
  user_agent text,
  session_start timestamp with time zone,
  message_order_in_session bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    bch.message_id,
    bch.message_content,
    bch.message_type,
    bch.message_timestamp,
    bch.user_name,
    bch.user_email,
    bch.session_id,
    bch.ip_address,
    bch.user_agent,
    bch.session_start,
    bch.message_order_in_session
  FROM public.bot_conversation_history bch
  WHERE bch.bot_id = bot_uuid 
    AND bch.owner_id = owner_uuid
  ORDER BY bch.message_timestamp DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Ajouter des politiques RLS pour les tables de base si elles n'existent pas déjà
DO $$
BEGIN
  -- Vérifier et créer les politiques pour bots si elles n'existent pas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bots' AND policyname = 'Owners can manage their bots') THEN
    CREATE POLICY "Owners can manage their bots" 
      ON public.bots 
      FOR ALL 
      USING (
        owner_id IN (
          SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Vérifier et créer les politiques pour chat_messages si elles n'existent pas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Bot owners can view messages') THEN
    CREATE POLICY "Bot owners can view messages" 
      ON public.chat_messages 
      FOR SELECT 
      USING (
        bot_id IN (
          SELECT b.id FROM public.bots b 
          JOIN public.bot_owners bo ON b.owner_id = bo.id 
          WHERE bo.user_id = auth.uid()
        )
      );
  END IF;

  -- Vérifier et créer les politiques pour bot_users si elles n'existent pas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bot_users' AND policyname = 'Bot owners can view users') THEN
    CREATE POLICY "Bot owners can view users" 
      ON public.bot_users 
      FOR SELECT 
      USING (
        bot_id IN (
          SELECT b.id FROM public.bots b 
          JOIN public.bot_owners bo ON b.owner_id = bo.id 
          WHERE bo.user_id = auth.uid()
        )
      );
  END IF;

  -- Vérifier et créer les politiques pour chat_sessions si elles n'existent pas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Bot owners can view sessions') THEN
    CREATE POLICY "Bot owners can view sessions" 
      ON public.chat_sessions 
      FOR SELECT 
      USING (
        bot_id IN (
          SELECT b.id FROM public.bots b 
          JOIN public.bot_owners bo ON b.owner_id = bo.id 
          WHERE bo.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Activer RLS sur les tables de base si ce n'est pas déjà fait
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
;
