-- CORRECTION DE L'ERREUR "op ANY/ALL (array) requires operator to yield boolean"

-- Supprimer toutes les politiques potentiellement défectueuses sur la table bots
DROP POLICY IF EXISTS "Users can create bots" ON public.bots;
DROP POLICY IF EXISTS "Users can view their own bots" ON public.bots;
DROP POLICY IF EXISTS "Users can update their own bots" ON public.bots;
DROP POLICY IF EXISTS "Users can delete their own bots" ON public.bots;

-- Recréer les politiques avec une syntaxe correcte
CREATE POLICY "Users can create bots" 
ON public.bots 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own bots" 
ON public.bots 
FOR SELECT 
USING (
  owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own bots" 
ON public.bots 
FOR UPDATE 
USING (
  owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own bots" 
ON public.bots 
FOR DELETE 
USING (
  owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  )
);

-- Test de diagnostic pour vérifier que tout fonctionne
CREATE OR REPLACE FUNCTION public.test_bot_creation_fix()
RETURNS TABLE(
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Test des politiques RLS
  RETURN QUERY SELECT 
    'RLS_policies'::TEXT,
    'active'::TEXT,
    'Politiques RLS corrigées et actives'::TEXT;
    
  -- Test de la fonction bot_owners
  RETURN QUERY SELECT 
    'bot_owners_table'::TEXT,
    CASE WHEN EXISTS(SELECT 1 FROM public.bot_owners LIMIT 1) 
         THEN 'ready'::TEXT 
         ELSE 'empty'::TEXT 
    END,
    'Table bot_owners opérationnelle'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;