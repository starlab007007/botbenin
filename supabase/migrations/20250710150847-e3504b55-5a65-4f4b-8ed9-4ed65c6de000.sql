-- Forcer un rafraîchissement des plans de requête en cache
DISCARD PLANS;

-- Test de création d'un bot directement pour vérifier si l'erreur persiste
DO $$
DECLARE
    test_bot_id uuid;
    test_owner_id uuid;
BEGIN
    -- Récupérer un owner existant
    SELECT id INTO test_owner_id FROM public.bot_owners LIMIT 1;
    
    IF test_owner_id IS NOT NULL THEN
        -- Essayer de créer un bot de test
        INSERT INTO public.bots (name, description, owner_id, webhook_url, chat_title, chat_context)
        VALUES ('Test Bot Debug', 'Bot de test pour debug', test_owner_id, 'https://test.com', 'Test Title', 'general')
        RETURNING id INTO test_bot_id;
        
        RAISE NOTICE 'Bot créé avec succès: %', test_bot_id;
        
        -- Nettoyer le test
        DELETE FROM public.bots WHERE id = test_bot_id;
        RAISE NOTICE 'Bot de test supprimé';
    ELSE
        RAISE NOTICE 'Aucun bot_owner trouvé pour le test';
    END IF;
END $$;