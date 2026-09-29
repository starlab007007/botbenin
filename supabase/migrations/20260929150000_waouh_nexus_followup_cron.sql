-- Suivi de l'avatar (offres vers vendeurs externes) : installeur de la planification horaire.
-- N'active RIEN automatiquement. Prérequis (une fois, par un administrateur) : créer dans le Vault les secrets
--   waouh_nexus_followup_url  = https://<projet>.supabase.co/functions/v1/waouh-nexus-followup
--   waouh_service_key         = clé service du projet
-- puis exécuter : select public.waouh_schedule_nexus_followup();  (retour : true = planifié)
-- Désactiver : select cron.unschedule('waouh-nexus-followup-hourly');
create or replace function public.waouh_schedule_nexus_followup() returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null or to_regnamespace('vault') is null then
    raise notice 'pg_cron, pg_net ou vault absent : suivi non planifié';
    return false;
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'waouh_nexus_followup_url')
     or not exists (select 1 from vault.decrypted_secrets where name = 'waouh_service_key') then
    raise notice 'secrets Vault waouh_nexus_followup_url / waouh_service_key manquants : suivi non planifié';
    return false;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-nexus-followup-hourly';
  perform cron.schedule('waouh-nexus-followup-hourly', '7 * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_nexus_followup_url' limit 1),
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_service_key' limit 1)),
      body := '{"limit":100}'::jsonb
    );
  $job$);
  return true;
end;
$$;
revoke all on function public.waouh_schedule_nexus_followup() from public, anon, authenticated;
