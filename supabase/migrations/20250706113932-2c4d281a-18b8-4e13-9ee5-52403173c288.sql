-- Créer le compte admin de test s'il n'existe pas déjà
DO $$
DECLARE
    test_admin_id uuid;
    admin_role_id uuid;
BEGIN
    -- Récupérer l'ID du rôle admin
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
    
    -- Vérifier si le compte admin@bot.bj existe déjà
    SELECT id INTO test_admin_id FROM auth.users WHERE email = 'admin@bot.bj';
    
    IF test_admin_id IS NOT NULL THEN
        -- Si l'utilisateur existe, s'assurer qu'il a le rôle admin
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (test_admin_id, admin_role_id)
        ON CONFLICT (user_id) DO UPDATE SET role_id = admin_role_id;
        
        RAISE NOTICE 'Compte admin@bot.bj déjà existant, rôle admin confirmé';
    ELSE
        RAISE NOTICE 'Le compte admin@bot.bj doit être créé manuellement via l''interface d''inscription';
    END IF;
END $$;