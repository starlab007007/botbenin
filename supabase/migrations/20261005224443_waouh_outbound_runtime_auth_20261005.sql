-- Secure WAOUH outbound cron with the existing runtime token stored in Vault.
select cron.alter_job(
  (select jobid from cron.job where jobname='waouh-outbound-dispatch-tick' limit 1),
  command := $cron$
    select net.http_post(
      url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-outbound-dispatch',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'X-Waouh-Internal',
        (select decrypted_secret from vault.decrypted_secrets
         where name='waouh_runtime_internal_secret' limit 1)
      ),
      body := '{}'::jsonb
    );
  $cron$
);
