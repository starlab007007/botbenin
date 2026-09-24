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
    when 'webhook_secret' then 'waouh_tel_webhook_secret'
    else null
  end;
  if secret_name is null then raise exception 'unsupported runtime secret'; end if;
  if clean_value = '' then raise exception 'runtime secret cannot be empty'; end if;
  if p_name = 'infobip_base_url' and clean_value !~ '^https://' then
    raise exception 'Infobip base URL must use HTTPS';
  end if;
  if p_name = 'infobip_api_key' and char_length(clean_value) < 12 then
    raise exception 'Infobip API key is too short';
  end if;
  if p_name = 'webhook_secret' and char_length(clean_value) < 24 then
    raise exception 'Webhook secret is too short';
  end if;
  select id into secret_id from vault.secrets where name = secret_name limit 1;
  if secret_id is null then
    perform vault.create_secret(clean_value, secret_name, 'WAOUH Native Messaging runtime credential');
  else
    perform vault.update_secret(secret_id, clean_value, secret_name, 'WAOUH Native Messaging runtime credential');
  end if;
  return true;
end;
$$;
revoke all on function public.waouh_tel_set_runtime_secret(text, text) from public, anon, authenticated;
grant execute on function public.waouh_tel_set_runtime_secret(text, text) to service_role;