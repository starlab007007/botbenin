
-- Vérifier s'il existe déjà un compte admin
DO $$
DECLARE
  admin_exists boolean;
  admin_email text := 'admin@bot.bj';
  admin_password text := 'AdminBot2024!';
  result_message text;
BEGIN
  -- Vérifier s'il y a déjà des utilisateurs avec le rôle admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE r.name = 'admin'
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE 'Un ou plusieurs comptes admin existent déjà dans le système.';
    
    -- Afficher les comptes admin existants
    FOR result_message IN 
      SELECT 'Admin trouvé: ' || COALESCE(au.email, 'Email inconnu') || ' (ID: ' || ur.user_id || ')'
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      LEFT JOIN auth.users au ON ur.user_id = au.id
      WHERE r.name = 'admin'
    LOOP
      RAISE NOTICE '%', result_message;
    END LOOP;
  ELSE
    RAISE NOTICE 'Aucun compte admin trouvé. Préparation pour la création...';
    
    -- Vérifier si l'utilisateur admin@bot.bj existe déjà
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
      RAISE NOTICE 'L''utilisateur % existe déjà. Attribution du rôle admin...', admin_email;
      
      -- Attribuer le rôle admin à l'utilisateur existant
      SELECT public.assign_admin_role(admin_email) INTO result_message;
      RAISE NOTICE 'Résultat: %', result_message;
    ELSE
      RAISE NOTICE 'L''utilisateur % n''existe pas encore.', admin_email;
      RAISE NOTICE 'Veuillez d''abord créer un compte avec cet email, puis exécutez:';
      RAISE NOTICE 'SELECT public.assign_admin_role(''%'');', admin_email;
    END IF;
  END IF;
END $$;

-- Fonction utilitaire pour lister tous les admins
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role_assigned_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ur.user_id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    ur.created_at as role_assigned_at
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  LEFT JOIN auth.users au ON ur.user_id = au.id
  WHERE r.name = 'admin'
  ORDER BY ur.created_at DESC;
$$;

-- Exécuter la fonction pour voir les admins actuels
SELECT * FROM public.list_admin_users();
