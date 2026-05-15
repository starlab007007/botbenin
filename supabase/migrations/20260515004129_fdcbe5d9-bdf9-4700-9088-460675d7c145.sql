-- Add columns
ALTER TABLE public.waouh_outbound_queue
  ADD COLUMN IF NOT EXISTS web_session_id text,
  ADD COLUMN IF NOT EXISTS image_url text;

CREATE INDEX IF NOT EXISTS idx_waouh_outbound_queue_web_session
  ON public.waouh_outbound_queue (web_session_id) WHERE web_session_id IS NOT NULL;

-- Helper RPC v2
CREATE OR REPLACE FUNCTION public.waouh_enqueue_outbound_v2(
  p_to_phone text,
  p_to_user_id uuid,
  p_template text,
  p_payload jsonb,
  p_web_session_id text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_channel text DEFAULT 'whatsapp'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.waouh_outbound_queue
    (to_phone, to_user_id, channel, template, payload, status, attempts, web_session_id, image_url)
  VALUES
    (p_to_phone, p_to_user_id, p_channel, p_template, COALESCE(p_payload, '{}'::jsonb), 'pending', 0, p_web_session_id, p_image_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Allow Realtime: anonymous SELECT scoped by web_session_id (templates are non-sensitive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='waouh_outbound_queue' AND policyname='Public can read own web session notifications'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read own web session notifications" ON public.waouh_outbound_queue FOR SELECT USING (web_session_id IS NOT NULL)';
  END IF;
END $$;

-- Ensure realtime
ALTER TABLE public.waouh_outbound_queue REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='waouh_outbound_queue'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_outbound_queue';
  END IF;
END $$;