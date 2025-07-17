-- Migration additive pour corriger le problème de contrainte unique bot_owners_user_id_unique
-- Cette migration permet d'éviter les erreurs lors de l'inscription d'utilisateurs

-- Créer une fonction pour gérer la création ou récupération d'un bot_owner
CREATE OR REPLACE FUNCTION public.get_or_create_bot_owner(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id uuid;
BEGIN
  -- Essayer de récupérer un bot_owner existant
  SELECT id INTO owner_id
  FROM public.bot_owners
  WHERE user_id = user_uuid;
  
  -- Si pas trouvé, créer un nouveau bot_owner
  IF owner_id IS NULL THEN
    INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
    VALUES (user_uuid, 'free', 5)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO owner_id;
    
    -- Si l'insertion a échoué à cause d'un conflit, récupérer l'ID existant
    IF owner_id IS NULL THEN
      SELECT id INTO owner_id
      FROM public.bot_owners
      WHERE user_id = user_uuid;
    END IF;
  END IF;
  
  RETURN owner_id;
END;
$$;

-- Modifier le trigger de création de profil utilisateur pour utiliser la nouvelle fonction
CREATE OR REPLACE FUNCTION public.create_complete_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.user_profiles (user_id, preferences)
  VALUES (NEW.id, '{"notifications": true, "language": "fr", "timezone": "UTC"}')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Créer ou récupérer le bot_owner de manière sécurisée
  PERFORM public.get_or_create_bot_owner(NEW.id);
  
  -- Enregistrer l'activité de création de compte
  PERFORM public.log_user_activity(
    NEW.id, 
    'account_created', 
    'Nouveau compte créé',
    jsonb_build_object('email', NEW.email, 'method', 'signup')
  );
  
  RETURN NEW;
END;
$$;