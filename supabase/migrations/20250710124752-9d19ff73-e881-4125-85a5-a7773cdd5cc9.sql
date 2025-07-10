-- Corriger les politiques RLS problématiques

-- Supprimer les politiques RLS problématiques qui causent l'erreur "op ANY/ALL (array) requires operator to yield boolean"
DROP POLICY IF EXISTS "Owners can manage their bots_DISABLED" ON public.bots;

-- Recréer les politiques RLS avec la syntaxe correcte
CREATE POLICY "Bot owners can manage their bots" ON public.bots
FOR ALL
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

-- Corriger la politique sur bot_owners pour éviter les violations RLS
DROP POLICY IF EXISTS "Owners can manage their own data" ON public.bot_owners;
DROP POLICY IF EXISTS "Users can create their own bot_owner" ON public.bot_owners;
DROP POLICY IF EXISTS "Users can view their own bot_owner" ON public.bot_owners;
DROP POLICY IF EXISTS "Users can update their own bot_owner" ON public.bot_owners;
DROP POLICY IF EXISTS "Users can delete their own bot_owner" ON public.bot_owners;

-- Recréer une politique simplifiée pour bot_owners
CREATE POLICY "Bot owners full access" ON public.bot_owners
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fonction pour créer un bot_owner si nécessaire
CREATE OR REPLACE FUNCTION public.ensure_bot_owner_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si bot_owner existe, sinon le créer
  IF NOT EXISTS (
    SELECT 1 FROM public.bot_owners 
    WHERE user_id = auth.uid()
  ) THEN
    INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
    VALUES (auth.uid(), 'free', 10)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer un trigger pour s'assurer qu'un bot_owner existe avant l'insertion d'un bot
DROP TRIGGER IF EXISTS ensure_bot_owner_before_bot_insert ON public.bots;
CREATE TRIGGER ensure_bot_owner_before_bot_insert
  BEFORE INSERT ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_bot_owner_exists();

-- Fonction de test corrigée
CREATE OR REPLACE FUNCTION public.test_bot_creation_fixed()
RETURNS TABLE(
  step text,
  status text,
  details text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  test_user_id uuid := auth.uid();
  test_owner_id uuid;
  test_bot_id uuid;
BEGIN
  -- Étape 1: Vérifier l'utilisateur authentifié
  IF test_user_id IS NULL THEN
    RETURN QUERY SELECT 
      'user_check'::text,
      'failed'::text,
      'Utilisateur non authentifié'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT 
    'user_check'::text,
    'success'::text,
    ('Utilisateur authentifié: ' || test_user_id::text)::text;

  -- Étape 2: Créer ou récupérer bot_owner
  SELECT id INTO test_owner_id 
  FROM public.bot_owners 
  WHERE user_id = test_user_id;

  IF test_owner_id IS NULL THEN
    INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
    VALUES (test_user_id, 'free', 10)
    RETURNING id INTO test_owner_id;
    
    RETURN QUERY SELECT 
      'bot_owner_creation'::text,
      'success'::text,
      ('Bot owner créé: ' || test_owner_id::text)::text;
  ELSE
    RETURN QUERY SELECT 
      'bot_owner_check'::text,
      'success'::text,
      ('Bot owner existant: ' || test_owner_id::text)::text;
  END IF;

  -- Étape 3: Tester la création de bot
  BEGIN
    INSERT INTO public.bots (
      name, 
      description, 
      owner_id,
      webhook_url,
      chat_title,
      chat_context,
      is_active,
      share_enabled
    )
    VALUES (
      'Test Bot',
      'Bot de test automatique',
      test_owner_id,
      'https://test.webhook.url',
      'Assistant Test',
      'general',
      true,
      true
    )
    RETURNING id INTO test_bot_id;

    RETURN QUERY SELECT 
      'bot_creation'::text,
      'success'::text,
      ('Bot de test créé: ' || test_bot_id::text)::text;

    -- Nettoyer le bot de test
    DELETE FROM public.bots WHERE id = test_bot_id;
    
    RETURN QUERY SELECT 
      'cleanup'::text,
      'success'::text,
      'Bot de test supprimé'::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'bot_creation'::text,
      'failed'::text,
      ('Erreur: ' || SQLERRM)::text;
  END;
END;
$$;

-- Fonction de réparation système finale
CREATE OR REPLACE FUNCTION public.repair_system_final()
RETURNS TABLE(
  action text,
  status text,
  message text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Réparation 1: S'assurer que l'utilisateur a un bot_owner
  BEGIN
    INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
    SELECT auth.uid(), 'free', 10
    WHERE NOT EXISTS (
      SELECT 1 FROM public.bot_owners 
      WHERE user_id = auth.uid()
    );
    
    RETURN QUERY SELECT 
      'bot_owner_repair'::text,
      'success'::text,
      'Bot owner vérifié/créé'::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'bot_owner_repair'::text,
      'warning'::text,
      ('Avertissement bot_owner: ' || SQLERRM)::text;
  END;

  -- Réparation 2: Mettre à jour max_bots à 10
  BEGIN
    UPDATE public.bot_owners 
    SET max_bots = 10 
    WHERE user_id = auth.uid() AND max_bots != 10;
    
    RETURN QUERY SELECT 
      'max_bots_update'::text,
      'success'::text,
      'Limite de bots mise à jour'::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'max_bots_update'::text,
      'warning'::text,
      ('Avertissement max_bots: ' || SQLERRM)::text;
  END;

  RETURN QUERY SELECT 
    'system_repair'::text,
    'completed'::text,
    'Réparation système terminée'::text;
END;
$$;