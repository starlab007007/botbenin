-- WAOUH automatic WAHA contact synchronization — 2026-10-06.
-- Uses the existing internal runtime secret from Supabase Vault.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT jobid FROM cron.job
    WHERE jobname='waouh-waha-contact-sync-30m'
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'waouh-waha-contact-sync-30m',
    '*/30 * * * *',
    $cron$
      select net.http_post(
        url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-waha-sync-contacts',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'X-Waouh-Internal',
          (select decrypted_secret from vault.decrypted_secrets
           where name='waouh_runtime_internal_secret'
           limit 1)
        ),
        body := jsonb_build_object(
          'backfill', true,
          'maxSessions', 3,
          'maxContactsPerSession', 5000
        ),
        timeout_milliseconds := 30000
      );
    $cron$
  );
END $$;
