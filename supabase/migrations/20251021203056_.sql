-- ===================================================================
-- PHASE 1 SUITE: CORRECTION DES TABLES SANS RLS ET SECURITY DEFINER
-- ===================================================================

-- 1. ACTIVER RLS SUR LES 5 TABLES CRITIQUES
-- ===================================================================

-- Table: debug_session_logs (logs système uniquement lisibles par admins)
ALTER TABLE public.debug_session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view debug logs"
  ON public.debug_session_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "System can insert debug logs"
  ON public.debug_session_logs
  FOR INSERT
  WITH CHECK (true);

-- Table: logs_session_anomalies (logs d'anomalies visibles par propriétaires de bots)
ALTER TABLE public.logs_session_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bot owners can view their session anomalies"
  ON public.logs_session_anomalies
  FOR SELECT
  USING (
    bot_id IN (
      SELECT b.id FROM public.bots b
      JOIN public.bot_owners bo ON b.owner_id = bo.id
      WHERE bo.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert session anomalies"
  ON public.logs_session_anomalies
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update session anomalies"
  ON public.logs_session_anomalies
  FOR UPDATE
  USING (true);

-- Table: platform_metrics (métriques système - admins seulement)
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view platform metrics"
  ON public.platform_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "System can manage platform metrics"
  ON public.platform_metrics
  FOR ALL
  USING (auth.role() = 'service_role');

-- Table: subscription_history (historique visible par l'utilisateur concerné)
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription history"
  ON public.subscription_history
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscription history"
  ON public.subscription_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "System can manage subscription history"
  ON public.subscription_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- Table: user_permissions (permissions visibles par l'utilisateur et admins)
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all permissions"
  ON public.user_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- 2. AJOUTER DES INDEX POUR AMÉLIORER LES PERFORMANCES
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_debug_session_logs_created_at 
  ON public.debug_session_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_session_anomalies_bot_id 
  ON public.logs_session_anomalies(bot_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id 
  ON public.subscription_history(user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id 
  ON public.user_permissions(user_id);;
