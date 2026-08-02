
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname NOT LIKE 'st\_%' ESCAPE '\'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public',
                     f.nspname, f.proname, f.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip %.%(%): %', f.nspname, f.proname, f.args, SQLERRM;
    END;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS waouh_messages_channel_msg_id_uniq
  ON public.waouh_messages (channel, ((meta->>'channel_message_id')))
  WHERE meta ? 'channel_message_id' AND meta->>'channel_message_id' <> '';

ALTER TABLE public.waouh_outbound_queue
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS circuit_open_until timestamptz;

CREATE TABLE IF NOT EXISTS public.waouh_rate_limit (
  phone text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (phone, window_started_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_rate_limit TO service_role;
ALTER TABLE public.waouh_rate_limit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role manages rate limit" ON public.waouh_rate_limit;
CREATE POLICY "service role manages rate limit"
  ON public.waouh_rate_limit FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS waouh_rate_limit_window_idx
  ON public.waouh_rate_limit (window_started_at);

CREATE INDEX IF NOT EXISTS waouh_messages_conv_created_idx
  ON public.waouh_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS waouh_outbound_queue_status_next_idx
  ON public.waouh_outbound_queue (status, next_attempt_at)
  WHERE status IN ('pending', 'retry');

CREATE INDEX IF NOT EXISTS waouh_radar_signals_city_captured_idx
  ON public.waouh_radar_signals (city, captured_at DESC);

CREATE INDEX IF NOT EXISTS waouh_deals_status_created_idx
  ON public.waouh_deals (status, created_at DESC);

CREATE INDEX IF NOT EXISTS waouh_conversations_updated_idx
  ON public.waouh_conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS waouh_notifications_user_sent_idx
  ON public.waouh_notifications (user_id, sent_at DESC);
;
