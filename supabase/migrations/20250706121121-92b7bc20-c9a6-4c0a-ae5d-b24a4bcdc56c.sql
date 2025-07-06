-- Créer un trigger pour gérer automatiquement la création des profils utilisateur
-- après la confirmation de l'email

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mettre à jour la fonction handle_new_user pour mieux gérer les cas d'erreur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Déterminer le provider d'authentification
    DECLARE
        auth_provider_val TEXT := COALESCE(NEW.raw_user_meta_data->>'provider', 'email');
        google_id_val TEXT := NEW.raw_user_meta_data->>'sub';
        email_verified_val BOOLEAN := COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, false);
    BEGIN
        -- Créer l'utilisateur dans la table publique seulement s'il n'existe pas déjà
        INSERT INTO public.users (
            id, 
            email, 
            full_name, 
            auth_provider,
            google_id,
            email_verified,
            created_at, 
            updated_at, 
            subscription_tier, 
            last_login
        )
        VALUES (
            NEW.id, 
            NEW.email, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Nouvel Utilisateur'),
            auth_provider_val,
            google_id_val,
            email_verified_val,
            NOW(), 
            NOW(), 
            'free', 
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Créer les paramètres utilisateur par défaut
        INSERT INTO public.user_settings (user_id, language, timezone)
        VALUES (NEW.id, 'fr', 'UTC')
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Assigner le rôle utilisateur par défaut
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, (SELECT id FROM public.roles WHERE name = 'user'))
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Donner accès aux modules gratuits
        INSERT INTO public.user_module_access (user_id, module_id, access_level)
        SELECT NEW.id, id, 'read' FROM public.modules WHERE required_subscription_tier = 'free'
        ON CONFLICT (user_id, module_id) DO NOTHING;
        
        -- Créer un bot_owner pour l'utilisateur
        INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
        VALUES (NEW.id, 'free', 1)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Log l'activité de création de compte
        PERFORM public.log_user_activity(
            NEW.id, 
            'account_created', 
            'Nouveau compte créé et confirmé',
            jsonb_build_object('email', NEW.email, 'method', 'signup', 'provider', auth_provider_val)
        );
        
        RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
        -- En cas d'erreur, log l'erreur mais ne pas faire échouer la création du compte
        RAISE WARNING 'Erreur lors de la création du profil utilisateur pour %: %', NEW.email, SQLERRM;
        RETURN NEW;
    END;
END;
$$;