-- WAOUH Chat Meet V18.1
-- Accélération des historiques et activation sûre du temps réel.

CREATE INDEX IF NOT EXISTS waouh_chat_threads_relation_status_idx
  ON public.waouh_chat_threads(
    article_id,
    buyer_user_id,
    seller_user_id,
    status,
    updated_at DESC
  )
  WHERE thread_type = 'product_meet';

CREATE INDEX IF NOT EXISTS waouh_messages_thread_latest_idx
  ON public.waouh_messages(thread_id, created_at DESC)
  WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS waouh_notifications_viewer_thread_idx
  ON public.waouh_notifications(user_id, thread_id, sent_at DESC)
  WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS waouh_notifications_session_thread_idx
  ON public.waouh_notifications(web_session_id, thread_id, sent_at DESC)
  WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS waouh_negotiations_active_thread_idx
  ON public.waouh_negotiations(thread_id, updated_at DESC)
  WHERE thread_id IS NOT NULL
    AND state IN ('proposed', 'countered', 'accepted');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'waouh_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_messages;
  END IF;
END
$$;

COMMENT ON INDEX public.waouh_messages_thread_latest_idx IS
  'Lecture instantanée du dernier historique d’un Chat Meet strictement isolé.';
