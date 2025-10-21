-- ===================================================================
-- PHASE 1: CORRECTIONS CRITIQUES DE SÉCURITÉ - VERSION CORRIGÉE
-- ===================================================================

-- 1. Ajouter politiques RLS pour qualification_results
-- ===================================================================

CREATE POLICY "Users can view their own qualification results"
  ON public.qualification_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.qualification_campaigns qc
      WHERE qc.id = qualification_results.campaign_id
      AND qc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own qualification results"
  ON public.qualification_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.qualification_campaigns qc
      WHERE qc.id = campaign_id
      AND qc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own qualification results"
  ON public.qualification_results
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.qualification_campaigns qc
      WHERE qc.id = qualification_results.campaign_id
      AND qc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own qualification results"
  ON public.qualification_results
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.qualification_campaigns qc
      WHERE qc.id = qualification_results.campaign_id
      AND qc.user_id = auth.uid()
    )
  );

-- 2. Ajouter politiques RLS pour visitor_fingerprints
-- ===================================================================

CREATE POLICY "Anyone can view visitor fingerprints"
  ON public.visitor_fingerprints
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create fingerprints"
  ON public.visitor_fingerprints
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Service role can update fingerprints"
  ON public.visitor_fingerprints
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- 3. Renforcer les contraintes critiques NOT NULL
-- ===================================================================

-- Pour bot_users - s'assurer que bot_id n'est jamais NULL
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bot_users WHERE bot_id IS NULL) THEN
    ALTER TABLE public.bot_users 
    ALTER COLUMN bot_id SET NOT NULL;
  END IF;
END $$;

-- Pour chat_messages - s'assurer que bot_id n'est jamais NULL
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.chat_messages WHERE bot_id IS NULL) THEN
    ALTER TABLE public.chat_messages 
    ALTER COLUMN bot_id SET NOT NULL;
  END IF;
END $$;

-- Pour anonymous_visitor_sessions - s'assurer que fingerprint_id n'est jamais NULL
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.anonymous_visitor_sessions WHERE fingerprint_id IS NULL) THEN
    ALTER TABLE public.anonymous_visitor_sessions 
    ALTER COLUMN fingerprint_id SET NOT NULL;
  END IF;
END $$;

-- 4. Ajouter des index pour améliorer les performances des politiques RLS
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_qualification_results_campaign_id 
  ON public.qualification_results(campaign_id);

CREATE INDEX IF NOT EXISTS idx_visitor_fingerprints_created_at 
  ON public.visitor_fingerprints(created_at);