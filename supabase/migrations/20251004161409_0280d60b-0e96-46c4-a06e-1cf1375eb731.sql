-- Créer ou améliorer la table des notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- 'message', 'action', 'link_click', 'share', 'bot_interaction', 'booking', 'system'
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Activer RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : l'utilisateur ne peut voir que ses propres notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Permettre l'insertion de notifications par le système
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, content, type, metadata, action_url)
  VALUES (p_user_id, p_title, p_content, p_type, p_metadata, p_action_url)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger pour notifier sur nouveaux messages de chat
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bot_owner_id UUID;
  bot_name TEXT;
BEGIN
  -- Récupérer le propriétaire du bot
  SELECT bo.user_id, b.name INTO bot_owner_id, bot_name
  FROM public.bots b
  JOIN public.bot_owners bo ON b.owner_id = bo.id
  WHERE b.id = NEW.bot_id;
  
  -- Si c'est un message utilisateur, notifier le propriétaire
  IF NEW.message_type = 'user' AND bot_owner_id IS NOT NULL THEN
    PERFORM public.create_notification(
      bot_owner_id,
      'Nouveau message reçu',
      'Nouveau message sur ' || bot_name || ': ' || LEFT(NEW.message_content, 100),
      'message',
      jsonb_build_object('bot_id', NEW.bot_id, 'message_id', NEW.id),
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_chat_message ON public.chat_messages;
CREATE TRIGGER trigger_notify_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_chat_message();

-- Trigger pour notifier sur nouveaux utilisateurs bot
CREATE OR REPLACE FUNCTION public.notify_on_new_bot_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bot_owner_id UUID;
  bot_name TEXT;
BEGIN
  -- Récupérer le propriétaire du bot
  SELECT bo.user_id, b.name INTO bot_owner_id, bot_name
  FROM public.bots b
  JOIN public.bot_owners bo ON b.owner_id = bo.id
  WHERE b.id = NEW.bot_id;
  
  IF bot_owner_id IS NOT NULL THEN
    PERFORM public.create_notification(
      bot_owner_id,
      'Nouvel utilisateur',
      'Un nouvel utilisateur interagit avec ' || bot_name,
      'bot_interaction',
      jsonb_build_object('bot_id', NEW.bot_id, 'user_id', NEW.id),
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_bot_user ON public.bot_users;
CREATE TRIGGER trigger_notify_new_bot_user
  AFTER INSERT ON public.bot_users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_bot_user();

-- Trigger pour notifier sur clics de liens raccourcis
CREATE OR REPLACE FUNCTION public.notify_on_link_click()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  link_owner_id UUID;
BEGIN
  -- Récupérer le propriétaire du lien
  SELECT bo.user_id INTO link_owner_id
  FROM public.shortened_links sl
  JOIN public.bot_owners bo ON sl.owner_id = bo.id
  WHERE sl.id = NEW.shortened_link_id;
  
  IF link_owner_id IS NOT NULL THEN
    PERFORM public.create_notification(
      link_owner_id,
      'Lien cliqué',
      'Quelqu''un a cliqué sur votre lien raccourci',
      'link_click',
      jsonb_build_object('link_id', NEW.shortened_link_id, 'ip', NEW.ip_address::text),
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_link_click ON public.link_clicks;
CREATE TRIGGER trigger_notify_link_click
  AFTER INSERT ON public.link_clicks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_link_click();

-- Fonction pour marquer toutes les notifications comme lues
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read = true, updated_at = NOW()
  WHERE user_id = p_user_id AND read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Activer le realtime pour les notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;