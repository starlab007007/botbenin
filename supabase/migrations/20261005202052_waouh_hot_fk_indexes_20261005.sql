-- WAOUH hot-path FK indexes — 2026-10-05.
CREATE INDEX IF NOT EXISTS idx_waouh_buyer_profiles_user_id
  ON public.waouh_buyer_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_waouh_agent_missions_current_plan_id
  ON public.waouh_agent_missions(current_plan_id);

CREATE INDEX IF NOT EXISTS idx_waouh_articles_partner_id
  ON public.waouh_articles(partner_id);
