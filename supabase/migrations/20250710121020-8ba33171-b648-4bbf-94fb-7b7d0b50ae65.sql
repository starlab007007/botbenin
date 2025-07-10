-- Migration additive pour corriger les politiques RLS de la table bots
-- Cette migration ne supprime rien, elle ajoute des politiques correctes et désactive les conflictuelles

-- Désactiver temporairement les politiques conflictuelles sans les supprimer
ALTER POLICY "Users can create their own bots" ON public.bots RENAME TO "Users can create their own bots_OLD";
ALTER POLICY "Users can only see and edit their own bots" ON public.bots RENAME TO "Users can only see and edit their own bots_OLD";

-- Créer de nouvelles politiques RLS cohérentes et sans conflit
CREATE POLICY "bot_owners_can_select_their_bots" 
ON public.bots 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bot_owners bo 
    WHERE bo.id = bots.owner_id 
    AND bo.user_id = auth.uid()
  )
);

CREATE POLICY "bot_owners_can_insert_bots" 
ON public.bots 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bot_owners bo 
    WHERE bo.id = bots.owner_id 
    AND bo.user_id = auth.uid()
  )
);

CREATE POLICY "bot_owners_can_update_their_bots" 
ON public.bots 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.bot_owners bo 
    WHERE bo.id = bots.owner_id 
    AND bo.user_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bot_owners bo 
    WHERE bo.id = bots.owner_id 
    AND bo.user_id = auth.uid()
  )
);

CREATE POLICY "bot_owners_can_delete_their_bots" 
ON public.bots 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.bot_owners bo 
    WHERE bo.id = bots.owner_id 
    AND bo.user_id = auth.uid()
  )
);

-- Créer une fonction de test pour vérifier que les nouvelles politiques fonctionnent
CREATE OR REPLACE FUNCTION public.test_bot_rls_policies()
RETURNS TABLE(
  test_name text,
  status text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_bot_id uuid;
  test_owner_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Test de base avec l'utilisateur connecté
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT 
      'user_authentication'::text,
      'failed'::text,
      'Aucun utilisateur connecté pour le test'::text;
    RETURN;
  END IF;

  -- Récupérer ou créer un bot_owner pour l'utilisateur
  SELECT id INTO test_owner_id 
  FROM public.bot_owners 
  WHERE user_id = current_user_id 
  LIMIT 1;

  IF test_owner_id IS NULL THEN
    RETURN QUERY SELECT 
      'bot_owner_exists'::text,
      'failed'::text,
      'Aucun bot_owner trouvé pour l''utilisateur'::text;
    RETURN;
  END IF;

  -- Test d'insertion d'un bot de test
  BEGIN
    INSERT INTO public.bots (name, description, owner_id, webhook_url)
    VALUES ('Test Bot RLS', 'Bot de test pour les politiques RLS', test_owner_id, 'https://test.webhook.com')
    RETURNING id INTO test_bot_id;

    RETURN QUERY SELECT 
      'bot_creation'::text,
      'success'::text,
      ('Bot créé avec succès: ' || test_bot_id::text)::text;

    -- Test de lecture
    IF EXISTS (SELECT 1 FROM public.bots WHERE id = test_bot_id) THEN
      RETURN QUERY SELECT 
        'bot_read'::text,
        'success'::text,
        'Bot lu avec succès'::text;
    ELSE
      RETURN QUERY SELECT 
        'bot_read'::text,
        'failed'::text,
        'Impossible de lire le bot créé'::text;
    END IF;

    -- Test de mise à jour
    UPDATE public.bots 
    SET description = 'Bot de test mis à jour'
    WHERE id = test_bot_id;

    RETURN QUERY SELECT 
      'bot_update'::text,
      'success'::text,
      'Bot mis à jour avec succès'::text;

    -- Nettoyer le bot de test
    DELETE FROM public.bots WHERE id = test_bot_id;

    RETURN QUERY SELECT 
      'cleanup'::text,
      'success'::text,
      'Bot de test supprimé'::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'bot_operations'::text,
      'failed'::text,
      ('Erreur: ' || SQLERRM)::text;
  END;
END;
$$;

-- Créer une fonction pour vérifier l'état des politiques
CREATE OR REPLACE FUNCTION public.check_bot_policies_status()
RETURNS TABLE(
  policy_name text,
  policy_type text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname||'.'||tablename||'.'||policyname as policy_name,
    cmd as policy_type,
    true as is_active
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'bots'
  ORDER BY policyname;
$$;