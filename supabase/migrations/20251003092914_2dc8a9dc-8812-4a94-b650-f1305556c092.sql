-- Supprimer les anciennes politiques RLS sur la table users si elles existent
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Activer RLS sur la table users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique pour que les admins puissent voir tous les utilisateurs
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  USING (
    user_has_permission(auth.uid(), 'users.view')
  );

-- Politique pour que les admins puissent modifier tous les utilisateurs
CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE
  USING (
    user_has_permission(auth.uid(), 'users.edit')
  );

-- Politique pour que les admins puissent insérer des utilisateurs
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT
  WITH CHECK (
    user_has_permission(auth.uid(), 'users.edit')
  );

-- Politique pour que les utilisateurs puissent voir leur propre profil
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
  );

-- Politique pour que les utilisateurs puissent modifier leur propre profil
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id
  );

-- S'assurer que la colonne status existe avec les bonnes valeurs par défaut
ALTER TABLE public.users 
  ALTER COLUMN status SET DEFAULT 'active';

-- Ajouter un index sur le status pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);