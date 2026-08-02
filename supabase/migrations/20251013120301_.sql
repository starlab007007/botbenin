-- Fonction pour créer automatiquement un rôle utilisateur lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
  owner_id uuid;
BEGIN
  -- Récupérer l'ID du rôle 'user' par défaut
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE name = 'user'
  LIMIT 1;

  -- Si le rôle n'existe pas dans user_roles, l'ajouter
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id);
  END IF;

  -- Créer un bot_owner pour l'utilisateur s'il n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM public.bot_owners 
    WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
    VALUES (NEW.id, 'free', 5);
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Créer le trigger pour assigner automatiquement un rôle aux nouveaux utilisateurs
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();;
