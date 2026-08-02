-- Fonction pour attribuer automatiquement le rôle 'user' aux nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_id uuid;
BEGIN
  -- Récupérer l'ID du rôle 'user'
  SELECT id INTO user_role_id
  FROM public.roles
  WHERE name = 'user'
  LIMIT 1;

  -- Si le rôle 'user' existe, l'attribuer au nouvel utilisateur
  IF user_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, user_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- Créer le trigger qui s'exécute après chaque inscription
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();;
