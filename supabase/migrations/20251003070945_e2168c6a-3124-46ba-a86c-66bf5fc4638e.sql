-- Phase 1.1: Assigner toutes les permissions au rôle admin (table PERMISSIONS, pas detailed_permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM public.roles WHERE name = 'admin'),
  id
FROM public.permissions
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = (SELECT id FROM public.roles WHERE name = 'admin')
  AND rp.permission_id = public.permissions.id
);

-- Phase 1.2: Créer le profil Super Admin (promouvoir bot.bjdata@gmail.com)
INSERT INTO public.user_roles (user_id, role_id)
VALUES (
  'e77fb807-e70e-40a4-8fdf-9050b6f5cab4',
  (SELECT id FROM public.roles WHERE name = 'admin')
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Supprimer l'ancien rôle 'user' pour cet utilisateur
DELETE FROM public.user_roles 
WHERE user_id = 'e77fb807-e70e-40a4-8fdf-9050b6f5cab4' 
AND role_id = (SELECT id FROM public.roles WHERE name = 'user');

-- Phase 1.3: Créer la fonction has_role (SECURITY DEFINER pour éviter la récursivité RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name = _role_name
  )
$$;

-- Phase 1.4: Activer RLS sur user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Politique: Les admins peuvent tout voir
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Politique: Les utilisateurs peuvent voir leur propre rôle
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politique: Seuls les admins peuvent modifier les rôles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Phase 1.5: Protéger la table bots avec RLS admin
DROP POLICY IF EXISTS "Admins can view all bots" ON public.bots;
CREATE POLICY "Admins can view all bots"
ON public.bots FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  owner_id IN (SELECT id FROM public.bot_owners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage all bots" ON public.bots;
CREATE POLICY "Admins can manage all bots"
ON public.bots FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  owner_id IN (SELECT id FROM public.bot_owners WHERE user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  owner_id IN (SELECT id FROM public.bot_owners WHERE user_id = auth.uid())
);

-- Phase 1.6: Protéger la table campaigns avec RLS admin
DROP POLICY IF EXISTS "Admins can manage all campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage all campaigns"
ON public.campaigns FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());