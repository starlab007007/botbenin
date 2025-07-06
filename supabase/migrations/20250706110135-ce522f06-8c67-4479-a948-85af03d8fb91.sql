
-- Insertion d'un rôle admin si il n'existe pas déjà
INSERT INTO public.roles (name, description)
VALUES ('admin', 'Administrateur avec accès complet à la plateforme')
ON CONFLICT (name) DO NOTHING;

-- Insertion des permissions détaillées pour l'admin (seulement si elles n'existent pas)
INSERT INTO public.detailed_permissions (name, category, resource, action, description) VALUES
  ('platform.admin', 'platform', 'platform', 'manage', 'Accès administrateur complet'),
  ('users.manage', 'users', 'users', 'manage', 'Gestion complète des utilisateurs'),
  ('users.edit', 'users', 'users', 'edit', 'Modification des utilisateurs'),
  ('platform.logs', 'platform', 'logs', 'view', 'Consultation des logs système'),
  ('bots.manage_all', 'bots', 'bots', 'manage', 'Gestion de tous les bots'),
  ('campaigns.manage_all', 'campaigns', 'campaigns', 'manage', 'Gestion de toutes les campagnes')
ON CONFLICT (name) DO NOTHING;

-- Attribution des permissions au rôle admin (seulement si pas déjà attribuées)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, dp.id
FROM public.roles r
CROSS JOIN public.detailed_permissions dp
WHERE r.name = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = dp.id
  );

-- Fonction pour assigner le rôle admin à un utilisateur existant
CREATE OR REPLACE FUNCTION public.assign_admin_role(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  admin_role_id uuid;
  result_message text;
BEGIN
  -- Trouver l'utilisateur par email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'Utilisateur non trouvé avec cet email: ' || user_email;
  END IF;
  
  -- Trouver le rôle admin
  SELECT id INTO admin_role_id
  FROM public.roles
  WHERE name = 'admin';
  
  IF admin_role_id IS NULL THEN
    RETURN 'Rôle admin non trouvé';
  END IF;
  
  -- Vérifier si l'utilisateur a déjà le rôle admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id AND role_id = admin_role_id
  ) THEN
    RETURN 'L''utilisateur ' || user_email || ' a déjà le rôle admin';
  END IF;
  
  -- Assigner le rôle admin
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (target_user_id, admin_role_id);
  
  -- Créer ou mettre à jour le bot_owner avec des privilèges élevés
  INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
  VALUES (target_user_id, 'admin', 999)
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_plan = 'admin',
    max_bots = 999;
  
  RETURN 'Rôle admin assigné avec succès à ' || user_email;
END;
$$;

-- Mettre à jour les permissions dans le UserContext (ajouter les nouvelles permissions admin)
UPDATE public.roles 
SET description = 'Administrateur avec accès complet à la plateforme'
WHERE name = 'admin' AND description != 'Administrateur avec accès complet à la plateforme';
