
-- Amélioration de la table users pour l'administration
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
ADD COLUMN IF NOT EXISTS login_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Table pour les logs d'administration
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.users(id) NOT NULL,
  target_user_id uuid REFERENCES public.users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table pour les permissions détaillées
CREATE TABLE IF NOT EXISTS public.detailed_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  description text,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Table pour les rôles avec permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.detailed_permissions(id) ON DELETE CASCADE,
  granted_at timestamp with time zone DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Table pour les permissions utilisateur spécifiques
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.detailed_permissions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  UNIQUE(user_id, permission_id)
);

-- Table pour la gestion des plans d'abonnement détaillés
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS features_detailed jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_storage_gb integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS api_calls_limit integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS support_level text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Table pour l'historique des abonnements
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id),
  action text NOT NULL CHECK (action IN ('created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'expired')),
  old_plan_id uuid REFERENCES public.subscription_plans(id),
  effective_date timestamp with time zone NOT NULL,
  created_by uuid REFERENCES public.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table pour les métriques de la plateforme
CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_data jsonb DEFAULT '{}',
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Insérer les permissions de base
INSERT INTO public.detailed_permissions (name, category, description, resource, action) VALUES
-- Gestion des utilisateurs
('users.view', 'users', 'Voir la liste des utilisateurs', 'users', 'read'),
('users.create', 'users', 'Créer des utilisateurs', 'users', 'create'),
('users.edit', 'users', 'Modifier les utilisateurs', 'users', 'update'),
('users.delete', 'users', 'Supprimer des utilisateurs', 'users', 'delete'),
('users.suspend', 'users', 'Suspendre des utilisateurs', 'users', 'suspend'),
('users.reset_password', 'users', 'Réinitialiser les mots de passe', 'users', 'reset_password'),

-- Gestion des abonnements
('subscriptions.view', 'subscriptions', 'Voir les abonnements', 'subscriptions', 'read'),
('subscriptions.create', 'subscriptions', 'Créer des abonnements', 'subscriptions', 'create'),
('subscriptions.edit', 'subscriptions', 'Modifier les abonnements', 'subscriptions', 'update'),
('subscriptions.cancel', 'subscriptions', 'Annuler des abonnements', 'subscriptions', 'cancel'),

-- Gestion des bots
('bots.view_all', 'bots', 'Voir tous les bots', 'bots', 'read_all'),
('bots.edit_all', 'bots', 'Modifier tous les bots', 'bots', 'update_all'),
('bots.delete_all', 'bots', 'Supprimer tous les bots', 'bots', 'delete_all'),

-- Gestion des campagnes
('campaigns.view_all', 'campaigns', 'Voir toutes les campagnes', 'campaigns', 'read_all'),
('campaigns.edit_all', 'campaigns', 'Modifier toutes les campagnes', 'campaigns', 'update_all'),
('campaigns.delete_all', 'campaigns', 'Supprimer toutes les campagnes', 'campaigns', 'delete_all'),

-- Administration de la plateforme
('platform.analytics', 'platform', 'Accès aux analytics de la plateforme', 'platform', 'analytics'),
('platform.settings', 'platform', 'Modifier les paramètres de la plateforme', 'platform', 'settings'),
('platform.logs', 'platform', 'Voir les logs de la plateforme', 'platform', 'logs'),
('platform.maintenance', 'platform', 'Mode maintenance', 'platform', 'maintenance')

ON CONFLICT (name) DO NOTHING;

-- Fonction pour vérifier les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    -- Permissions via rôles
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.detailed_permissions dp ON rp.permission_id = dp.id
    WHERE ur.user_id = user_uuid AND dp.name = permission_name
    
    UNION
    
    -- Permissions directes
    SELECT 1 FROM public.user_permissions up
    JOIN public.detailed_permissions dp ON up.permission_id = dp.id
    WHERE up.user_id = user_uuid 
      AND dp.name = permission_name
      AND (up.expires_at IS NULL OR up.expires_at > now())
  );
$$;

-- Fonction pour obtenir toutes les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid uuid)
RETURNS TABLE(permission_name text, category text, source text)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Permissions via rôles
  SELECT dp.name, dp.category, 'role:' || r.name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.detailed_permissions dp ON rp.permission_id = dp.id
  WHERE ur.user_id = user_uuid
  
  UNION
  
  -- Permissions directes
  SELECT dp.name, dp.category, 'direct'
  FROM public.user_permissions up
  JOIN public.detailed_permissions dp ON up.permission_id = dp.id
  WHERE up.user_id = user_uuid
    AND (up.expires_at IS NULL OR up.expires_at > now());
$$;

-- Vue pour les statistiques administrateur
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM public.users WHERE status = 'active') as active_users,
  (SELECT COUNT(*) FROM public.users WHERE status = 'inactive') as inactive_users,
  (SELECT COUNT(*) FROM public.users WHERE status = 'suspended') as suspended_users,
  (SELECT COUNT(*) FROM public.users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
  (SELECT COUNT(*) FROM public.bots) as total_bots,
  (SELECT COUNT(*) FROM public.bots WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_bots_30d,
  (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active') as active_subscriptions,
  (SELECT SUM(click_count) FROM public.shortened_links) as total_link_clicks,
  (SELECT COUNT(*) FROM public.chat_messages WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours') as messages_24h,
  (SELECT COUNT(DISTINCT bot_user_id) FROM public.chat_messages WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours') as active_chat_users_24h;

-- Trigger pour logguer les actions d'administration
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.admin_logs (admin_user_id, target_user_id, action, details)
    VALUES (
      auth.uid(),
      NEW.id,
      'status_change',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur la table users
DROP TRIGGER IF EXISTS trigger_log_user_status_change ON public.users;
CREATE TRIGGER trigger_log_user_status_change
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_action();

-- Politiques RLS pour l'administration
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (public.user_has_permission(auth.uid(), 'platform.logs'));

ALTER TABLE public.detailed_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage permissions" ON public.detailed_permissions
  FOR ALL USING (public.user_has_permission(auth.uid(), 'users.edit'));
;
