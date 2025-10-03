-- ============================================
-- Système de Permissions Complet
-- ============================================

-- Insertion de toutes les permissions détaillées
INSERT INTO public.detailed_permissions (name, description, resource, action, category) VALUES
-- Gestion des utilisateurs
('users.view', 'Voir tous les utilisateurs', 'users', 'view', 'administration'),
('users.view.own', 'Voir son propre profil', 'users', 'view', 'administration'),
('users.edit', 'Modifier les utilisateurs', 'users', 'edit', 'administration'),
('users.edit.own', 'Modifier son propre profil', 'users', 'edit', 'administration'),
('users.create', 'Créer des utilisateurs', 'users', 'create', 'administration'),
('users.delete', 'Supprimer des utilisateurs', 'users', 'delete', 'administration'),
('users.assign.roles', 'Assigner des rôles', 'users', 'assign_roles', 'administration'),

-- Gestion des rôles et permissions
('roles.view', 'Voir les rôles', 'roles', 'view', 'administration'),
('roles.edit', 'Modifier les rôles', 'roles', 'edit', 'administration'),
('roles.create', 'Créer des rôles', 'roles', 'create', 'administration'),
('roles.delete', 'Supprimer des rôles', 'roles', 'delete', 'administration'),
('permissions.view', 'Voir les permissions', 'permissions', 'view', 'administration'),
('permissions.assign', 'Assigner des permissions', 'permissions', 'assign', 'administration'),

-- Gestion des bots
('bots.view.all', 'Voir tous les bots', 'bots', 'view', 'bots'),
('bots.view.own', 'Voir ses propres bots', 'bots', 'view', 'bots'),
('bots.create', 'Créer des bots', 'bots', 'create', 'bots'),
('bots.edit.all', 'Modifier tous les bots', 'bots', 'edit', 'bots'),
('bots.edit.own', 'Modifier ses propres bots', 'bots', 'edit', 'bots'),
('bots.delete.all', 'Supprimer tous les bots', 'bots', 'delete', 'bots'),
('bots.delete.own', 'Supprimer ses propres bots', 'bots', 'delete', 'bots'),
('bots.config.advanced', 'Configuration avancée des bots', 'bots', 'config', 'bots'),
('bots.analytics.view', 'Voir les analytics des bots', 'bots', 'analytics', 'bots'),

-- Google Sheets
('sheets.view', 'Voir les Google Sheets', 'sheets', 'view', 'integrations'),
('sheets.connect', 'Connecter Google Sheets', 'sheets', 'connect', 'integrations'),
('sheets.edit', 'Modifier les données Google Sheets', 'sheets', 'edit', 'integrations'),
('sheets.sync', 'Synchroniser Google Sheets', 'sheets', 'sync', 'integrations'),
('sheets.diagnostic.basic', 'Diagnostic basique Google Sheets', 'sheets', 'diagnostic', 'integrations'),
('sheets.diagnostic.advanced', 'Diagnostic avancé Google Sheets', 'sheets', 'diagnostic', 'integrations'),
('sheets.config', 'Configurer Google Sheets', 'sheets', 'config', 'integrations'),

-- WhatsApp
('whatsapp.view', 'Voir les sessions WhatsApp', 'whatsapp', 'view', 'integrations'),
('whatsapp.connect', 'Connecter WhatsApp', 'whatsapp', 'connect', 'integrations'),
('whatsapp.send', 'Envoyer des messages WhatsApp', 'whatsapp', 'send', 'integrations'),
('whatsapp.manage.sessions', 'Gérer les sessions WhatsApp', 'whatsapp', 'manage', 'integrations'),
('whatsapp.config', 'Configurer WhatsApp', 'whatsapp', 'config', 'integrations'),
('whatsapp.diagnostic', 'Diagnostiquer WhatsApp', 'whatsapp', 'diagnostic', 'integrations'),

-- Prospects et CRM
('prospects.view.all', 'Voir tous les prospects', 'prospects', 'view', 'crm'),
('prospects.view.own', 'Voir ses propres prospects', 'prospects', 'view', 'crm'),
('prospects.create', 'Créer des prospects', 'prospects', 'create', 'crm'),
('prospects.edit.all', 'Modifier tous les prospects', 'prospects', 'edit', 'crm'),
('prospects.edit.own', 'Modifier ses propres prospects', 'prospects', 'edit', 'crm'),
('prospects.delete.all', 'Supprimer tous les prospects', 'prospects', 'delete', 'crm'),
('prospects.delete.own', 'Supprimer ses propres prospects', 'prospects', 'delete', 'crm'),
('prospects.export', 'Exporter des prospects', 'prospects', 'export', 'crm'),
('prospects.import', 'Importer des prospects', 'prospects', 'import', 'crm'),
('prospects.qualify', 'Qualifier des prospects', 'prospects', 'qualify', 'crm'),

-- Campagnes Marketing
('campaigns.view.all', 'Voir toutes les campagnes', 'campaigns', 'view', 'marketing'),
('campaigns.view.own', 'Voir ses propres campagnes', 'campaigns', 'view', 'marketing'),
('campaigns.create', 'Créer des campagnes', 'campaigns', 'create', 'marketing'),
('campaigns.edit.all', 'Modifier toutes les campagnes', 'campaigns', 'edit', 'marketing'),
('campaigns.edit.own', 'Modifier ses propres campagnes', 'campaigns', 'edit', 'marketing'),
('campaigns.delete.all', 'Supprimer toutes les campagnes', 'campaigns', 'delete', 'marketing'),
('campaigns.delete.own', 'Supprimer ses propres campagnes', 'campaigns', 'delete', 'marketing'),
('campaigns.analytics', 'Analytics des campagnes', 'campaigns', 'analytics', 'marketing'),

-- Abonnements et Facturation
('subscriptions.view.all', 'Voir tous les abonnements', 'subscriptions', 'view', 'billing'),
('subscriptions.view.own', 'Voir son propre abonnement', 'subscriptions', 'view', 'billing'),
('subscriptions.manage', 'Gérer les abonnements', 'subscriptions', 'manage', 'billing'),
('billing.view.all', 'Voir toute la facturation', 'billing', 'view', 'billing'),
('billing.view.own', 'Voir sa propre facturation', 'billing', 'view', 'billing'),
('billing.process', 'Traiter la facturation', 'billing', 'process', 'billing'),

-- Configuration avancée
('integrations.api.access', 'Accès aux API externes', 'integrations', 'api', 'configuration'),
('integrations.webhook.manage', 'Gérer les webhooks', 'integrations', 'webhook', 'configuration'),
('automation.create', 'Créer des automatisations', 'automation', 'create', 'configuration'),
('automation.edit', 'Modifier des automatisations', 'automation', 'edit', 'configuration'),
('automation.delete', 'Supprimer des automatisations', 'automation', 'delete', 'configuration'),

-- Analytics
('analytics.view.basic', 'Vue basique analytics', 'analytics', 'view', 'analytics'),
('analytics.view.advanced', 'Vue avancée analytics', 'analytics', 'view', 'analytics'),
('analytics.export', 'Exporter les analytics', 'analytics', 'export', 'analytics'),

-- Administration plateforme
('platform.admin', 'Administration complète', 'platform', 'admin', 'administration'),
('platform.logs', 'Voir les logs système', 'platform', 'logs', 'administration'),
('platform.config', 'Configurer la plateforme', 'platform', 'config', 'administration')

ON CONFLICT (name) DO NOTHING;

-- Créer les rôles s'ils n'existent pas
INSERT INTO public.roles (name, display_name, description) VALUES
('super_admin', 'Super Administrateur', 'Accès complet à toute la plateforme'),
('admin', 'Administrateur', 'Gestion complète de la plateforme'),
('manager', 'Manager', 'Gestion d''équipe et opérations'),
('marketing', 'Marketing', 'Gestion des campagnes et prospects'),
('sales', 'Commercial', 'Gestion des prospects et ventes'),
('support', 'Support', 'Support client et assistance'),
('user', 'Utilisateur', 'Utilisateur standard'),
('demo', 'Démo', 'Compte de démonstration')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- Assigner les permissions aux rôles
-- Super Admin: Toutes les permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.detailed_permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Admin: Presque toutes les permissions sauf super_admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.detailed_permissions p
WHERE r.name = 'admin'
  AND p.name NOT LIKE 'platform.%'
ON CONFLICT DO NOTHING;

-- Manager: Gestion d'équipe et opérations
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.detailed_permissions p
WHERE r.name = 'manager'
  AND p.name IN (
    'users.view', 'users.edit.own',
    'bots.view.all', 'bots.edit.own', 'bots.create', 'bots.analytics.view',
    'prospects.view.all', 'prospects.edit.all', 'prospects.create', 'prospects.qualify',
    'campaigns.view.all', 'campaigns.edit.own', 'campaigns.create',
    'analytics.view.advanced',
    'automation.create', 'automation.edit'
  )
ON CONFLICT DO NOTHING;

-- Marketing: Campagnes et prospects
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.detailed_permissions p
WHERE r.name = 'marketing'
  AND p.name IN (
    'users.view.own', 'users.edit.own',
    'bots.view.own', 'bots.edit.own', 'bots.create',
    'prospects.view.all', 'prospects.edit.own', 'prospects.create', 'prospects.export', 'prospects.import',
    'campaigns.view.own', 'campaigns.edit.own', 'campaigns.create', 'campaigns.analytics',
    'analytics.view.basic',
    'sheets.view', 'sheets.connect', 'sheets.sync'
  )
ON CONFLICT DO NOTHING;

-- Sales: Prospects et CRM
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.detailed_permissions p
WHERE r.name = 'sales'
  AND p.name IN (
    'users.view.own', 'users.edit.own',
    'bots.view.own', 'bots.edit.own',
    'prospects.view.own', 'prospects.edit.own', 'prospects.create', 'prospects.qualify',
    'campaigns.view.own',
    'analytics.view.basic',
    'subscriptions.view.own'
  )
ON CONFLICT DO NOTHING;

-- Support: Assistance client
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.detailed_permissions p
WHERE r.name = 'support'
  AND p.name IN (
    'users.view', 'users.edit.own',
    'bots.view.all', 'bots.analytics.view',
    'prospects.view.all',
    'whatsapp.view', 'whatsapp.diagnostic',
    'analytics.view.basic'
  )
ON CONFLICT DO NOTHING;

-- User: Utilisateur standard
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.detailed_permissions p
WHERE r.name = 'user'
  AND p.name IN (
    'users.view.own', 'users.edit.own',
    'bots.view.own', 'bots.edit.own', 'bots.create',
    'prospects.view.own', 'prospects.edit.own', 'prospects.create',
    'campaigns.view.own', 'campaigns.edit.own', 'campaigns.create',
    'subscriptions.view.own',
    'analytics.view.basic'
  )
ON CONFLICT DO NOTHING;

-- Demo: Accès lecture seule
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.detailed_permissions p
WHERE r.name = 'demo'
  AND p.name IN (
    'users.view.own',
    'bots.view.own',
    'prospects.view.own',
    'campaigns.view.own',
    'analytics.view.basic'
  )
ON CONFLICT DO NOTHING;

-- Créer une fonction helper pour vérifier plusieurs permissions
CREATE OR REPLACE FUNCTION public.user_has_any_permission(
  user_uuid uuid,
  permission_names text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.detailed_permissions dp ON rp.permission_id = dp.id
    WHERE ur.user_id = user_uuid 
      AND dp.name = ANY(permission_names)
    
    UNION
    
    SELECT 1 FROM public.user_permissions up
    JOIN public.detailed_permissions dp ON up.permission_id = dp.id
    WHERE up.user_id = user_uuid 
      AND dp.name = ANY(permission_names)
      AND (up.expires_at IS NULL OR up.expires_at > now())
  );
$$;

-- Créer une vue pour faciliter les requêtes de permissions
CREATE OR REPLACE VIEW public.user_permission_details AS
SELECT 
  ur.user_id,
  dp.name as permission_name,
  dp.description as permission_description,
  dp.resource,
  dp.action,
  dp.category,
  r.name as role_name,
  'role' as source
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.detailed_permissions dp ON rp.permission_id = dp.id

UNION ALL

SELECT 
  up.user_id,
  dp.name as permission_name,
  dp.description as permission_description,
  dp.resource,
  dp.action,
  dp.category,
  NULL as role_name,
  'direct' as source
FROM public.user_permissions up
JOIN public.detailed_permissions dp ON up.permission_id = dp.id
WHERE up.expires_at IS NULL OR up.expires_at > now();