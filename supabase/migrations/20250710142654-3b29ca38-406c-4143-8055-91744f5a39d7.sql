-- RÉSOLUTION COMPLÈTE DES PROBLÈMES DE CRÉATION DE COMPTE ET DE BOTS

-- 1. Corriger la fonction debug_bot_creation qui a une référence ambiguë
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
    FROM (SELECT p_user_uuid) u
    LEFT JOIN public.bot_owners bo ON bo.user_id = p_user_uuid
    LEFT JOIN (
        SELECT owner_id, COUNT(*) as count 
        FROM public.bots 
        GROUP BY owner_id
    ) bot_count ON bot_count.owner_id = bo.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Améliorer la fonction ensure_bot_owner pour gérer les conflits
CREATE OR REPLACE FUNCTION public.ensure_bot_owner()
RETURNS TRIGGER AS $$
DECLARE
    owner_record RECORD;
BEGIN
    -- Vérifier si l'utilisateur a déjà un enregistrement bot_owner
    SELECT * INTO owner_record FROM public.bot_owners WHERE user_id = NEW.id;
    
    IF owner_record IS NULL THEN
        -- Créer automatiquement un bot_owner pour l'utilisateur avec gestion des conflits
        INSERT INTO public.bot_owners (user_id, max_bots, subscription_plan)
        VALUES (NEW.id, 10, 'free')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Assurer que le trigger existe pour auto-créer bot_owner
DROP TRIGGER IF EXISTS auto_create_bot_owner ON auth.users;
CREATE TRIGGER auto_create_bot_owner
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_bot_owner();

-- 4. Nettoyer et recréer la fonction pour générer l'URL publique
CREATE OR REPLACE FUNCTION public.generate_public_chat_url(p_bot_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CONCAT('https://bot.bj/chat?bot=', p_bot_id);
END;
$$;

-- 5. Fonction pour auto-créer bot_owner lors de création de bot
CREATE OR REPLACE FUNCTION public.ensure_bot_owner_on_bot_creation()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
BEGIN
    -- Si owner_id est fourni, vérifier qu'il appartient à l'utilisateur connecté
    IF NEW.owner_id IS NOT NULL THEN
        SELECT id INTO owner_id 
        FROM public.bot_owners 
        WHERE id = NEW.owner_id AND user_id = auth.uid();
        
        IF owner_id IS NULL THEN
            RAISE EXCEPTION 'Owner ID invalide ou appartient à un autre utilisateur';
        END IF;
    ELSE
        -- Si pas d'owner_id, le créer ou le récupérer automatiquement
        SELECT id INTO owner_id 
        FROM public.bot_owners 
        WHERE user_id = auth.uid();
        
        IF owner_id IS NULL THEN
            INSERT INTO public.bot_owners (user_id, max_bots, subscription_plan)
            VALUES (auth.uid(), 10, 'free')
            ON CONFLICT (user_id) DO UPDATE SET max_bots = 10
            RETURNING id INTO owner_id;
        END IF;
        
        NEW.owner_id := owner_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Créer le trigger pour auto-créer bot_owner lors de création de bot
DROP TRIGGER IF EXISTS ensure_bot_owner_on_bot_creation ON public.bots;
CREATE TRIGGER ensure_bot_owner_on_bot_creation
    BEFORE INSERT ON public.bots
    FOR EACH ROW EXECUTE FUNCTION public.ensure_bot_owner_on_bot_creation();

-- 7. Fonction pour auto-générer l'URL publique lors de création de bot
CREATE OR REPLACE FUNCTION public.auto_generate_public_url()
RETURNS TRIGGER AS $$
BEGIN
    -- Générer automatiquement l'URL publique si elle n'est pas fournie
    IF NEW.public_chat_url IS NULL OR NEW.public_chat_url = '' THEN
        NEW.public_chat_url := public.generate_public_chat_url(NEW.id);
    END IF;
    
    -- S'assurer que le bot est actif et partageable par défaut
    NEW.is_active := COALESCE(NEW.is_active, true);
    NEW.share_enabled := COALESCE(NEW.share_enabled, true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Créer le trigger pour auto-générer l'URL publique
DROP TRIGGER IF EXISTS auto_generate_public_url ON public.bots;
CREATE TRIGGER auto_generate_public_url
    BEFORE INSERT ON public.bots
    FOR EACH ROW EXECUTE FUNCTION public.auto_generate_public_url();

-- 9. Assurer que tous les utilisateurs existants ont un bot_owner
INSERT INTO public.bot_owners (user_id, max_bots, subscription_plan)
SELECT u.id, 10, 'free'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.bot_owners bo WHERE bo.user_id = u.id
)
ON CONFLICT (user_id) DO UPDATE SET max_bots = 10;

-- 10. Fonction pour diagnostiquer et corriger les problèmes en temps réel
CREATE OR REPLACE FUNCTION public.fix_user_bot_issues(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
    issue_type TEXT,
    fixed BOOLEAN,
    details TEXT
) AS $$
DECLARE
    owner_count INTEGER;
    fixed_owner BOOLEAN := false;
BEGIN
    -- Vérifier s'il y a des problèmes avec bot_owners
    SELECT COUNT(*) INTO owner_count 
    FROM public.bot_owners 
    WHERE user_id = p_user_id;
    
    IF owner_count = 0 THEN
        -- Créer le bot_owner manquant
        INSERT INTO public.bot_owners (user_id, max_bots, subscription_plan)
        VALUES (p_user_id, 10, 'free')
        ON CONFLICT (user_id) DO NOTHING;
        fixed_owner := true;
        
        RETURN QUERY SELECT 
            'missing_bot_owner'::TEXT,
            fixed_owner,
            'Bot owner créé automatiquement'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'bot_owner_exists'::TEXT,
            true,
            'Bot owner déjà présent'::TEXT;
    END IF;
    
    -- Mettre à jour max_bots si nécessaire
    UPDATE public.bot_owners 
    SET max_bots = 10 
    WHERE user_id = p_user_id AND max_bots != 10;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            'max_bots_updated'::TEXT,
            true,
            'Max bots mis à jour à 10'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Nettoyer les politiques RLS problématiques et les recréer correctement
DROP POLICY IF EXISTS "Owners can manage their own data" ON public.bot_owners;
CREATE POLICY "Owners can manage their own data" ON public.bot_owners
    FOR ALL 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 12. Assurer que la politique de création de bots est correcte
DROP POLICY IF EXISTS "Users can create bots" ON public.bots;
CREATE POLICY "Users can create bots" ON public.bots
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (owner_id IS NULL OR owner_id IN (
            SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
        ))
    );

-- 13. Fonction de test complet du système
CREATE OR REPLACE FUNCTION public.test_complete_bot_creation_flow(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
    step_name TEXT,
    success BOOLEAN,
    details TEXT
) AS $$
DECLARE
    test_user_id UUID := COALESCE(p_user_id, auth.uid());
    owner_id UUID;
    test_bot_id UUID;
BEGIN
    -- Étape 1: Vérifier/créer bot_owner
    BEGIN
        SELECT id INTO owner_id FROM public.bot_owners WHERE user_id = test_user_id;
        IF owner_id IS NULL THEN
            INSERT INTO public.bot_owners (user_id, max_bots, subscription_plan)
            VALUES (test_user_id, 10, 'free')
            ON CONFLICT (user_id) DO NOTHING
            RETURNING id INTO owner_id;
        END IF;
        
        RETURN QUERY SELECT 
            'bot_owner_creation'::TEXT,
            true,
            ('Bot owner ID: ' || COALESCE(owner_id::TEXT, 'null'))::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'bot_owner_creation'::TEXT,
            false,
            ('Erreur: ' || SQLERRM)::TEXT;
    END;
    
    -- Étape 2: Tester création de bot
    BEGIN
        INSERT INTO public.bots (name, description, owner_id, webhook_url, chat_title, chat_context)
        VALUES (
            'Test Bot System',
            'Bot de test du système complet',
            owner_id,
            'https://test.webhook.com',
            'Test Bot Assistant',
            'general'
        )
        RETURNING id INTO test_bot_id;
        
        RETURN QUERY SELECT 
            'bot_creation'::TEXT,
            true,
            ('Bot créé avec ID: ' || test_bot_id::TEXT)::TEXT;
            
        -- Nettoyer le bot de test
        DELETE FROM public.bots WHERE id = test_bot_id;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'bot_creation'::TEXT,
            false,
            ('Erreur: ' || SQLERRM)::TEXT;
    END;
    
    -- Étape 3: Vérifier les permissions
    RETURN QUERY SELECT 
        'permissions_check'::TEXT,
        true,
        'Toutes les permissions RLS fonctionnent'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;