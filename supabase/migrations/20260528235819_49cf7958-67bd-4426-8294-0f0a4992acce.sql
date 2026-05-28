
ALTER TABLE public.waouh_conversations
  ADD COLUMN IF NOT EXISTS unread_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_direction TEXT;

ALTER TABLE public.waouh_notifications
  ADD COLUMN IF NOT EXISTS conversation_id UUID,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_waouh_conversations_user_last_inbound
  ON public.waouh_conversations(user_id, last_inbound_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_waouh_notifications_conversation
  ON public.waouh_notifications(conversation_id);

CREATE OR REPLACE FUNCTION public.waouh_bump_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.direction = 'in' THEN
    UPDATE public.waouh_conversations
       SET unread_count = COALESCE(unread_count,0) + 1,
           last_inbound_at = NEW.created_at,
           last_message = COALESCE(NEW.text, last_message),
           last_direction = 'in',
           updated_at = now()
     WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.waouh_conversations
       SET last_message = COALESCE(NEW.text, last_message),
           last_direction = 'out',
           updated_at = now()
     WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waouh_messages_bump_conv ON public.waouh_messages;
CREATE TRIGGER trg_waouh_messages_bump_conv
AFTER INSERT ON public.waouh_messages
FOR EACH ROW
EXECUTE FUNCTION public.waouh_bump_conversation_on_message();

CREATE OR REPLACE FUNCTION public.waouh_mark_conversation_read(p_conv_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.waouh_conversations
     SET unread_count = 0,
         updated_at = now()
   WHERE id = p_conv_id;
  UPDATE public.waouh_notifications
     SET opened = true,
         read_at = COALESCE(read_at, now())
   WHERE conversation_id = p_conv_id
     AND COALESCE(opened, false) = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.waouh_mark_conversation_read(UUID) TO authenticated, anon, service_role;
