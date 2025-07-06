-- Assigner le rôle admin au premier utilisateur du système
DO $$
DECLARE
    target_user_id uuid;
    admin_role_id uuid;
BEGIN
    -- Récupérer l'ID de l'utilisateur depuis auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'zimesongbian007@gmail.com';
    
    -- Récupérer l'ID du rôle admin
    SELECT id INTO admin_role_id 
    FROM public.roles 
    WHERE name = 'admin';
    
    IF target_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        -- Créer l'utilisateur dans la table publique si nécessaire
        INSERT INTO public.users (
            id, 
            email, 
            full_name, 
            created_at, 
            updated_at, 
            subscription_tier, 
            last_login
        )
        VALUES (
            target_user_id, 
            'zimesongbian007@gmail.com', 
            'SONGBIAN ZIME',
            NOW(), 
            NOW(), 
            'free', 
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            updated_at = NOW();
        
        -- Assigner le rôle admin
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (target_user_id, admin_role_id)
        ON CONFLICT (user_id) DO UPDATE SET 
            role_id = admin_role_id;
        
        -- Log de l'action
        PERFORM public.log_user_activity(
            target_user_id, 
            'admin_role_assigned', 
            'Rôle administrateur assigné manuellement',
            jsonb_build_object('email', 'zimesongbian007@gmail.com', 'method', 'system_init')
        );
        
        RAISE NOTICE 'Utilisateur % configuré comme administrateur avec succès', 'zimesongbian007@gmail.com';
    ELSE
        RAISE NOTICE 'Utilisateur non trouvé ou rôle admin inexistant';
    END IF;
END $$;