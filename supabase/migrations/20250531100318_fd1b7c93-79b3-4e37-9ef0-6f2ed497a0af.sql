
-- Modifier la table users pour supporter l'authentification Google
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS google_id TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Créer un index unique sur google_id
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON public.users(google_id) WHERE google_id IS NOT NULL;

-- Mettre à jour la fonction handle_new_user pour supporter Google
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
        -- Créer l'utilisateur dans la table publique
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
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
            auth_provider_val,
            google_id_val,
            email_verified_val,
            NOW(), 
            NOW(), 
            'free', 
            NOW()
        );
        
        -- Créer les paramètres utilisateur par défaut
        INSERT INTO public.user_settings (user_id, language, timezone)
        VALUES (NEW.id, 'fr', 'UTC');
        
        -- Assigner le rôle utilisateur par défaut
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, (SELECT id FROM public.roles WHERE name = 'user'));
        
        -- Donner accès aux modules gratuits
        INSERT INTO public.user_module_access (user_id, module_id, access_level)
        SELECT NEW.id, id, 'read' FROM public.modules WHERE required_subscription_tier = 'free';
        
        RETURN NEW;
    END;
END;
$$;
;
