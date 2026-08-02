
-- Idempotence stricte signals
CREATE UNIQUE INDEX IF NOT EXISTS waouh_radar_signals_url_uidx
  ON public.waouh_radar_signals (source_type, raw_url)
  WHERE raw_url IS NOT NULL;

-- Unicité contact_phone sur profiles
CREATE UNIQUE INDEX IF NOT EXISTS waouh_radar_profiles_phone_uidx
  ON public.waouh_radar_profiles (contact_phone)
  WHERE contact_phone IS NOT NULL;

-- Réactiver SerpAPI + reset quota
UPDATE public.waouh_radar_api_configs
  SET active = true, usage_today = 0, usage_reset_at = now()
  WHERE provider = 'serpapi';

-- Marquer comme ignorés les anciens signaux non SELL/BUY
UPDATE public.waouh_radar_signals
  SET status = 'ignored'
  WHERE status = 'extracted' AND intent NOT IN ('SELL','BUY');

-- Cron pour le nouveau site-scraper (toutes les 30 min)
SELECT cron.unschedule('waouh-radar-site-scraper-tick') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'waouh-radar-site-scraper-tick'
);
SELECT cron.schedule(
  'waouh-radar-site-scraper-tick',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-radar-site-scraper',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
;
