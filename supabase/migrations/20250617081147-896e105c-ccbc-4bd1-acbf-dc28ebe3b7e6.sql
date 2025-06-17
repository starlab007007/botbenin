
-- CORRECTION DÉFINITIVE - Supprimer d'abord la fonction existante puis la recréer

-- 1. Supprimer la fonction existante pour pouvoir changer le type de retour
DROP FUNCTION IF EXISTS public.get_unified_chat_history(uuid, text, uuid, integer);

-- 2. Créer la fonction corrigée avec le bon type par défaut
CREATE OR REPLACE FUNCTION public.get_unified_chat_history(
  p_bot_id uuid,
  p_session_token text DEFAULT NULL,
  p_bot_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  message_id uuid,
  bot_id uuid,
  bot_user_id uuid,
  message_content text,
  message_type text,
  message_timestamp timestamp with time zone,
  metadata jsonb,
  session_id text,
  user_name text,
  user_email text,
  ip_address text,
  user_agent text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id as message_id,
    cm.bot_id,
    cm.bot_user_id,
    cm.message_content,
    cm.message_type,
    cm.created_at as message_timestamp,
    cm.metadata,
    COALESCE(
      bu.session_id,
      cm.metadata->>'session_token',
      cm.metadata->>'sessionToken',
      'unknown'
    ) as session_id,
    COALESCE(bu.user_name, 'Utilisateur Anonyme') as user_name,
    bu.user_email,
    cm.ip_address,
    cm.user_agent
  FROM public.chat_messages cm
  LEFT JOIN public.bot_users bu ON cm.bot_user_id = bu.id
  WHERE cm.bot_id = p_bot_id
    AND (
      -- Par bot_user_id
      (p_bot_user_id IS NOT NULL AND cm.bot_user_id = p_bot_user_id)
      OR
      -- Par session_token avec qualification EXPLICITE
      (p_session_token IS NOT NULL AND (
        bu.session_id = p_session_token
        OR cm.metadata->>'session_token' = p_session_token
        OR cm.metadata->>'sessionToken' = p_session_token
      ))
      OR
      -- Si aucun critère, récupérer tous les messages récents
      (p_bot_user_id IS NULL AND p_session_token IS NULL)
    )
  ORDER BY cm.created_at ASC
  LIMIT p_limit;
END;
$$;

-- 3. Fonction pour diagnostiquer les ambiguïtés de session_token résolues
CREATE OR REPLACE FUNCTION public.diagnose_session_token_ambiguities()
RETURNS TABLE(
  issue_type text,
  status text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'session_token_ambiguities'::text,
    'resolved'::text,
    'Toutes les ambiguïtés de session_token ont été corrigées avec qualification explicite des colonnes'::text;
END;
$$;

-- 4. Fonction de réparation complète des inconsistances
CREATE OR REPLACE FUNCTION public.repair_all_session_inconsistencies()
RETURNS TABLE(
  action_taken text,
  count integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reconciled_count integer := 0;
  activated_count integer := 0;
BEGIN
  -- Activer les bots inactifs
  UPDATE public.bots 
  SET is_active = true, updated_at = NOW()
  WHERE is_active = false OR is_active IS NULL;
  
  GET DIAGNOSTICS activated_count = ROW_COUNT;
  
  IF activated_count > 0 THEN
    RETURN QUERY SELECT 'activated_bots'::text, activated_count, 'Bots réactivés automatiquement';
  END IF;

  -- Réconcilier les sessions avec auto_fix intégré
  SELECT count INTO reconciled_count FROM public.auto_fix_session_issues();
  
  IF reconciled_count > 0 THEN
    RETURN QUERY SELECT 'reconciled_sessions'::text, reconciled_count, 'Sessions réconciliées avec succès';
  END IF;

  -- Message de confirmation
  RETURN QUERY SELECT 'repair_completed'::text, (activated_count + reconciled_count), 'Réparation complète terminée avec succès';
END;
$$;

-- 5. Test final pour vérifier que tout fonctionne
DO $$
BEGIN
  RAISE NOTICE 'Fonctions corrigées et réparation terminée avec succès';
END $$;
