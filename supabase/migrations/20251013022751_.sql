-- Ajouter la colonne metadata à la table notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Créer la table notification_preferences pour les préférences utilisateur
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_type)
);

-- Activer RLS sur notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour notification_preferences
CREATE POLICY "Users can manage their notification preferences"
ON public.notification_preferences
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fonction pour notifier les nouveaux messages bot
CREATE OR REPLACE FUNCTION public.notify_new_bot_message()
RETURNS TRIGGER AS $$
DECLARE
  bot_owner_id uuid;
  bot_name_var text;
BEGIN
  -- Récupérer le propriétaire du bot et son nom
  SELECT bo.user_id, b.name INTO bot_owner_id, bot_name_var
  FROM public.bots b
  JOIN public.bot_owners bo ON b.owner_id = bo.id
  WHERE b.id = NEW.bot_id;

  -- Créer une notification si c'est un message utilisateur
  IF NEW.message_type = 'user' AND bot_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, content, type, action_url, metadata, read)
    VALUES (
      bot_owner_id,
      'Nouveau message reçu',
      LEFT(NEW.message_content, 100),
      'message',
      '/bots/' || NEW.bot_id::text || '/messages',
      jsonb_build_object(
        'bot_id', NEW.bot_id,
        'bot_name', bot_name_var,
        'message_id', NEW.id,
        'timestamp', NOW()
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour les nouveaux messages
DROP TRIGGER IF EXISTS trigger_new_bot_message ON public.chat_messages;
CREATE TRIGGER trigger_new_bot_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_bot_message();

-- Fonction pour notifier les nouveaux utilisateurs bot
CREATE OR REPLACE FUNCTION public.notify_new_bot_user()
RETURNS TRIGGER AS $$
DECLARE
  bot_owner_id uuid;
  bot_name_var text;
BEGIN
  -- Récupérer le propriétaire et nom du bot
  SELECT bo.user_id, b.name INTO bot_owner_id, bot_name_var
  FROM public.bots b
  JOIN public.bot_owners bo ON b.owner_id = bo.id
  WHERE b.id = NEW.bot_id;

  -- Créer une notification
  IF bot_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, content, type, action_url, metadata, read)
    VALUES (
      bot_owner_id,
      'Nouvel utilisateur',
      'Un nouvel utilisateur interagit avec ' || COALESCE(bot_name_var, 'votre bot'),
      'bot_interaction',
      '/bots/' || NEW.bot_id::text || '/users',
      jsonb_build_object(
        'bot_id', NEW.bot_id,
        'bot_name', bot_name_var,
        'bot_user_id', NEW.id,
        'user_name', NEW.user_name,
        'timestamp', NOW()
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour les nouveaux utilisateurs bot
DROP TRIGGER IF EXISTS trigger_new_bot_user ON public.bot_users;
CREATE TRIGGER trigger_new_bot_user
AFTER INSERT ON public.bot_users
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_bot_user();;
