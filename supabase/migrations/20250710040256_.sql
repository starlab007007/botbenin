-- Validation finale - Créer une fonction de validation complète

CREATE OR REPLACE FUNCTION public.validate_owner_complete_access()
RETURNS TABLE(
  validation_step text,
  status text,
  result_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_bots_count bigint;
  total_owners_count bigint;
  total_messages_count bigint;
  total_sessions_count bigint;
  functions_count bigint;
  policies_count bigint;
BEGIN
  -- 1. Valider l'existence des données
  SELECT COUNT(*) INTO total_bots_count FROM public.bots;
  SELECT COUNT(*) INTO total_owners_count FROM public.bot_owners;
  SELECT COUNT(*) INTO total_messages_count FROM public.chat_messages;
  SELECT COUNT(*) INTO total_sessions_count FROM public.enhanced_chat_sessions;
  
  RETURN QUERY SELECT 
    'data_validation'::text,
    'success'::text,
    jsonb_build_object(
      'total_bots', total_bots_count,
      'total_owners', total_owners_count,
      'total_messages', total_messages_count,
      'total_sessions', total_sessions_count
    );
  
  -- 2. Valider les fonctions créées
  SELECT COUNT(*) INTO functions_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_owner_complete_stats',
    'get_bot_complete_history',
    'get_bot_all_sessions',
    'send_manual_response_complete',
    'get_owner_all_conversations'
  );
  
  RETURN QUERY SELECT 
    'functions_validation'::text,
    CASE WHEN functions_count = 5 THEN 'success' ELSE 'partial' END::text,
    jsonb_build_object('functions_found', functions_count, 'expected', 5);
  
  -- 3. Valider les policies RLS
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('bots', 'chat_messages', 'bot_users', 'enhanced_chat_sessions', 'bot_message_history', 'bot_performance_metrics')
  AND policyname LIKE '%owner%' OR policyname LIKE '%Bot owner%';
  
  RETURN QUERY SELECT 
    'policies_validation'::text,
    CASE WHEN policies_count >= 8 THEN 'success' ELSE 'partial' END::text,
    jsonb_build_object('policies_found', policies_count, 'minimum_expected', 8);
  
  -- 4. Test d'accès pour un propriétaire réel
  DECLARE
    test_owner_id uuid;
    test_bot_id uuid;
    owner_stats_exists boolean := false;
  BEGIN
    SELECT bo.user_id, b.id INTO test_owner_id, test_bot_id
    FROM public.bot_owners bo
    JOIN public.bots b ON bo.id = b.owner_id
    LIMIT 1;
    
    IF test_owner_id IS NOT NULL AND test_bot_id IS NOT NULL THEN
      -- Tester si on peut exécuter les fonctions
      PERFORM public.get_owner_complete_stats(test_owner_id);
      PERFORM public.get_bot_complete_history(test_bot_id);
      PERFORM public.get_bot_all_sessions(test_bot_id);
      owner_stats_exists := true;
    END IF;
    
    RETURN QUERY SELECT 
      'access_test'::text,
      CASE WHEN owner_stats_exists THEN 'success' ELSE 'failed' END::text,
      jsonb_build_object(
        'test_owner_id', test_owner_id,
        'test_bot_id', test_bot_id,
        'functions_executable', owner_stats_exists
      );
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'access_test'::text,
      'failed'::text,
      jsonb_build_object('error', SQLERRM);
  END;
  
  -- 5. Résumé des capacités disponibles
  RETURN QUERY SELECT 
    'capabilities_summary'::text,
    'info'::text,
    jsonb_build_object(
      'available_functions', ARRAY[
        'get_owner_complete_stats() - Toutes les statistiques du propriétaire',
        'get_bot_complete_history() - Historique complet des messages avec détails',
        'get_bot_all_sessions() - Toutes les sessions avec métadonnées',
        'send_manual_response_complete() - Envoyer des réponses manuelles',
        'get_owner_all_conversations() - Toutes les conversations du propriétaire'
      ],
      'data_access', ARRAY[
        'Tous les bots du propriétaire',
        'Tous les messages de chaque bot',
        'Toutes les sessions et leurs détails',
        'Tous les utilisateurs et leurs informations',
        'Toutes les métriques de performance',
        'Historique complet des conversations'
      ],
      'manual_responses', 'Possibilité de répondre manuellement à toute conversation',
      'real_time_stats', 'Statistiques en temps réel avec métriques 24h/7j/30j'
    );
END;
$$;;
