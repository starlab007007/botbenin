-- Migration de correction: Permissions user_roles et ajustement RLS (CORRIGÉE)
-- Objectif: Permettre aux admins de gérer les rôles utilisateurs

-- 1. Créer les permissions manquantes pour la gestion des rôles
INSERT INTO public.detailed_permissions (name, description, category, resource, action)
VALUES 
  ('users.roles.view', 'Voir les rôles des utilisateurs', 'users', 'user_roles', 'read'),
  ('users.roles.assign', 'Attribuer et retirer des rôles', 'users', 'user_roles', 'write')
ON CONFLICT (name) DO UPDATE 
  SET description = EXCLUDED.description,
      category = EXCLUDED.category,
      resource = EXCLUDED.resource,
      action = EXCLUDED.action;

-- 2. Attribuer ces permissions au rôle admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id, 
  dp.id
FROM public.roles r
CROSS JOIN public.detailed_permissions dp
WHERE r.name = 'admin'
  AND dp.name IN ('users.roles.view', 'users.roles.assign')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Améliorer les politiques RLS user_roles pour permettre aussi aux super_admin
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;

CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT
  WITH CHECK (
    user_has_permission(auth.uid(), 'users.roles.assign')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE
  USING (
    user_has_permission(auth.uid(), 'users.roles.assign')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE
  USING (
    user_has_permission(auth.uid(), 'users.roles.assign')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
  );

-- 4. Ajouter une politique pour permettre la vue étendue des rôles
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'users.roles.view')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
  );