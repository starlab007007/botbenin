-- WAOUH Native Messaging runtime secrets in Supabase Vault.
-- Generated secrets never appear in source control or client responses.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'waouh_tel_phone_encryption_key') then
    perform vault.create_secret(
      encode(gen_random_bytes(48), 'hex'),
      'waouh_tel_phone_encryption_key',
      'WAOUH Native Messaging AES-GCM phone encryption secret'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'waouh_tel_phone_hash_key') then
    perform vault.create_secret(
      encode(gen_random_bytes(48), 'hex'),
      'waouh_tel_phone_hash_key',
      'WAOUH Native Messaging phone HMAC secret'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'waouh_tel_webhook_secret') then
    perform vault.create_secret(
      encode(gen_random_bytes(48), 'hex'),
      'waouh_tel_webhook_secret',
      'WAOUH Native Messaging provider webhook HMAC secret'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'waouh_tel_internal_secret') then
    perform vault.create_secret(
      encode(gen_random_bytes(48), 'hex'),
      'waouh_tel_internal_secret',
      'WAOUH Native Messaging internal worker bearer secret'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'waouh_tel_dispatch_url') then
    perform vault.create_secret(
      'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-e2e-test',
      'waouh_tel_dispatch_url',
      'WAOUH Native Messaging dispatch alias URL'
    );
  end if;
end
$$;

create or replace function public.waouh_tel_runtime_secret(p_name text)
returns text
language plpgsql
security definer
stable
set search_path = public, vault
as $$
declare
  secret_name text;
  value text;
begin
  secret_name := case p_name
    when 'phone_encryption_key' then 'waouh_tel_phone_encryption_key'
    when 'phone_hash_key' then 'waouh_tel_phone_hash_key'
    when 'webhook_secret' then 'waouh_tel_webhook_secret'
    when 'internal_secret' then 'waouh_tel_internal_secret'
    when 'infobip_base_url' then 'waouh_tel_infobip_base_url'
    when 'infobip_api_key' then 'waouh_tel_infobip_api_key'
    when 'dispatch_url' then 'waouh_tel_dispatch_url'
    else null
  end;
  if secret_name is null then
    return null;
  end if;
  select decrypted_secret into value
    from vault.decrypted_secrets
   where name = secret_name
   limit 1;
  return coalesce(value, '');
end;
$$;

revoke all on function public.waouh_tel_runtime_secret(text) from public, anon, authenticated;
grant execute on function public.waouh_tel_runtime_secret(text) to service_role;

create or replace function public.waouh_tel_set_runtime_secret(
  p_name text,
  p_value text
)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret_name text;
  secret_id uuid;
  clean_value text := btrim(coalesce(p_value, ''));
begin
  secret_name := case p_name
    when 'infobip_base_url' then 'waouh_tel_infobip_base_url'
    when 'infobip_api_key' then 'waouh_tel_infobip_api_key'
    else null
  end;
  if secret_name is null then
    raise exception 'unsupported runtime secret';
  end if;
  if clean_value = '' then
    raise exception 'runtime secret cannot be empty';
  end if;
  if p_name = 'infobip_base_url' and clean_value !~ '^https://' then
    raise exception 'Infobip base URL must use HTTPS';
  end if;
  if p_name = 'infobip_api_key' and char_length(clean_value) < 12 then
    raise exception 'Infobip API key is too short';
  end if;

  select id into secret_id from vault.secrets where name = secret_name limit 1;
  if secret_id is null then
    perform vault.create_secret(clean_value, secret_name, 'WAOUH Native Messaging provider credential');
  else
    perform vault.update_secret(secret_id, clean_value, secret_name, 'WAOUH Native Messaging provider credential');
  end if;
  return true;
end;
$$;

revoke all on function public.waouh_tel_set_runtime_secret(text, text) from public, anon, authenticated;
grant execute on function public.waouh_tel_set_runtime_secret(text, text) to service_role;

create or replace function public.waouh_tel_runtime_readiness()
returns jsonb
language sql
security definer
stable
set search_path = public, vault, cron
as $$
  select jsonb_build_object(
    'phone_encryption_ready',
      coalesce(char_length((select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_phone_encryption_key' limit 1)),0) >= 24,
    'phone_hash_ready',
      coalesce(char_length((select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_phone_hash_key' limit 1)),0) >= 24,
    'webhook_ready',
      coalesce(char_length((select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_webhook_secret' limit 1)),0) >= 24,
    'internal_secret_ready',
      coalesce(char_length((select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_internal_secret' limit 1)),0) >= 24,
    'infobip_base_url_ready',
      coalesce((select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_infobip_base_url' limit 1),'') ~ '^https://',
    'infobip_api_key_ready',
      coalesce(char_length((select decrypted_secret from vault.decrypted_secrets where name='waouh_tel_infobip_api_key' limit 1)),0) >= 12,
    'retry_worker_ready',
      exists(select 1 from cron.job where jobname='waouh-tel-dispatch-every-minute' and active)
      and exists(select 1 from vault.decrypted_secrets where name='waouh_tel_dispatch_url' and decrypted_secret ~ '^https://')
      and exists(select 1 from vault.decrypted_secrets where name='waouh_tel_internal_secret' and char_length(decrypted_secret) >= 24)
  );
$$;

revoke all on function public.waouh_tel_runtime_readiness() from public, anon, authenticated;
grant execute on function public.waouh_tel_runtime_readiness() to service_role;

select public.waouh_tel_install_dispatch_cron();
