
-- 1. Storage bucket for chat photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('waouh-uploads', 'waouh-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "waouh-uploads public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'waouh-uploads');

CREATE POLICY "waouh-uploads anon insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'waouh-uploads');

-- 2. attachments on messages
ALTER TABLE public.waouh_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- 3. status_history on transactions
ALTER TABLE public.waouh_transactions
  ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.waouh_log_tx_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_history = COALESCE(NEW.status_history, '[]'::jsonb) ||
      jsonb_build_array(jsonb_build_object('status', NEW.status, 'at', now()));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS waouh_tx_status_history ON public.waouh_transactions;
CREATE TRIGGER waouh_tx_status_history
  BEFORE INSERT OR UPDATE OF status ON public.waouh_transactions
  FOR EACH ROW EXECUTE FUNCTION public.waouh_log_tx_status();

-- 4. RPC to link an anon web session to an authenticated user
CREATE OR REPLACE FUNCTION public.waouh_link_session(p_session_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.waouh_users
    SET user_id = p_user_id
    WHERE web_session_id = p_session_id AND user_id IS NULL;

  UPDATE public.waouh_messages
    SET user_id = COALESCE(user_id, p_user_id)
    WHERE web_session_id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.waouh_link_session(text, uuid) TO authenticated, anon;
;
