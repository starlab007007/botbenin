
-- Améliorer la table users pour supporter connexion par téléphone
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS language text DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone;

-- Créer un index unique pour les numéros de téléphone
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique 
ON public.users (phone) 
WHERE phone IS NOT NULL;

-- Créer la table user_profiles pour les données étendues
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  avatar_url text,
  bio text,
  preferences jsonb DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Créer la table user_activities pour traquer l'activité
CREATE TABLE IF NOT EXISTS public.user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Créer la table user_sessions pour gérer les sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  session_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  last_activity timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Activer RLS sur toutes les nouvelles tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR ALL USING (public.is_admin());

-- Politiques RLS pour user_activities
CREATE POLICY "Users can view own activities" ON public.user_activities
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activities" ON public.user_activities
  FOR ALL USING (public.is_admin());

-- Politiques RLS pour user_sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR ALL USING (public.is_admin());

-- Créer une vue pour les statistiques utilisateurs
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.phone,
  u.subscription_tier,
  u.created_at,
  u.last_login,
  u.is_active,
  COUNT(DISTINCT b.id) as total_bots,
  COUNT(DISTINCT cm.id) as total_messages,
  COUNT(DISTINCT a.id) as total_automations,
  COUNT(DISTINCT n.id) as unread_notifications,
  r.name as role_name
FROM public.users u
LEFT JOIN public.bot_owners bo ON u.id = bo.user_id
LEFT JOIN public.bots b ON bo.id = b.owner_id
LEFT JOIN public.chat_messages cm ON b.id = cm.bot_id
LEFT JOIN public.automations a ON u.id = a.user_id
LEFT JOIN public.notifications n ON u.id = n.user_id AND n.read = false
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
GROUP BY u.id, u.email, u.full_name, u.phone, u.subscription_tier, 
         u.created_at, u.last_login, u.is_active, r.name;

-- Fonction pour enregistrer l'activité utilisateur
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO public.user_activities (user_id, activity_type, description, metadata)
  VALUES (p_user_id, p_activity_type, p_description, p_metadata)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Fonction pour mettre à jour la dernière activité
CREATE OR REPLACE FUNCTION public.update_user_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users 
  SET last_activity = now()
  WHERE id = auth.uid();
  
  RETURN NULL;
END;
$$;

-- Trigger pour mettre à jour automatiquement l'activité
CREATE OR REPLACE TRIGGER update_user_activity
  AFTER INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_user_last_activity();

-- Fonction pour créer un profil utilisateur complet
CREATE OR REPLACE FUNCTION public.create_complete_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.user_profiles (user_id, preferences)
  VALUES (NEW.id, '{"notifications": true, "language": "fr", "timezone": "UTC"}');
  
  -- Enregistrer l'activité de création de compte
  PERFORM public.log_user_activity(
    NEW.id, 
    'account_created', 
    'Nouveau compte créé',
    jsonb_build_object('email', NEW.email, 'method', 'signup')
  );
  
  RETURN NEW;
END;
$$;

-- Mettre à jour le trigger existant pour inclure le profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_complete_user_profile();
;
