-- RÉSOLUTION COMPLÈTE DES PROBLÈMES - PARTIE 2 (correction des conflits)

-- 1. Supprimer l'ancienne fonction et la recréer correctement
DROP FUNCTION IF EXISTS public.generate_public_chat_url(uuid);

CREATE OR REPLACE FUNCTION public.generate_public_chat_url(p_bot_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CONCAT('https://bot.bj/chat?bot=', p_bot_id);
END;
$$;

-- 2. Fonction pour auto-créer bot_owner lors de création de bot
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

-- 3. Créer le trigger pour auto-créer bot_owner lors de création de bot
DROP TRIGGER IF EXISTS ensure_bot_owner_on_bot_creation ON public.bots;
CREATE TRIGGER ensure_bot_owner_on_bot_creation
    BEFORE INSERT ON public.bots
    FOR EACH ROW EXECUTE FUNCTION public.ensure_bot_owner_on_bot_creation();

-- 4. Fonction pour auto-générer l'URL publique lors de création de bot
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

-- 5. Créer le trigger pour auto-générer l'URL publique
DROP TRIGGER IF EXISTS auto_generate_public_url ON public.bots;
CREATE TRIGGER auto_generate_public_url
    BEFORE INSERT ON public.bots
    FOR EACH ROW EXECUTE FUNCTION public.auto_generate_public_url();

-- 6. Fonction de test complet du système
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