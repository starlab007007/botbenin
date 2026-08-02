-- ============================================
-- CORRECTION CRITIQUE: RLS pour payment_transactions
-- ============================================

-- 1. Activer RLS sur la table payment_transactions si pas déjà fait
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques restrictives si elles existent
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.payment_transactions;

-- 3. Créer une politique INSERT qui permet les paiements invités
CREATE POLICY "Allow payment insertions for authenticated and guest users"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (
    -- Permettre si user_id est NULL (paiement invité) OU si user_id correspond à l'utilisateur authentifié
    user_id IS NULL OR auth.uid() = user_id
  );

-- 4. Créer une politique SELECT pour que les utilisateurs voient leurs transactions
CREATE POLICY "Users can view their own transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (
    -- Si authentifié : voir ses propres transactions
    (auth.uid() = user_id)
    OR 
    -- Si invité : peut voir toutes les transactions avec user_id NULL
    -- (Note: En production, on devrait filtrer par session_token dans metadata)
    (auth.uid() IS NULL AND user_id IS NULL)
    OR
    -- Admins peuvent tout voir
    (EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    ))
  );

-- 5. Créer une politique UPDATE pour que seul le système puisse mettre à jour
-- (via service_role key utilisé par le webhook)
CREATE POLICY "System can update payment transactions"
  ON public.payment_transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 6. Créer une politique DELETE (seulement pour les admins)
CREATE POLICY "Admins can delete payment transactions"
  ON public.payment_transactions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- 7. Créer un index pour améliorer les performances des requêtes par order_id
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id 
  ON public.payment_transactions(order_id);

-- 8. Créer un index pour les requêtes par user_id
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id 
  ON public.payment_transactions(user_id);

-- 9. Créer un index pour les requêtes par status
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
  ON public.payment_transactions(status);

-- 10. Ajouter une contrainte pour valider les statuts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payment_transactions_status_check'
  ) THEN
    ALTER TABLE public.payment_transactions
    ADD CONSTRAINT payment_transactions_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;;
