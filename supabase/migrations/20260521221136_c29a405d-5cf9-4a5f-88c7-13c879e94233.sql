
-- 1) Backup storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('waouh-backups', 'waouh-backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies: admins only
CREATE POLICY "Admins read waouh-backups"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'waouh-backups' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write waouh-backups"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'waouh-backups' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete waouh-backups"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'waouh-backups' AND public.has_role(auth.uid(), 'admin'));

-- 2) Audit table for backups
CREATE TABLE IF NOT EXISTS public.waouh_catalog_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  trigger text NOT NULL DEFAULT 'manual',
  storage_path text NOT NULL,
  rows_count integer NOT NULL DEFAULT 0,
  bytes_size integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text
);
ALTER TABLE public.waouh_catalog_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read backups" ON public.waouh_catalog_backups FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write backups" ON public.waouh_catalog_backups FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Daily auto-backup via pg_cron (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'waouh-catalog-daily-backup';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
  PERFORM cron.schedule(
    'waouh-catalog-daily-backup',
    '0 2 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-catalog-backup',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.cron_secret', true)),
      body := jsonb_build_object('trigger','auto')
    ) AS request_id;
    $cron$
  );
END$$;
