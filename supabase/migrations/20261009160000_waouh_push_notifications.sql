-- Notifications push (FCM) : marqueur d'envoi + planification.
-- Les notifications existantes sont marquées « déjà traitées » : aucun historique n'est poussé.
alter table public.waouh_notifications add column if not exists push_sent_at timestamptz;

update public.waouh_notifications set push_sent_at = now() where push_sent_at is null;

create index if not exists waouh_notifications_push_pending_idx
  on public.waouh_notifications (sent_at)
  where push_sent_at is null;

create unique index if not exists device_tokens_user_token_uidx
  on public.device_tokens (user_id, fcm_token);

-- Tick toutes les minutes : réutilise le secret interne WAOUH du Vault (comme les autres tâches planifiées).
create or replace function public.waouh_schedule_push_tick(
  p_base_url text default 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1'
) returns boolean
language plpgsql security definer set search_path = public, vault, extensions as $$
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null or to_regnamespace('vault') is null then
    raise notice 'pg_cron, pg_net ou vault absent : push non planifié';
    return false;
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'waouh_tel_internal_secret') then
    raise notice 'secret interne WAOUH absent du Vault : push non planifié';
    return false;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-push-tick-1m';
  perform cron.schedule('waouh-push-tick-1m', '* * * * *', format($job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'waouh_tel_internal_secret' limit 1
        )
      ),
      body := '{"action":"tick","limit":50}'::jsonb
    );
  $job$, rtrim(p_base_url,'/') || '/register-device-token'));
  return true;
end;
$$;
revoke all on function public.waouh_schedule_push_tick(text) from public, anon, authenticated;

select public.waouh_schedule_push_tick();
