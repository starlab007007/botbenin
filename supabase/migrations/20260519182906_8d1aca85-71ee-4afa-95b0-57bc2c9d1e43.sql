-- 1) Idempotence file outbound
ALTER TABLE public.waouh_outbound_queue
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;

-- Unique partiel : un même dedupe_key ne peut produire qu'une seule ligne active
CREATE UNIQUE INDEX IF NOT EXISTS uniq_outbound_dedupe_active
  ON public.waouh_outbound_queue (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('pending','sending','sent');

CREATE INDEX IF NOT EXISTS idx_outbound_next_attempt
  ON public.waouh_outbound_queue (status, next_attempt_at)
  WHERE status = 'pending';

-- 2) Empêche le double échange de contacts post-paiement
ALTER TABLE public.waouh_transactions
  ADD COLUMN IF NOT EXISTS contacts_exchanged_at timestamptz;

-- 3) Enqueue v2 idempotent
CREATE OR REPLACE FUNCTION public.waouh_enqueue_outbound_v2(
  p_to_phone text,
  p_to_user_id uuid,
  p_template text,
  p_payload jsonb,
  p_web_session_id text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_channel text DEFAULT 'whatsapp',
  p_message_id uuid DEFAULT NULL,
  p_transaction_id uuid DEFAULT NULL,
  p_dedupe_key text DEFAULT NULL,
  p_event_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  -- Idempotence : si une notification active existe déjà pour cette dedupe_key, on ne ré-enqueue pas.
  IF p_dedupe_key IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.waouh_outbound_queue
    WHERE dedupe_key = p_dedupe_key
      AND status IN ('pending','sending','sent')
    LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO public.waouh_outbound_queue
    (to_phone, to_user_id, channel, template, payload, status, attempts,
     web_session_id, image_url, message_id, transaction_id,
     dedupe_key, event_type, next_attempt_at)
  VALUES
    (p_to_phone, p_to_user_id, p_channel, p_template, COALESCE(p_payload, '{}'::jsonb),
     'pending', 0, p_web_session_id, p_image_url, p_message_id, p_transaction_id,
     p_dedupe_key, p_event_type, now())
  ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL AND status IN ('pending','sending','sent'))
    DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;