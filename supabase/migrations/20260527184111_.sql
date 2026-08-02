
CREATE OR REPLACE FUNCTION public.notify_on_waouh_inbound()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid;
  v_label text;
  v_body text;
BEGIN
  IF NEW.direction IS DISTINCT FROM 'in' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT auth_user_id INTO v_auth_user_id
  FROM public.waouh_users
  WHERE id = NEW.user_id;

  IF v_auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_label := COALESCE(NEW.phone_number, 'Client');
  v_body := COALESCE(NULLIF(LEFT(NEW.text, 140), ''), '📎 Nouveau message');

  INSERT INTO public.notifications (user_id, title, content, type, action_url, metadata, read)
  VALUES (
    v_auth_user_id,
    'Nouveau message · ' || v_label,
    v_body,
    'chat',
    CASE WHEN NEW.conversation_id IS NOT NULL
         THEN '/app/chat/' || NEW.conversation_id::text
         ELSE '/app/chat' END,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'channel', NEW.channel,
      'phone_number', NEW.phone_number
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_waouh_inbound ON public.waouh_messages;
CREATE TRIGGER trg_notify_on_waouh_inbound
AFTER INSERT ON public.waouh_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_waouh_inbound();
;
