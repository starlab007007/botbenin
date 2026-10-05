-- WAOUH hot-path FK indexes round 2 — 2026-10-05.
CREATE INDEX IF NOT EXISTS idx_waouh_negotiations_article_id
  ON public.waouh_negotiations(article_id);

CREATE INDEX IF NOT EXISTS idx_waouh_notifications_article_id
  ON public.waouh_notifications(article_id);

CREATE INDEX IF NOT EXISTS idx_waouh_radar_signals_source_id
  ON public.waouh_radar_signals(source_id);

CREATE INDEX IF NOT EXISTS idx_waouh_radar_signals_promoted_article_id
  ON public.waouh_radar_signals(promoted_article_id)
  WHERE promoted_article_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_waouh_radar_signals_promoted_buyer_profile_id
  ON public.waouh_radar_signals(promoted_buyer_profile_id)
  WHERE promoted_buyer_profile_id IS NOT NULL;
