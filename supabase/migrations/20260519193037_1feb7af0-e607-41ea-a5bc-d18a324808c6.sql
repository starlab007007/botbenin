
CREATE TABLE IF NOT EXISTS public.waouh_alert_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  window_minutes integer NOT NULL DEFAULT 15,
  threshold_422 integer NOT NULL DEFAULT 10,
  threshold_429 integer NOT NULL DEFAULT 5,
  threshold_5xx integer NOT NULL DEFAULT 3,
  threshold_global_pct integer NOT NULL DEFAULT 20,
  webhook_url text,
  webhook_secret text,
  cooldown_minutes integer NOT NULL DEFAULT 30,
  last_alert_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.waouh_alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read alert config" ON public.waouh_alert_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin write alert config" ON public.waouh_alert_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.waouh_alert_config (enabled) SELECT true
  WHERE NOT EXISTS (SELECT 1 FROM public.waouh_alert_config);

CREATE TABLE IF NOT EXISTS public.waouh_alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL,
  rule text NOT NULL,
  count integer,
  payload jsonb,
  delivered boolean NOT NULL DEFAULT false,
  error text
);

ALTER TABLE public.waouh_alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read alert history" ON public.waouh_alert_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "service insert alert history" ON public.waouh_alert_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_waouh_alert_history_created ON public.waouh_alert_history(created_at DESC);

-- Cron alerts check every 5 min
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'waouh-alerts-check') THEN
    PERFORM cron.schedule(
      'waouh-alerts-check',
      '*/5 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-alerts-check',
        headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8"}'::jsonb,
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
