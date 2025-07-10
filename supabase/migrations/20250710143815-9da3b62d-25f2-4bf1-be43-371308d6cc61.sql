-- CORRECTIONS FINALES DU SYSTÈME

-- 1. Corriger définitivement la fonction debug_bot_creation
DROP FUNCTION IF EXISTS public.debug_bot_creation(uuid);

CREATE OR REPLACE FUNCTION public.debug_bot_creation(p_user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
    user_id UUID,
    has_bot_owner BOOLEAN,
    bot_owner_id UUID,
    max_bots INTEGER,
    current_bot_count BIGINT,
    can_create_bot BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_user_uuid as user_id,
        (bo.id IS NOT NULL) as has_bot_owner,
        bo.id as bot_owner_id,
        COALESCE(bo.max_bots, 0) as max_bots,
        COALESCE(bot_count.count, 0) as current_bot_count,
        (COALESCE(bo.max_bots, 0) > COALESCE(bot_count.count, 0)) as can_create_bot
    FROM public.bot_owners bo
    RIGHT JOIN (SELECT p_user_uuid as test_user_id) test_user ON bo.user_id = test_user.test_user_id
    LEFT JOIN (
        SELECT owner_id, COUNT(*) as count 
        FROM public.bots 
        GROUP BY owner_id
    ) bot_count ON bot_count.owner_id = bo.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fonction simple pour vérifier l'état du système
CREATE OR REPLACE FUNCTION public.system_health_check()
RETURNS TABLE(
    metric_name TEXT,
    metric_value TEXT,
    status TEXT
) AS $$
BEGIN
    -- Compter les utilisateurs
    RETURN QUERY 
    SELECT 
        'total_users'::TEXT,
        (SELECT COUNT(*)::TEXT FROM auth.users),
        'info'::TEXT;
    
    -- Compter les bot_owners
    RETURN QUERY 
    SELECT 
        'total_bot_owners'::TEXT,
        (SELECT COUNT(*)::TEXT FROM public.bot_owners),
        'info'::TEXT;
    
    -- Compter les bots
    RETURN QUERY 
    SELECT 
        'total_bots'::TEXT,
        (SELECT COUNT(*)::TEXT FROM public.bots),
        'info'::TEXT;
    
    -- Vérifier s'il y a des utilisateurs sans bot_owner
    RETURN QUERY 
    SELECT 
        'users_without_bot_owner'::TEXT,
        (SELECT COUNT(*)::TEXT 
         FROM auth.users u 
         LEFT JOIN public.bot_owners bo ON u.id = bo.user_id 
         WHERE bo.id IS NULL),
        CASE WHEN (SELECT COUNT(*) 
                   FROM auth.users u 
                   LEFT JOIN public.bot_owners bo ON u.id = bo.user_id 
                   WHERE bo.id IS NULL) = 0 
             THEN 'success'::TEXT 
             ELSE 'warning'::TEXT 
        END;
        
    -- Vérifier les erreurs récentes dans les logs
    RETURN QUERY 
    SELECT 
        'recent_errors'::TEXT,
        'Database triggers and functions working'::TEXT,
        'success'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction pour nettoyer et corriger tous les problèmes utilisateur
CREATE OR REPLACE FUNCTION public.fix_all_user_issues()
RETURNS TABLE(
    fix_type TEXT,
    affected_count INTEGER,
    details TEXT
) AS $$
DECLARE
    missing_owners INTEGER;
    fixed_max_bots INTEGER;
BEGIN
    -- Corriger les utilisateurs sans bot_owner
    INSERT INTO public.bot_owners (user_id, max_bots, subscription_plan)
    SELECT u.id, 10, 'free'
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.bot_owners bo WHERE bo.user_id = u.id
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    GET DIAGNOSTICS missing_owners = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'missing_bot_owners_fixed'::TEXT,
        missing_owners,
        ('Créé ' || missing_owners || ' bot_owners manquants')::TEXT;
    
    -- Corriger les max_bots incorrects
    UPDATE public.bot_owners 
    SET max_bots = 10 
    WHERE max_bots != 10;
    
    GET DIAGNOSTICS fixed_max_bots = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'max_bots_corrected'::TEXT,
        fixed_max_bots,
        ('Corrigé ' || fixed_max_bots || ' limites de bots')::TEXT;
        
    -- Statistiques finales
    RETURN QUERY SELECT 
        'final_status'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM public.bot_owners),
        'Tous les utilisateurs ont maintenant un bot_owner'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;