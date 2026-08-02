
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('wa-diffusion-worker') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='wa-diffusion-worker');

SELECT cron.schedule(
  'wa-diffusion-worker',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/whatsapp-diffusion-worker',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
;
