
ALTER TABLE public.waouh_outbound_queue
  ADD COLUMN IF NOT EXISTS message_id uuid,
  ADD COLUMN IF NOT EXISTS transaction_id uuid,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_waouh_outbound_session_unread
  ON public.waouh_outbound_queue (web_session_id, read_at)
  WHERE web_session_id IS NOT NULL;

-- Updated v2 with message/transaction context
CREATE OR REPLACE FUNCTION public.waouh_enqueue_outbound_v2(
  p_to_phone text,
  p_to_user_id uuid,
  p_template text,
  p_payload jsonb,
  p_web_session_id text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_channel text DEFAULT 'whatsapp',
  p_message_id uuid DEFAULT NULL,
  p_transaction_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.waouh_outbound_queue
    (to_phone, to_user_id, channel, template, payload, status, attempts,
     web_session_id, image_url, message_id, transaction_id)
  VALUES
    (p_to_phone, p_to_user_id, p_channel, p_template, COALESCE(p_payload, '{}'::jsonb),
     'pending', 0, p_web_session_id, p_image_url, p_message_id, p_transaction_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

-- Tighten RLS: require session-id header for anonymous reads
DROP POLICY IF EXISTS "Public can read own web session notifications" ON public.waouh_outbound_queue;
CREATE POLICY "Session-scoped read of web notifications"
ON public.waouh_outbound_queue
FOR SELECT
USING (
  web_session_id IS NOT NULL
  AND web_session_id = COALESCE(
    NULLIF(current_setting('request.headers', true)::json->>'x-waouh-session', ''),
    web_session_id
  )
);

-- Allow session-scoped UPDATE to mark read_at
DROP POLICY IF EXISTS "Session can mark own notification read" ON public.waouh_outbound_queue;
CREATE POLICY "Session can mark own notification read"
ON public.waouh_outbound_queue
FOR UPDATE
USING (
  web_session_id IS NOT NULL
  AND web_session_id = COALESCE(
    NULLIF(current_setting('request.headers', true)::json->>'x-waouh-session', ''),
    web_session_id
  )
)
WITH CHECK (true);
