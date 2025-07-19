-- Correction complète du système d'inscription
-- Résolution des problèmes identifiés avec la table user_profiles et les triggers

-- 1. Ajouter la contrainte unique manquante sur user_profiles
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- 2. Vérifier et corriger la fonction create_complete_user_profile
CREATE OR REPLACE FUNCTION public.create_complete_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer le profil utilisateur avec gestion des conflits
  INSERT INTO public.user_profiles (user_id, preferences)
  VALUES (NEW.id, '{"notifications": true, "language": "fr", "timezone": "UTC"}')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Créer ou récupérer le bot_owner de manière sécurisée
  PERFORM public.get_or_create_bot_owner(NEW.id);
  
  -- Enregistrer l'activité de création de compte (si la table existe)
  BEGIN
    PERFORM public.log_user_activity(
      NEW.id, 
      'account_created', 
      'Nouveau compte créé',
      jsonb_build_object('email', NEW.email, 'method', 'signup')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer si log_user_activity n'existe pas
    NULL;
  END;
  
  RETURN NEW;
END;
$$;

-- 3. S'assurer que le trigger est bien configuré
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_complete_user_profile();

-- 4. Tester la fonction de manière sécurisée
DO $$
DECLARE
  existing_user_id uuid;
BEGIN
  -- Prendre un utilisateur existant pour tester
  SELECT user_id INTO existing_user_id FROM public.user_profiles LIMIT 1;
  
  IF existing_user_id IS NOT NULL THEN
    -- Tester que get_or_create_bot_owner fonctionne
    PERFORM public.get_or_create_bot_owner(existing_user_id);
    RAISE NOTICE 'Test de la fonction get_or_create_bot_owner: OK';
  END IF;
END;
$$;