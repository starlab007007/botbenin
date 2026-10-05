-- WAOUH privileged runtime authentication + cron hardening.
-- The runtime secret lives only in Supabase Vault. Cron reads it at execution
-- time, so neither Git nor cron.job contains the secret value.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='waouh_runtime_internal_secret') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(48), 'hex'),
      'waouh_runtime_internal_secret',
      'WAOUH privileged Edge workers internal authentication'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.waouh_verify_runtime_internal_token(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
  SELECT p_token IS NOT NULL
     AND length(p_token) >= 32
     AND EXISTS (
       SELECT 1
       FROM vault.decrypted_secrets s
       WHERE s.name='waouh_runtime_internal_secret'
         AND s.decrypted_secret=p_token
     )
$function$;

REVOKE ALL ON FUNCTION public.waouh_verify_runtime_internal_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_verify_runtime_internal_token(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_verify_runtime_internal_token(text) TO service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT jobid FROM cron.job
    WHERE jobname IN (
      'waouh-radar-process-tick',
      'waouh-radar-apify-6h',
      'waouh-radar-site-scraper-6h',
      'waouh-serpapi-daily'
    )
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'waouh-radar-process-tick',
    '*/5 * * * *',
    $cron$
      select net.http_post(
        url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-radar-process',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'X-Waouh-Internal',
          (select decrypted_secret from vault.decrypted_secrets where name='waouh_runtime_internal_secret' limit 1)
        ),
        body := '{}'::jsonb
      );
    $cron$
  );

  PERFORM cron.schedule(
    'waouh-radar-apify-6h',
    '41 */6 * * *',
    $cron$
      select net.http_post(
        url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-radar-apify',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'X-Waouh-Internal',
          (select decrypted_secret from vault.decrypted_secrets where name='waouh_runtime_internal_secret' limit 1)
        ),
        body := '{}'::jsonb
      );
    $cron$
  );

  PERFORM cron.schedule(
    'waouh-radar-site-scraper-6h',
    '53 */6 * * *',
    $cron$
      select net.http_post(
        url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-radar-site-scraper',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'X-Waouh-Internal',
          (select decrypted_secret from vault.decrypted_secrets where name='waouh_runtime_internal_secret' limit 1)
        ),
        body := '{}'::jsonb
      );
    $cron$
  );

  PERFORM cron.schedule(
    'waouh-serpapi-daily',
    '17 5 * * *',
    $cron$
      select net.http_post(
        url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-serpapi-scout',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'X-Waouh-Internal',
          (select decrypted_secret from vault.decrypted_secrets where name='waouh_runtime_internal_secret' limit 1)
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
END $$;
