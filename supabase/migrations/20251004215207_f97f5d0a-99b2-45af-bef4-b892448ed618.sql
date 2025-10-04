-- Fonction pour attribuer automatiquement toutes les permissions WhatsApp à un nouvel utilisateur
CREATE OR REPLACE FUNCTION public.grant_whatsapp_permissions_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  whatsapp_perm RECORD;
  user_role_id uuid;
BEGIN
  -- Attribuer le rôle 'user' par défaut si pas déjà fait
  SELECT id INTO user_role_id FROM public.roles WHERE name = 'user';
  
  IF user_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, user_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Attribuer toutes les permissions WhatsApp directement à l'utilisateur
  FOR whatsapp_perm IN 
    SELECT id, name 
    FROM public.detailed_permissions 
    WHERE resource = 'whatsapp'
  LOOP
    INSERT INTO public.user_permissions (user_id, permission_id)
    VALUES (NEW.id, whatsapp_perm.id)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  END LOOP;

  -- Créer automatiquement un bot_owner pour l'utilisateur
  INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
  VALUES (NEW.id, 'free', 5)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_grant_whatsapp ON auth.users;

CREATE TRIGGER on_auth_user_created_grant_whatsapp
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_whatsapp_permissions_to_new_user();

-- Fonction utilitaire pour attribuer les permissions WhatsApp à un utilisateur existant
CREATE OR REPLACE FUNCTION public.grant_whatsapp_permissions_to_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  whatsapp_perm RECORD;
  user_role_id uuid;
BEGIN
  -- Attribuer le rôle 'user' si pas déjà fait
  SELECT id INTO user_role_id FROM public.roles WHERE name = 'user';
  
  IF user_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (target_user_id, user_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Attribuer toutes les permissions WhatsApp
  FOR whatsapp_perm IN 
    SELECT id, name 
    FROM public.detailed_permissions 
    WHERE resource = 'whatsapp'
  LOOP
    INSERT INTO public.user_permissions (user_id, permission_id)
    VALUES (target_user_id, whatsapp_perm.id)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  END LOOP;

  -- Créer un bot_owner si nécessaire
  INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
  VALUES (target_user_id, 'free', 5)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Appliquer rétroactivement aux utilisateurs existants
DO $$
DECLARE
  existing_user RECORD;
BEGIN
  FOR existing_user IN 
    SELECT id FROM auth.users
  LOOP
    PERFORM public.grant_whatsapp_permissions_to_user(existing_user.id);
  END LOOP;
END $$;