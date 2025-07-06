
-- Migration pour créer le système d'administration complet
-- ATTENTION: Cette migration n'ajoute que de nouveaux éléments, sans modifier l'existant

-- 1. Créer le type enum pour les rôles (s'il n'existe pas déjà)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Créer la table des rôles principaux
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Créer la table des permissions détaillées
CREATE TABLE IF NOT EXISTS public.detailed_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Créer la table des rôles utilisateur
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- 5. Créer la table des permissions par rôle
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.detailed_permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

-- 6. Créer la table des permissions utilisateur directes (optionnel)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.detailed_permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    granted_by UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission_id)
);

-- 7. Activer RLS sur toutes les nouvelles tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 8. Créer les fonctions de sécurité (sécurité definer pour éviter la récursion RLS)
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

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid 
    AND r.name = 'admin'
  );
$$;

-- 9. Créer les politiques RLS pour les nouvelles tables
-- Politiques pour roles
CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (public.user_has_permission(auth.uid(), 'users.edit'));

-- Politiques pour user_roles
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (public.user_has_permission(auth.uid(), 'users.edit'));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Politiques pour role_permissions
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (public.user_has_permission(auth.uid(), 'users.edit'));

-- Politiques pour user_permissions
CREATE POLICY "Admins can manage user permissions" ON public.user_permissions
  FOR ALL USING (public.user_has_permission(auth.uid(), 'users.edit'));

CREATE POLICY "Users can view their own permissions" ON public.user_permissions
  FOR SELECT USING (user_id = auth.uid());

-- 10. Insérer les rôles de base
INSERT INTO public.roles (name, description, is_system_role) VALUES
('admin', 'Administrateur avec tous les privilèges', true),
('manager', 'Gestionnaire avec privilèges de modération', true),
('user', 'Utilisateur standard', true),
('viewer', 'Observateur en lecture seule', true)
ON CONFLICT (name) DO NOTHING;

-- 11. Insérer les permissions détaillées
INSERT INTO public.detailed_permissions (name, category, resource, action, description) VALUES
-- Permissions utilisateurs
('users.view', 'users', 'users', 'view', 'Voir la liste des utilisateurs'),
('users.edit', 'users', 'users', 'edit', 'Modifier les utilisateurs'),
('users.delete', 'users', 'users', 'delete', 'Supprimer les utilisateurs'),
('users.create', 'users', 'users', 'create', 'Créer de nouveaux utilisateurs'),

-- Permissions bots
('bots.view_all', 'bots', 'bots', 'view_all', 'Voir tous les bots'),
('bots.edit_all', 'bots', 'bots', 'edit_all', 'Modifier tous les bots'),
('bots.delete_all', 'bots', 'bots', 'delete_all', 'Supprimer tous les bots'),

-- Permissions plateforme
('platform.settings', 'platform', 'platform', 'settings', 'Gérer les paramètres de la plateforme'),
('platform.analytics', 'platform', 'platform', 'analytics', 'Accéder aux analyses globales'),
('platform.logs', 'platform', 'platform', 'logs', 'Accéder aux logs système'),

-- Permissions finances
('finance.view', 'finance', 'finance', 'view', 'Voir les données financières'),
('finance.manage', 'finance', 'finance', 'manage', 'Gérer les finances'),

-- Permissions support
('support.manage', 'support', 'support', 'manage', 'Gérer le support client'),

-- Permissions campagnes
('campaigns.view_all', 'campaigns', 'campaigns', 'view_all', 'Voir toutes les campagnes'),
('campaigns.edit_all', 'campaigns', 'campaigns', 'edit_all', 'Modifier toutes les campagnes')

ON CONFLICT (name) DO NOTHING;

-- 12. Assigner toutes les permissions au rôle admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, dp.id
FROM public.roles r
CROSS JOIN public.detailed_permissions dp
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 13. Créer le compte admin avec l'email spécifié
-- Note: Le mot de passe sera défini lors de la création du compte via l'interface
DO $$
DECLARE
    admin_user_id UUID;
    admin_role_id UUID;
BEGIN
    -- Récupérer l'ID du rôle admin
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
    
    -- Vérifier si un utilisateur admin existe déjà
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@bot.bj';
    
    -- Si l'utilisateur admin n'existe pas, on doit le créer via l'API Auth
    -- Pour l'instant, on prépare juste la structure
    IF admin_user_id IS NULL THEN
        -- L'utilisateur sera créé via l'interface d'authentification
        -- On laisse un placeholder pour le moment
        RAISE NOTICE 'Compte admin admin@bot.bj à créer via l''interface d''authentification';
    ELSE
        -- Si l'utilisateur existe déjà, lui assigner le rôle admin
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (admin_user_id, admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
        
        RAISE NOTICE 'Rôle admin assigné à l''utilisateur existant admin@bot.bj';
    END IF;
END $$;

-- 14. Créer des triggers pour mise à jour automatique
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger sur la table roles
DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON public.roles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Fonction utilitaire pour obtenir les permissions d'un utilisateur
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

-- 16. Fonction pour créer automatiquement le compte admin si nécessaire
CREATE OR REPLACE FUNCTION public.ensure_admin_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
    admin_role_id UUID;
BEGIN
    -- Récupérer l'ID du rôle admin
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
    
    -- Chercher l'utilisateur admin
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@bot.bj';
    
    -- Si l'utilisateur existe, s'assurer qu'il a le rôle admin
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (admin_user_id, admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END;
$$;
