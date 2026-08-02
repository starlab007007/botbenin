
-- 1. Créer une fonction spécialisée pour récupérer l'historique complet d'un bot avec validation de propriété
CREATE OR REPLACE FUNCTION public.get_bot_owner_history(
    p_bot_id uuid,
    p_session_token text DEFAULT NULL,
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    message_id uuid,
    message_content text,
    message_type text,
    message_timestamp timestamp with time zone,
    user_name text,
    user_email text,
    session_id text,
    ip_address text,
    user_agent text,
    metadata jsonb,
    bot_name text,
    owner_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_owner boolean;
BEGIN
  -- Vérifier que l'utilisateur connecté est propriétaire du bot
  SELECT EXISTS (
      SELECT 1
      FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_owner;

  IF NOT is_owner THEN
      RAISE EXCEPTION 'Accès refusé: vous n''êtes pas propriétaire de ce bot.';
  END IF;

  -- Retourner l'historique complet avec toutes les informations
  RETURN QUERY
  SELECT
      cm.id as message_id,
      cm.message_content,
      cm.message_type,
      cm.created_at as message_timestamp,
      COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
      bu.user_email,
      COALESCE(
        bu.session_id, 
        cm.metadata->>'session_token',
        cm.metadata->>'sessionToken',
        'session_inconnue'
      ) as session_id,
      cm.ip_address,
      cm.user_agent,
      cm.metadata,
      b.name as bot_name,
      b.owner_id
  FROM
      public.chat_messages cm
  LEFT JOIN
      public.bot_users bu ON cm.bot_user_id = bu.id
  LEFT JOIN
      public.bots b ON cm.bot_id = b.id
  WHERE
      cm.bot_id = p_bot_id
      AND (
        p_session_token IS NULL 
        OR bu.session_id = p_session_token
        OR cm.metadata->>'session_token' = p_session_token
        OR cm.metadata->>'sessionToken' = p_session_token
      )
  ORDER BY cm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 2. Créer une fonction pour obtenir les statistiques détaillées d'un bot spécifique
CREATE OR REPLACE FUNCTION public.get_bot_owner_stats(p_bot_id uuid)
RETURNS TABLE(
    bot_id uuid,
    bot_name text,
    total_messages bigint,
    total_users bigint,
    total_sessions bigint,
    messages_24h bigint,
    active_users_24h bigint,
    avg_messages_per_session numeric,
    last_activity timestamp with time zone,
    creation_date timestamp with time zone,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_owner boolean;
BEGIN
  -- Vérifier la propriété du bot
  SELECT EXISTS (
      SELECT 1
      FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO is_owner;

  IF NOT is_owner THEN
      RAISE EXCEPTION 'Accès refusé: vous n''êtes pas propriétaire de ce bot.';
  END IF;

  -- Retourner les statistiques détaillées
  RETURN QUERY
  SELECT
      b.id as bot_id,
      b.name as bot_name,
      COALESCE(COUNT(DISTINCT cm.id), 0)::bigint as total_messages,
      COALESCE(COUNT(DISTINCT bu.id), 0)::bigint as total_users,
      COALESCE(COUNT(DISTINCT bu.session_id), 0)::bigint as total_sessions,
      COALESCE(COUNT(DISTINCT CASE WHEN cm.created_at > NOW() - INTERVAL '24 hours' THEN cm.id END), 0)::bigint as messages_24h,
      COALESCE(COUNT(DISTINCT CASE WHEN bu.last_active > NOW() - INTERVAL '24 hours' THEN bu.id END), 0)::bigint as active_users_24h,
      CASE 
        WHEN COUNT(DISTINCT bu.session_id) > 0 
        THEN ROUND(COUNT(DISTINCT cm.id)::numeric / COUNT(DISTINCT bu.session_id), 2)
        ELSE 0
      END as avg_messages_per_session,
      MAX(COALESCE(cm.created_at, bu.last_active)) as last_activity,
      b.created_at as creation_date,
      b.is_active
  FROM
      public.bots b
  LEFT JOIN
      public.chat_messages cm ON b.id = cm.bot_id
  LEFT JOIN
      public.bot_users bu ON cm.bot_user_id = bu.id
  WHERE
      b.id = p_bot_id
  GROUP BY
      b.id, b.name, b.created_at, b.is_active;
END;
$$;

-- 3. Créer une vue pour les conversations regroupées par session
CREATE OR REPLACE VIEW public.bot_owner_conversations AS
SELECT
    b.id as bot_id,
    b.name as bot_name,
    b.owner_id,
    COALESCE(bu.session_id, cm.metadata->>'session_token', 'session_' || bu.id::text) as session_id,
    bu.id as bot_user_id,
    COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
    bu.user_email,
    COUNT(cm.id) as message_count,
    MIN(cm.created_at) as conversation_start,
    MAX(cm.created_at) as last_message_at,
    MAX(CASE WHEN cm.message_type = 'user' THEN cm.message_content END) as last_user_message,
    MAX(CASE WHEN cm.message_type = 'bot' THEN cm.message_content END) as last_bot_message,
    bu.created_at as user_first_seen,
    bu.last_active as user_last_active,
    CASE WHEN bu.last_active > NOW() - INTERVAL '24 hours' THEN true ELSE false END as is_active_today
FROM
    public.bots b
LEFT JOIN
    public.chat_messages cm ON b.id = cm.bot_id
LEFT JOIN
    public.bot_users bu ON cm.bot_user_id = bu.id
WHERE
    bu.id IS NOT NULL
GROUP BY
    b.id, b.name, b.owner_id, bu.session_id, bu.id, bu.user_name, bu.user_email, bu.created_at, bu.last_active, cm.metadata->>'session_token';

-- 4. Créer une fonction pour obtenir toutes les conversations d'un propriétaire
CREATE OR REPLACE FUNCTION public.get_owner_all_conversations(
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0,
    p_bot_id uuid DEFAULT NULL
)
RETURNS SETOF public.bot_owner_conversations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_uuid uuid;
BEGIN
  -- Récupérer l'ID du propriétaire
  SELECT bo.id INTO owner_uuid
  FROM public.bot_owners bo
  WHERE bo.user_id = auth.uid();

  IF owner_uuid IS NULL THEN
      RAISE EXCEPTION 'Aucun compte propriétaire trouvé pour cet utilisateur.';
  END IF;

  -- Retourner les conversations filtrées
  RETURN QUERY
  SELECT boc.*
  FROM public.bot_owner_conversations boc
  WHERE 
      boc.owner_id = owner_uuid
      AND (p_bot_id IS NULL OR boc.bot_id = p_bot_id)
  ORDER BY boc.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 5. Créer une fonction pour obtenir les statistiques globales d'un propriétaire
CREATE OR REPLACE FUNCTION public.get_owner_global_stats()
RETURNS TABLE(
    total_bots bigint,
    active_bots bigint,
    total_messages bigint,
    total_users bigint,
    messages_today bigint,
    active_users_today bigint,
    total_conversations bigint,
    most_active_bot_id uuid,
    most_active_bot_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_uuid uuid;
BEGIN
  -- Récupérer l'ID du propriétaire
  SELECT bo.id INTO owner_uuid
  FROM public.bot_owners bo
  WHERE bo.user_id = auth.uid();

  IF owner_uuid IS NULL THEN
      RAISE EXCEPTION 'Aucun compte propriétaire trouvé pour cet utilisateur.';
  END IF;

  -- Calculer les statistiques globales
  RETURN QUERY
  WITH owner_stats AS (
    SELECT
        COUNT(DISTINCT b.id) as total_bots,
        COUNT(DISTINCT CASE WHEN b.is_active = true THEN b.id END) as active_bots,
        COUNT(DISTINCT cm.id) as total_messages,
        COUNT(DISTINCT bu.id) as total_users,
        COUNT(DISTINCT CASE WHEN cm.created_at > CURRENT_DATE THEN cm.id END) as messages_today,
        COUNT(DISTINCT CASE WHEN bu.last_active > CURRENT_DATE THEN bu.id END) as active_users_today,
        COUNT(DISTINCT COALESCE(bu.session_id, cm.metadata->>'session_token')) as total_conversations
    FROM
        public.bots b
    LEFT JOIN
        public.chat_messages cm ON b.id = cm.bot_id
    LEFT JOIN
        public.bot_users bu ON cm.bot_user_id = bu.id
    WHERE
        b.owner_id = owner_uuid
  ),
  most_active AS (
    SELECT
        b.id as bot_id,
        b.name as bot_name,
        COUNT(cm.id) as message_count
    FROM
        public.bots b
    LEFT JOIN
        public.chat_messages cm ON b.id = cm.bot_id
    WHERE
        b.owner_id = owner_uuid
        AND cm.created_at > NOW() - INTERVAL '7 days'
    GROUP BY
        b.id, b.name
    ORDER BY
        message_count DESC
    LIMIT 1
  )
  SELECT
      os.total_bots::bigint,
      os.active_bots::bigint,
      os.total_messages::bigint,
      os.total_users::bigint,
      os.messages_today::bigint,
      os.active_users_today::bigint,
      os.total_conversations::bigint,
      ma.bot_id,
      ma.bot_name
  FROM
      owner_stats os
  CROSS JOIN
      most_active ma;
END;
$$;

-- 6. Créer des politiques RLS pour la nouvelle vue
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux propriétaires de voir leurs bot_users
CREATE POLICY "Bot owners can view their bot users"
ON public.bot_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE b.id = bot_users.bot_id AND bo.user_id = auth.uid()
  )
);

-- 7. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chat_messages_bot_user_timestamp 
ON public.chat_messages(bot_id, bot_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bot_users_session_activity 
ON public.bot_users(bot_id, session_id, last_active DESC);
;
