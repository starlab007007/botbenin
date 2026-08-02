
ALTER TABLE public.waouh_radar_campaign_sends
  ALTER COLUMN contact_id DROP NOT NULL;

ALTER TABLE public.waouh_radar_campaign_sends
  ADD COLUMN IF NOT EXISTS audience_phone_e164 text;

CREATE INDEX IF NOT EXISTS idx_campaign_sends_audience_phone
  ON public.waouh_radar_campaign_sends (campaign_id, audience_phone_e164, sent_at);
;
