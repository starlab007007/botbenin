
-- Créer une fonction de diagnostic simplifiée pour identifier les problèmes de session
CREATE OR REPLACE FUNCTION public.diagnose_session_issues()
RETURNS TABLE(
  issue_type text,
  count bigint,
  sample_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retourner les sessions dupliquées
  RETURN QUERY
  SELECT 
    'duplicate_sessions'::text as issue_type,
    COUNT(*)::bigint as count,
    jsonb_agg(
      jsonb_build_object(
        'bot_id', subq.bot_id,
        'session_id', subq.session_id,
        'user_count', subq.cnt
      )
    ) as sample_details
  FROM (
    SELECT bot_id, session_id, COUNT(*) as cnt
    FROM public.bot_users
    WHERE session_id IS NOT NULL
    GROUP BY bot_id, session_id
    HAVING COUNT(*) > 1
    LIMIT 10
  ) subq
  WHERE subq.cnt > 0;

  -- Retourner les sessions anonymes orphelines
  RETURN QUERY
  SELECT 
    'orphaned_anonymous_sessions'::text as issue_type,
    COUNT(*)::bigint as count,
    jsonb_agg(
      jsonb_build_object(
        'bot_id', avs.bot_id,
        'session_token', avs.session_token,
        'started_at', avs.started_at
      )
    ) as sample_details
  FROM public.anonymous_visitor_sessions avs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.bot_users bu 
    WHERE bu.bot_id = avs.bot_id 
    AND bu.session_id = avs.session_token
  )
  LIMIT 10;

  -- Retourner les messages sans sessions valides
  RETURN QUERY
  SELECT 
    'messages_without_valid_sessions'::text as issue_type,
    COUNT(*)::bigint as count,
    jsonb_agg(
      jsonb_build_object(
        'message_id', cm.id,
        'bot_id', cm.bot_id,
        'session_token', cm.metadata->>'session_token'
      )
    ) as sample_details
  FROM public.chat_messages cm
  WHERE cm.metadata->>'session_token' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.bot_users bu 
    WHERE bu.bot_id = cm.bot_id 
    AND bu.session_id = cm.metadata->>'session_token'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.anonymous_visitor_sessions avs
    WHERE avs.bot_id = cm.bot_id 
    AND avs.session_token = cm.metadata->>'session_token'
  )
  LIMIT 10;
END;
$$;
;
