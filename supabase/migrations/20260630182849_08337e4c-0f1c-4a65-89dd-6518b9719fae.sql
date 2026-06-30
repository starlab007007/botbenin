
ALTER TABLE public.waouh_radar_campaign_sends
  ADD COLUMN IF NOT EXISTS relaunch_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_relaunched_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_campaign_sends_kpi
  ON public.waouh_radar_campaign_sends (campaign_id, sent_at, response_at);

CREATE OR REPLACE VIEW public.v_diffusion_campaign_kpis AS
SELECT
  c.id AS campaign_id,
  c.name,
  c.mode,
  c.status,
  c.created_at,
  c.quota_approved,
  c.quota_consumed,
  COALESCE(s.total_sent, 0)        AS total_sent,
  COALESCE(s.total_responded, 0)   AS total_responded,
  COALESCE(s.total_relaunched, 0)  AS total_relaunched,
  CASE WHEN COALESCE(s.total_sent,0) > 0
    THEN ROUND(100.0 * s.total_responded / s.total_sent, 1) ELSE 0 END AS response_rate_pct,
  COALESCE(i.total_interested, 0)  AS total_interested,
  CASE WHEN COALESCE(s.total_sent,0) > 0
    THEN ROUND(100.0 * COALESCE(i.total_interested,0) / s.total_sent, 1) ELSE 0 END AS conversion_rate_pct
FROM public.waouh_radar_campaigns c
LEFT JOIN (
  SELECT campaign_id,
         COUNT(*)                                          AS total_sent,
         COUNT(*) FILTER (WHERE response_at IS NOT NULL)   AS total_responded,
         COUNT(*) FILTER (WHERE relaunch_count > 0)        AS total_relaunched
  FROM public.waouh_radar_campaign_sends
  GROUP BY campaign_id
) s ON s.campaign_id = c.id
LEFT JOIN (
  SELECT (payload->>'campaign_id')::uuid AS campaign_id,
         COUNT(*) AS total_interested
  FROM public.waouh_outbound_queue
  WHERE template = 'buyer_interest_seller_notif'
    AND payload ? 'campaign_id'
  GROUP BY (payload->>'campaign_id')::uuid
) i ON i.campaign_id = c.id;

GRANT SELECT ON public.v_diffusion_campaign_kpis TO authenticated, service_role;
