-- Fonction pour assigner le rôle admin à un utilisateur par email
CREATE OR REPLACE FUNCTION public.assign_admin_role(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    admin_role_id uuid;
    existing_role_id uuid;
BEGIN
    -- Vérifier que l'utilisateur appelant est admin
    IF NOT public.is_admin(auth.uid()) THEN
        RETURN 'Erreur: Seuls les administrateurs peuvent assigner des rôles admin';
    END IF;
    
    -- Récupérer l'ID de l'utilisateur cible par email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN 'Erreur: Utilisateur non trouvé avec l''email ' || user_email;
    END IF;
    
    -- Récupérer l'ID du rôle admin
    SELECT id INTO admin_role_id 
    FROM public.roles 
    WHERE name = 'admin';
    
    IF admin_role_id IS NULL THEN
        RETURN 'Erreur: Rôle admin non trouvé dans le système';
    END IF;
    
    -- Vérifier si l'utilisateur a déjà un rôle
    SELECT role_id INTO existing_role_id
    FROM public.user_roles 
    WHERE user_id = target_user_id;
    
    IF existing_role_id IS NOT NULL THEN
        -- Mettre à jour le rôle existant
        UPDATE public.user_roles 
        SET role_id = admin_role_id, updated_at = NOW()
        WHERE user_id = target_user_id;
        
        RETURN 'Succès: Rôle admin assigné à ' || user_email || ' (rôle précédent mis à jour)';
    ELSE
        -- Créer un nouveau rôle
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (target_user_id, admin_role_id);
        
        RETURN 'Succès: Rôle admin assigné à ' || user_email || ' (nouveau rôle créé)';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'Erreur: ' || SQLERRM;
END;
$$;;
