-- Test de création d'un bot après correction
DO $$
DECLARE
    test_bot_id uuid;
    test_owner_id uuid;
    current_user_id uuid := 'ba9650d4-3281-4301-97ec-53c3b10850ed'::uuid; -- ID utilisateur de test
BEGIN
    -- Simuler un utilisateur connecté
    PERFORM set_config('jwt.claims.sub', current_user_id::text, true);
    
    -- Récupérer un owner existant pour cet utilisateur
    SELECT id INTO test_owner_id FROM public.bot_owners WHERE user_id = current_user_id LIMIT 1;
    
    IF test_owner_id IS NOT NULL THEN
        -- Essayer de créer un bot de test
        INSERT INTO public.bots (name, description, owner_id, webhook_url, chat_title, chat_context)
        VALUES ('Test Bot After Fix', 'Bot de test après correction', test_owner_id, 'https://test-fix.com', 'Test Title Fixed', 'general')
        RETURNING id INTO test_bot_id;
        
        RAISE NOTICE 'Bot créé avec succès après correction: %', test_bot_id;
        
        -- Nettoyer le test
        DELETE FROM public.bots WHERE id = test_bot_id;
        RAISE NOTICE 'Bot de test supprimé proprement';
    ELSE
        RAISE NOTICE 'Aucun bot_owner trouvé pour l''utilisateur: %', current_user_id;
    END IF;
END $$;