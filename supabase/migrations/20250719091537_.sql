-- Correction complète avec nettoyage des données orphelines

-- 1. Ajouter la contrainte unique manquante sur user_profiles (si elle n'existe pas déjà)
DO $$
BEGIN
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
EXCEPTION
    WHEN duplicate_object THEN
        -- La contrainte existe déjà, ne rien faire
        NULL;
END;
$$;

-- 2. Nettoyer les user_profiles orphelins (qui n'ont pas d'utilisateur correspondant dans auth.users)
-- ATTENTION: Ceci supprime les profils sans utilisateur auth correspondant
DELETE FROM public.user_profiles 
WHERE user_id NOT IN (
    SELECT id FROM auth.users
);

-- 3. Nettoyer les bot_owners orphelins également
DELETE FROM public.bot_owners 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (
    SELECT id FROM auth.users
);

-- 4. Vérifier et corriger la fonction create_complete_user_profile
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

-- 5. S'assurer que le trigger est bien configuré
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_complete_user_profile();;
