
-- Assigner le rôle admin à votre compte utilisateur
-- Cette requête ne modifie rien de l'existant, elle ajoute seulement l'assignation de rôle

DO $$
DECLARE
    admin_role_id UUID;
    current_user_id UUID;
BEGIN
    -- Récupérer l'ID du rôle admin existant
    SELECT id INTO admin_role_id 
    FROM public.roles 
    WHERE name = 'admin' 
    LIMIT 1;
    
    -- Récupérer l'ID de l'utilisateur actuellement connecté
    SELECT auth.uid() INTO current_user_id;
    
    -- Vérifier que les deux existent
    IF admin_role_id IS NOT NULL AND current_user_id IS NOT NULL THEN
        -- Insérer l'assignation seulement si elle n'existe pas déjà
        INSERT INTO public.user_roles (user_id, role_id)
        SELECT current_user_id, admin_role_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = current_user_id AND role_id = admin_role_id
        );
        
        RAISE NOTICE 'Rôle admin assigné à l''utilisateur %', current_user_id;
    ELSE
        RAISE NOTICE 'Impossible d''assigner le rôle - rôle admin: %, utilisateur: %', admin_role_id, current_user_id;
    END IF;
END $$;
