-- Supprimer complètement la table role_permissions et la recréer
DROP TABLE IF EXISTS public.role_permissions CASCADE;

-- Recréer la table avec la bonne structure
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.detailed_permissions(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Activer RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les admins
CREATE POLICY "Admins can manage role permissions" 
ON public.role_permissions 
FOR ALL
USING (user_has_permission(auth.uid(), 'users.edit'));

-- Nettoyer les autres tables
TRUNCATE TABLE public.detailed_permissions CASCADE;
TRUNCATE TABLE public.roles CASCADE;

-- Recréer les rôles
INSERT INTO public.roles (name, display_name, description) 
VALUES 
  ('admin', 'Administrateur', 'Accès complet à toutes les fonctionnalités'),
  ('manager', 'Manager', 'Gestion des utilisateurs et des campagnes'),
  ('user', 'Utilisateur', 'Accès standard aux fonctionnalités');

-- Insérer les permissions
INSERT INTO public.detailed_permissions (name, description, resource, action, category) 
VALUES 
  -- Permissions plateforme
  ('platform.admin', 'Accès administrateur complet', 'platform', 'admin', 'system'),
  ('platform.logs', 'Voir les logs système', 'platform', 'view', 'system'),
  ('platform.settings', 'Modifier les paramètres système', 'platform', 'edit', 'system'),
  
  -- Permissions utilisateurs
  ('users.view', 'Voir les utilisateurs', 'users', 'view', 'user_management'),
  ('users.edit', 'Modifier les utilisateurs', 'users', 'edit', 'user_management'),
  ('users.delete', 'Supprimer les utilisateurs', 'users', 'delete', 'user_management'),
  ('users.roles', 'Gérer les rôles des utilisateurs', 'users', 'manage_roles', 'user_management'),
  
  -- Permissions bots
  ('bots.view', 'Voir les bots', 'bots', 'view', 'bot_management'),
  ('bots.create', 'Créer des bots', 'bots', 'create', 'bot_management'),
  ('bots.edit', 'Modifier les bots', 'bots', 'edit', 'bot_management'),
  ('bots.delete', 'Supprimer les bots', 'bots', 'delete', 'bot_management'),
  ('bots.analytics', 'Voir les analytics des bots', 'bots', 'view_analytics', 'bot_management'),
  
  -- Permissions prospects
  ('prospects.view', 'Voir les prospects', 'prospects', 'view', 'prospect_management'),
  ('prospects.create', 'Créer des prospects', 'prospects', 'create', 'prospect_management'),
  ('prospects.edit', 'Modifier les prospects', 'prospects', 'edit', 'prospect_management'),
  ('prospects.delete', 'Supprimer les prospects', 'prospects', 'delete', 'prospect_management'),
  ('prospects.export', 'Exporter les prospects', 'prospects', 'export', 'prospect_management'),
  
  -- Permissions campagnes
  ('campaigns.view', 'Voir les campagnes', 'campaigns', 'view', 'campaign_management'),
  ('campaigns.create', 'Créer des campagnes', 'campaigns', 'create', 'campaign_management'),
  ('campaigns.edit', 'Modifier les campagnes', 'campaigns', 'edit', 'campaign_management'),
  ('campaigns.delete', 'Supprimer les campagnes', 'campaigns', 'delete', 'campaign_management'),
  ('campaigns.launch', 'Lancer des campagnes', 'campaigns', 'launch', 'campaign_management');

-- Assigner toutes les permissions au rôle admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, dp.id
FROM public.roles r
CROSS JOIN public.detailed_permissions dp
WHERE r.name = 'admin';

-- Assigner des permissions limitées au manager
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, dp.id
FROM public.roles r
CROSS JOIN public.detailed_permissions dp
WHERE r.name = 'manager'
  AND dp.name IN (
    'users.view', 'users.roles',
    'bots.view', 'bots.create', 'bots.edit', 'bots.analytics',
    'prospects.view', 'prospects.create', 'prospects.edit', 'prospects.export',
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.launch'
  );

-- Assigner des permissions de base au user
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, dp.id
FROM public.roles r
CROSS JOIN public.detailed_permissions dp
WHERE r.name = 'user'
  AND dp.name IN (
    'bots.view', 'bots.create', 'bots.edit',
    'prospects.view', 'prospects.create', 'prospects.edit',
    'campaigns.view'
  );

-- Attribuer le rôle admin à bot.bjdata@gmail.com
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN public.roles r
WHERE u.email = 'bot.bjdata@gmail.com' 
  AND r.name = 'admin'
ON CONFLICT DO NOTHING;