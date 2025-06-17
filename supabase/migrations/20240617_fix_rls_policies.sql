
-- Fix RLS policies to ensure data isolation between bot owners

-- Enable RLS on critical tables
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their own bots" ON public.bots;
DROP POLICY IF EXISTS "Users can only see messages from their bots" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can only see bot_users from their bots" ON public.bot_users;
DROP POLICY IF EXISTS "Users can only see sessions from their bots" ON public.enhanced_chat_sessions;
DROP POLICY IF EXISTS "Users can only see anonymous sessions from their bots" ON public.anonymous_visitor_sessions;

-- Bots table policies
CREATE POLICY "Users can only see their own bots" ON public.bots
FOR ALL USING (
  owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  )
);

-- Chat messages policies
CREATE POLICY "Users can only see messages from their bots" ON public.chat_messages
FOR ALL USING (
  bot_id IN (
    SELECT b.id FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE bo.user_id = auth.uid()
  )
);

-- Bot users policies
CREATE POLICY "Users can only see bot_users from their bots" ON public.bot_users
FOR ALL USING (
  bot_id IN (
    SELECT b.id FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE bo.user_id = auth.uid()
  )
);

-- Enhanced chat sessions policies
CREATE POLICY "Users can only see sessions from their bots" ON public.enhanced_chat_sessions
FOR ALL USING (
  bot_id IN (
    SELECT b.id FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE bo.user_id = auth.uid()
  )
);

-- Anonymous visitor sessions policies
CREATE POLICY "Users can only see anonymous sessions from their bots" ON public.anonymous_visitor_sessions
FOR ALL USING (
  bot_id IN (
    SELECT b.id FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE bo.user_id = auth.uid()
  )
);

-- Fix the bot_conversation_history view to ensure proper data isolation
DROP VIEW IF EXISTS public.bot_conversation_history;
CREATE VIEW public.bot_conversation_history AS
SELECT 
  cm.id as message_id,
  cm.bot_id,
  cm.bot_user_id,
  cm.created_at as message_timestamp,
  cm.message_content,
  cm.message_type,
  cm.ip_address,
  cm.user_agent,
  cm.metadata,
  bu.session_id,
  bu.user_name,
  bu.user_email,
  bu.created_at as user_first_seen,
  bu.last_active as user_last_active,
  b.name as bot_name,
  bo.id as owner_id,
  ecs.started_at as session_start,
  ROW_NUMBER() OVER (PARTITION BY cm.bot_id, bu.session_id ORDER BY cm.created_at) as message_order_in_session
FROM public.chat_messages cm
JOIN public.bot_users bu ON cm.bot_user_id = bu.id
JOIN public.bots b ON cm.bot_id = b.id
JOIN public.bot_owners bo ON b.owner_id = bo.id
LEFT JOIN public.enhanced_chat_sessions ecs ON ecs.bot_user_id = bu.id AND ecs.bot_id = cm.bot_id
ORDER BY cm.created_at DESC;

-- Create a secure function to get chat history for a specific owner
CREATE OR REPLACE FUNCTION public.get_secure_chat_history(p_bot_id uuid, p_session_token text DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_check boolean;
BEGIN
  -- Verify that the authenticated user owns this bot
  SELECT EXISTS (
    SELECT 1 FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
  ) INTO owner_check;

  IF NOT owner_check THEN
    RAISE EXCEPTION 'Access denied: You do not own this bot';
  END IF;

  -- Return chat history
  RETURN QUERY
  SELECT jsonb_build_object(
    'message_id', bch.message_id,
    'bot_id', bch.bot_id,
    'bot_user_id', bch.bot_user_id,
    'message_timestamp', bch.message_timestamp,
    'message_content', bch.message_content,
    'message_type', bch.message_type,
    'ip_address', bch.ip_address,
    'user_agent', bch.user_agent,
    'metadata', bch.metadata,
    'session_id', bch.session_id,
    'user_name', bch.user_name,
    'user_email', bch.user_email,
    'session_start', bch.session_start,
    'bot_name', bch.bot_name,
    'message_order_in_session', bch.message_order_in_session
  )
  FROM public.bot_conversation_history bch
  WHERE bch.bot_id = p_bot_id
    AND (p_session_token IS NULL OR bch.session_id = p_session_token)
  ORDER BY bch.message_timestamp ASC;
END;
$$;

-- Create a function to get all sessions for a bot owner
CREATE OR REPLACE FUNCTION public.get_owner_bot_sessions(p_bot_id uuid DEFAULT NULL)
RETURNS TABLE(
  session_id text,
  bot_id uuid,
  bot_name text,
  user_name text,
  user_email text,
  session_start timestamp with time zone,
  last_activity timestamp with time zone,
  total_messages integer,
  is_active boolean,
  entry_point text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify ownership for specific bot or return all owned bots
  IF p_bot_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE b.id = p_bot_id AND bo.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied: You do not own this bot';
    END IF;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    bu.session_id,
    b.id as bot_id,
    b.name as bot_name,
    COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
    bu.user_email,
    COALESCE(ecs.started_at, bu.created_at) as session_start,
    COALESCE(ecs.last_activity, bu.last_active) as last_activity,
    COALESCE(ecs.total_messages, 0) as total_messages,
    COALESCE(ecs.is_active, true) as is_active,
    COALESCE(ecs.entry_point, 'direct') as entry_point
  FROM public.bot_users bu
  JOIN public.bots b ON bu.bot_id = b.id
  JOIN public.bot_owners bo ON b.owner_id = bo.id
  LEFT JOIN public.enhanced_chat_sessions ecs ON ecs.bot_user_id = bu.id
  WHERE bo.user_id = auth.uid()
    AND (p_bot_id IS NULL OR b.id = p_bot_id)
    AND bu.session_id IS NOT NULL
  ORDER BY last_activity DESC;
END;
$$;
