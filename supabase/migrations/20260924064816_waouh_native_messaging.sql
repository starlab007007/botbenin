-- WAOUH Native Messaging (SMS/RCS) lives beside the existing Flutter/Web chat.
-- It does not alter the mobile endpoints or any payment object.

create extension if not exists pgcrypto;

create table public.waouh_tel_settings (
  key text primary key default 'default' check (key = 'default'),
  enabled boolean not null default false,
  provider text not null default 'not_configured' check (provider in ('not_configured', 'infobip', 'test')),
  business_phone_e164 text check (business_phone_e164 is null or business_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  business_phone_display text,
  rcs_sender_name text not null default 'WAOUH',
  default_country_code text not null default '+229' check (default_country_code ~ '^\+[1-9][0-9]{0,3}$'),
  sms_enabled boolean not null default true,
  rcs_enabled boolean not null default false,
  fallback_to_sms boolean not null default true,
  virtual_groups_enabled boolean not null default false,
  native_groups_enabled boolean not null default false,
  public_base_url text not null default 'https://bot.bj/waouh/messages',
  default_locale text not null default 'fr-BJ',
  terms_version text not null default '2026-09-24',
  help_text text not null default 'Commandes : AIDE, STOP, REPRENDRE, EFFACER, GROUPE <nom>, REJOINDRE <code>.',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not native_groups_enabled or rcs_enabled),
  check (not enabled or sms_enabled or rcs_enabled),
  check (not enabled or provider <> 'not_configured'),
  check (not enabled or business_phone_e164 is not null)
);

insert into public.waouh_tel_settings (key) values ('default') on conflict (key) do nothing;

create table public.waouh_tel_users (
  id uuid primary key default gen_random_uuid(),
  phone_encrypted text not null,
  phone_hash text not null unique,
  phone_last4 text check (phone_last4 is null or phone_last4 ~ '^[0-9]{4}$'),
  display_name text,
  locale text not null default 'fr-BJ',
  status text not null default 'active' check (status in ('active', 'stopped', 'suspended', 'deleted')),
  engine_user_id uuid references public.waouh_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index waouh_tel_users_engine_idx on public.waouh_tel_users(engine_user_id) where engine_user_id is not null;

create table public.waouh_tel_consents (
  id uuid primary key default gen_random_uuid(),
  tel_user_id uuid not null references public.waouh_tel_users(id) on delete cascade,
  channel text not null check (channel in ('sms', 'rcs')),
  purpose text not null default 'conversation' check (purpose in ('conversation', 'alerts')),
  status text not null default 'active' check (status in ('active', 'stopped', 'suspended', 'withdrawn')),
  terms_version text not null,
  source text not null check (source in ('inbound_message', 'invite', 'admin', 'command')),
  evidence_event_id text,
  consented_at timestamptz not null default now(),
  stopped_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (tel_user_id, channel, purpose)
);

create table public.waouh_tel_threads (
  id uuid primary key default gen_random_uuid(),
  tel_user_id uuid references public.waouh_tel_users(id) on delete cascade,
  provider text not null,
  channel text not null check (channel in ('sms', 'rcs')),
  external_thread_id text,
  thread_kind text not null default 'direct' check (thread_kind in ('direct', 'virtual_group', 'native_group')),
  status text not null default 'open' check (status in ('open', 'closed', 'blocked')),
  context jsonb not null default '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (thread_kind <> 'direct' or tel_user_id is not null)
);

create unique index waouh_tel_direct_thread_unique
  on public.waouh_tel_threads(tel_user_id, provider, channel)
  where thread_kind = 'direct' and status = 'open';
create unique index waouh_tel_external_thread_unique
  on public.waouh_tel_threads(provider, channel, external_thread_id)
  where external_thread_id is not null;
create index waouh_tel_threads_user_idx on public.waouh_tel_threads(tel_user_id);

create table public.waouh_tel_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.waouh_tel_threads(id) on delete cascade,
  tel_user_id uuid references public.waouh_tel_users(id) on delete set null,
  provider text not null,
  provider_message_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  channel text not null check (channel in ('sms', 'rcs')),
  message_type text not null default 'text' check (message_type in ('text', 'image', 'file', 'location', 'suggestion', 'card', 'carousel', 'system')),
  body_text text,
  content jsonb not null default '{}'::jsonb,
  engine_payload jsonb,
  in_reply_to_message_id uuid references public.waouh_tel_messages(id) on delete set null,
  status text not null default 'received' check (status in ('received', 'processing', 'queued', 'sent', 'delivered', 'read', 'failed', 'redacted')),
  correlation_id uuid not null default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (body_text is not null or content <> '{}'::jsonb)
);

create unique index waouh_tel_provider_message_unique
  on public.waouh_tel_messages(provider, provider_message_id)
  where provider_message_id is not null;
create index waouh_tel_messages_thread_idx on public.waouh_tel_messages(thread_id, occurred_at desc);
create index waouh_tel_messages_user_idx on public.waouh_tel_messages(tel_user_id, occurred_at desc);
create unique index waouh_tel_messages_reply_unique
  on public.waouh_tel_messages(in_reply_to_message_id)
  where direction = 'outbound' and in_reply_to_message_id is not null;

create table public.waouh_tel_processed_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_kind text not null default 'message',
  payload_hash text not null,
  sender_hash text not null,
  payload_encrypted text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'retry', 'completed', 'failed', 'ignored')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  scheduled_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  message_id uuid references public.waouh_tel_messages(id) on delete set null,
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);
create index waouh_tel_processed_events_message_idx on public.waouh_tel_processed_events(message_id) where message_id is not null;
create index waouh_tel_processed_events_sender_idx on public.waouh_tel_processed_events(sender_hash, status);
create index waouh_tel_processed_events_claim_idx
  on public.waouh_tel_processed_events(scheduled_at, received_at)
  where status in ('queued', 'retry', 'failed', 'processing');

create table public.waouh_tel_outbox (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.waouh_tel_users(id) on delete cascade,
  target_thread_id uuid references public.waouh_tel_threads(id) on delete cascade,
  source_message_id uuid references public.waouh_tel_messages(id) on delete set null,
  message_kind text not null default 'message' check (message_kind in ('message', 'typing', 'read_receipt', 'system')),
  channel_preference text not null default 'auto' check (channel_preference in ('auto', 'sms', 'rcs')),
  payload jsonb not null,
  bypass_consent boolean not null default false,
  status text not null default 'queued' check (status in ('queued', 'processing', 'retry', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  scheduled_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  dedupe_key text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index waouh_tel_outbox_claim_idx
  on public.waouh_tel_outbox(scheduled_at, created_at)
  where status in ('queued', 'retry');
create index waouh_tel_outbox_provider_idx
  on public.waouh_tel_outbox(provider_message_id)
  where provider_message_id is not null;
create index waouh_tel_outbox_target_idx on public.waouh_tel_outbox(target_user_id, status, sent_at desc);
create index waouh_tel_outbox_source_idx on public.waouh_tel_outbox(source_message_id) where source_message_id is not null;
create unique index waouh_tel_outbox_dedupe_unique
  on public.waouh_tel_outbox(dedupe_key)
  where dedupe_key is not null;

create table public.waouh_tel_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  provider_message_id text not null,
  outbox_id uuid references public.waouh_tel_outbox(id) on delete set null,
  message_id uuid references public.waouh_tel_messages(id) on delete set null,
  status text not null check (status in ('accepted', 'sent', 'delivered', 'read', 'failed', 'expired', 'rejected')),
  provider_status text,
  provider_error jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index waouh_tel_receipts_message_idx on public.waouh_tel_receipts(provider_message_id, occurred_at desc);
create index waouh_tel_receipts_outbox_idx on public.waouh_tel_receipts(outbox_id) where outbox_id is not null;

create table public.waouh_tel_capabilities (
  id uuid primary key default gen_random_uuid(),
  tel_user_id uuid not null references public.waouh_tel_users(id) on delete cascade,
  provider text not null,
  rcs_reachable boolean not null default false,
  supports_media boolean not null default false,
  supports_cards boolean not null default false,
  supports_carousel boolean not null default false,
  supports_typing boolean not null default false,
  supports_read_receipts boolean not null default false,
  supports_native_groups boolean not null default false,
  raw_capabilities jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique (tel_user_id, provider)
);

create table public.waouh_tel_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text,
  campaign text,
  initial_message text not null default 'BONJOUR',
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  status text not null default 'active' check (status in ('active', 'exhausted', 'revoked', 'expired')),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (use_count <= max_uses)
);

create table public.waouh_tel_invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.waouh_tel_invites(id) on delete cascade,
  tel_user_id uuid not null references public.waouh_tel_users(id) on delete cascade,
  event_id uuid references public.waouh_tel_processed_events(id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (invite_id, tel_user_id)
);
create index waouh_tel_invite_redemptions_user_idx on public.waouh_tel_invite_redemptions(tel_user_id);

create table public.waouh_tel_rooms (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  name text not null check (char_length(name) between 1 and 80),
  owner_tel_user_id uuid not null references public.waouh_tel_users(id) on delete cascade,
  mode text not null default 'virtual' check (mode in ('virtual', 'native')),
  status text not null default 'active' check (status in ('active', 'archived', 'blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index waouh_tel_rooms_owner_idx on public.waouh_tel_rooms(owner_tel_user_id);

create table public.waouh_tel_room_members (
  room_id uuid not null references public.waouh_tel_rooms(id) on delete cascade,
  tel_user_id uuid not null references public.waouh_tel_users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  status text not null default 'active' check (status in ('active', 'left', 'removed', 'blocked')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, tel_user_id)
);
create index waouh_tel_room_members_user_idx on public.waouh_tel_room_members(tel_user_id);

create table public.waouh_tel_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.waouh_tel_rooms(id) on delete cascade,
  sender_tel_user_id uuid references public.waouh_tel_users(id) on delete set null,
  source_message_id uuid references public.waouh_tel_messages(id) on delete set null,
  body_text text not null check (char_length(body_text) between 1 and 1600),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index waouh_tel_room_messages_idx on public.waouh_tel_room_messages(room_id, created_at desc);
create index waouh_tel_room_messages_sender_idx on public.waouh_tel_room_messages(sender_tel_user_id, created_at desc) where sender_tel_user_id is not null;

create table public.waouh_tel_audit_log (
  id bigint generated always as identity primary key,
  tel_user_id uuid references public.waouh_tel_users(id) on delete set null,
  thread_id uuid references public.waouh_tel_threads(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'provider', 'worker', 'admin', 'system')),
  event_type text not null,
  outcome text not null default 'success' check (outcome in ('success', 'denied', 'failed')),
  correlation_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index waouh_tel_audit_user_idx on public.waouh_tel_audit_log(tel_user_id, created_at desc);
create index waouh_tel_audit_event_idx on public.waouh_tel_audit_log(event_type, created_at desc);

create or replace function public.waouh_tel_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger waouh_tel_settings_updated before update on public.waouh_tel_settings
  for each row execute function public.waouh_tel_set_updated_at();
create trigger waouh_tel_users_updated before update on public.waouh_tel_users
  for each row execute function public.waouh_tel_set_updated_at();
create trigger waouh_tel_consents_updated before update on public.waouh_tel_consents
  for each row execute function public.waouh_tel_set_updated_at();
create trigger waouh_tel_threads_updated before update on public.waouh_tel_threads
  for each row execute function public.waouh_tel_set_updated_at();
create trigger waouh_tel_outbox_updated before update on public.waouh_tel_outbox
  for each row execute function public.waouh_tel_set_updated_at();
create trigger waouh_tel_invites_updated before update on public.waouh_tel_invites
  for each row execute function public.waouh_tel_set_updated_at();
create trigger waouh_tel_rooms_updated before update on public.waouh_tel_rooms
  for each row execute function public.waouh_tel_set_updated_at();

create or replace function public.waouh_tel_enqueue_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) < 1 or jsonb_array_length(p_events) > 25 then
    raise exception 'WAOUH inbox batch must contain between 1 and 25 events';
  end if;

  insert into public.waouh_tel_processed_events (
    provider, provider_event_id, event_kind, payload_hash, sender_hash, payload_encrypted,
    status, attempts, scheduled_at, error_code, processed_at, locked_at, locked_by
  )
  select
    event ->> 'provider',
    event ->> 'provider_event_id',
    'message',
    event ->> 'payload_hash',
    event ->> 'sender_hash',
    event ->> 'payload_encrypted',
    'queued',
    0,
    now(),
    null,
    null,
    null,
    null
  from jsonb_array_elements(p_events) as input(event)
  where coalesce(event ->> 'provider', '') <> ''
    and coalesce(event ->> 'provider_event_id', '') <> ''
    and coalesce(event ->> 'payload_hash', '') <> ''
    and coalesce(event ->> 'sender_hash', '') <> ''
    and coalesce(event ->> 'payload_encrypted', '') <> ''
  on conflict (provider, provider_event_id) do update
    set payload_hash = excluded.payload_hash,
        sender_hash = excluded.sender_hash,
        payload_encrypted = excluded.payload_encrypted,
        status = 'queued',
        attempts = 0,
        scheduled_at = now(),
        error_code = null,
        processed_at = null,
        locked_at = null,
        locked_by = null
    where public.waouh_tel_processed_events.status = 'failed'
       or (
         public.waouh_tel_processed_events.status = 'processing'
         and public.waouh_tel_processed_events.locked_at < now() - interval '10 minutes'
       );

  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.waouh_tel_claim_inbox(
  p_limit integer default 20,
  p_worker_token text default null
)
returns setof public.waouh_tel_processed_events
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_worker_token is null or btrim(p_worker_token) = '' then
    raise exception 'worker token is required';
  end if;

  return query
  with candidates as (
    select id
      from public.waouh_tel_processed_events
     where (
       status in ('queued', 'retry', 'failed')
       or (status = 'processing' and locked_at < now() - interval '10 minutes')
     )
       and scheduled_at <= now()
       and attempts < max_attempts
     order by scheduled_at, received_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  update public.waouh_tel_processed_events e
     set status = 'processing',
         attempts = e.attempts + 1,
         locked_at = now(),
         locked_by = p_worker_token,
         error_code = null
    from candidates c
   where e.id = c.id
  returning e.*;
end;
$$;

create or replace function public.waouh_tel_claim_outbox(
  p_limit integer default 20,
  p_worker_token text default null
)
returns setof public.waouh_tel_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_worker_token is null or btrim(p_worker_token) = '' then
    raise exception 'worker token is required';
  end if;

  return query
  with candidates as (
    select id
      from public.waouh_tel_outbox
     where (
       status in ('queued', 'retry')
       or (status = 'processing' and locked_at < now() - interval '10 minutes')
     )
       and scheduled_at <= now()
       and attempts < max_attempts
     order by scheduled_at, created_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  update public.waouh_tel_outbox o
     set status = 'processing',
         attempts = o.attempts + 1,
         locked_at = now(),
         locked_by = p_worker_token,
         updated_at = now()
    from candidates c
   where o.id = c.id
  returning o.*;
end;
$$;

create or replace function public.waouh_tel_limit_room_members()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_members integer;
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;
  perform 1 from public.waouh_tel_rooms where id = new.room_id for update;
  select count(*) into active_members
    from public.waouh_tel_room_members
   where room_id = new.room_id and status = 'active';
  if active_members >= 50 then
    raise exception 'WAOUH virtual room member limit reached';
  end if;
  return new;
end;
$$;

create or replace function public.waouh_tel_install_dispatch_cron()
returns boolean
language plpgsql
security definer
set search_path = public, cron, net, vault
as $$
declare
  dispatch_url text;
  internal_secret text;
begin
  select decrypted_secret into dispatch_url from vault.decrypted_secrets where name = 'waouh_tel_dispatch_url' limit 1;
  select decrypted_secret into internal_secret from vault.decrypted_secrets where name = 'waouh_tel_internal_secret' limit 1;
  if dispatch_url !~ '^https://' or char_length(internal_secret) < 24 then
    return false;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'waouh-tel-dispatch-every-minute';
  perform cron.schedule(
    'waouh-tel-dispatch-every-minute',
    '* * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_tel_dispatch_url' limit 1),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'waouh_tel_internal_secret' limit 1)
        ),
        body := '{"limit":100,"inbox_limit":3,"source":"cron"}'::jsonb
      );
    $job$
  );
  return true;
end;
$$;

create or replace function public.waouh_tel_retry_worker_ready(
  p_internal_secret_sha256 text
)
returns boolean
language sql
security definer
stable
set search_path = public, cron, vault
as $$
  select
    exists (
      select 1 from cron.job
       where jobname = 'waouh-tel-dispatch-every-minute' and active
    )
    and exists (
      select 1 from vault.decrypted_secrets
       where name = 'waouh_tel_dispatch_url' and decrypted_secret ~ '^https://'
    )
    and exists (
      select 1 from vault.decrypted_secrets
       where name = 'waouh_tel_internal_secret'
         and char_length(decrypted_secret) >= 24
         and p_internal_secret_sha256 ~ '^[0-9a-f]{64}$'
         and encode(extensions.digest(decrypted_secret, 'sha256'), 'hex') = p_internal_secret_sha256
    );
$$;

create or replace function public.waouh_tel_set_consent_state(
  p_tel_user_id uuid,
  p_action text,
  p_channel text,
  p_terms_version text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.waouh_tel_users where id = p_tel_user_id for update;
  if not found then return false; end if;

  if p_action = 'stop' then
    update public.waouh_tel_users set status = 'stopped' where id = p_tel_user_id;
    update public.waouh_tel_consents
       set status = 'stopped', stopped_at = now()
     where tel_user_id = p_tel_user_id;
    update public.waouh_tel_outbox
       set status = 'cancelled', last_error = 'consent_stopped', locked_at = null, locked_by = null
     where target_user_id = p_tel_user_id and status in ('queued', 'retry', 'processing');
    return true;
  elsif p_action = 'resume' then
    if p_channel not in ('sms', 'rcs') then raise exception 'invalid channel'; end if;
    update public.waouh_tel_users set status = 'active', deleted_at = null where id = p_tel_user_id;
    insert into public.waouh_tel_consents (
      tel_user_id, channel, purpose, status, terms_version, source,
      evidence_event_id, consented_at, stopped_at
    ) values (
      p_tel_user_id, p_channel, 'conversation', 'active', p_terms_version,
      'command', null, now(), null
    )
    on conflict (tel_user_id, channel, purpose) do update
      set status = 'active', terms_version = excluded.terms_version,
          source = 'command', consented_at = now(), stopped_at = null;
    return true;
  end if;
  raise exception 'invalid consent action';
end;
$$;

create or replace function public.waouh_tel_erase_user(p_tel_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.waouh_tel_users;
  requested_at timestamptz;
begin
  select * into target
    from public.waouh_tel_users
   where id = p_tel_user_id
   for update;

  if target.id is null then
    return false;
  end if;

  begin
    requested_at := (target.metadata ->> 'deletion_requested_at')::timestamptz;
  exception when others then
    requested_at := null;
  end;
  if requested_at is null or requested_at < now() - interval '15 minutes' then
    raise exception 'WAOUH deletion confirmation expired';
  end if;

  update public.waouh_tel_processed_events
     set status = 'ignored', payload_encrypted = null,
         error_code = 'user_erased', processed_at = now(),
         locked_at = null, locked_by = null
   where sender_hash = target.phone_hash
     and status in ('queued', 'retry', 'failed');

  update public.waouh_tel_messages
     set body_text = '[effacé]', content = '{"redacted":true}'::jsonb,
         engine_payload = null, status = 'redacted'
   where tel_user_id = target.id;
  update public.waouh_tel_room_messages
     set body_text = '[effacé]', content = '{"redacted":true}'::jsonb,
         sender_tel_user_id = null
   where sender_tel_user_id = target.id;
  update public.waouh_tel_outbox
     set status = case when status in ('queued', 'retry', 'processing') then 'cancelled' else status end,
         payload = '{"schema":"waouh.tel.outbound.v1","text":"[effacé]"}'::jsonb,
         last_error = case when status in ('queued', 'retry', 'processing') then 'user_erased' else last_error end,
         locked_at = null, locked_by = null
   where target_user_id = target.id;
  update public.waouh_tel_receipts
     set provider_error = null
   where outbox_id in (select id from public.waouh_tel_outbox where target_user_id = target.id);
  update public.waouh_tel_consents
     set status = 'withdrawn', stopped_at = now()
   where tel_user_id = target.id;
  delete from public.waouh_tel_capabilities where tel_user_id = target.id;
  delete from public.waouh_tel_invite_redemptions where tel_user_id = target.id;
  update public.waouh_tel_room_members
     set status = 'left', left_at = now()
   where tel_user_id = target.id;
  update public.waouh_tel_rooms set status = 'archived' where owner_tel_user_id = target.id;
  update public.waouh_tel_threads set status = 'closed', context = '{}'::jsonb where tel_user_id = target.id;
  update public.waouh_tel_audit_log
     set tel_user_id = null, details = '{"redacted":true}'::jsonb
   where tel_user_id = target.id;

  update public.waouh_tel_users
     set phone_encrypted = 'deleted:' || target.id::text,
         phone_hash = 'deleted:' || target.id::text,
         phone_last4 = null,
         display_name = null,
         status = 'deleted',
         metadata = '{}'::jsonb,
         deleted_at = now(),
         engine_user_id = null
   where id = target.id;

  if target.engine_user_id is not null then
    delete from public.waouh_users
     where id = target.engine_user_id
       and web_session_id = 'tel:' || target.id::text;
  end if;
  return true;
end;
$$;

create trigger waouh_tel_room_members_limit
  before insert or update of status on public.waouh_tel_room_members
  for each row execute function public.waouh_tel_limit_room_members();

alter table public.waouh_tel_settings enable row level security;
alter table public.waouh_tel_users enable row level security;
alter table public.waouh_tel_consents enable row level security;
alter table public.waouh_tel_threads enable row level security;
alter table public.waouh_tel_messages enable row level security;
alter table public.waouh_tel_processed_events enable row level security;
alter table public.waouh_tel_outbox enable row level security;
alter table public.waouh_tel_receipts enable row level security;
alter table public.waouh_tel_capabilities enable row level security;
alter table public.waouh_tel_invites enable row level security;
alter table public.waouh_tel_invite_redemptions enable row level security;
alter table public.waouh_tel_rooms enable row level security;
alter table public.waouh_tel_room_members enable row level security;
alter table public.waouh_tel_room_messages enable row level security;
alter table public.waouh_tel_audit_log enable row level security;

revoke all on table
  public.waouh_tel_settings,
  public.waouh_tel_users,
  public.waouh_tel_consents,
  public.waouh_tel_threads,
  public.waouh_tel_messages,
  public.waouh_tel_processed_events,
  public.waouh_tel_outbox,
  public.waouh_tel_receipts,
  public.waouh_tel_capabilities,
  public.waouh_tel_invites,
  public.waouh_tel_invite_redemptions,
  public.waouh_tel_rooms,
  public.waouh_tel_room_members,
  public.waouh_tel_room_messages,
  public.waouh_tel_audit_log
from anon, authenticated;

grant select on table public.waouh_tel_settings to authenticated;

grant all on table
  public.waouh_tel_settings,
  public.waouh_tel_users,
  public.waouh_tel_consents,
  public.waouh_tel_threads,
  public.waouh_tel_messages,
  public.waouh_tel_processed_events,
  public.waouh_tel_outbox,
  public.waouh_tel_receipts,
  public.waouh_tel_capabilities,
  public.waouh_tel_invites,
  public.waouh_tel_invite_redemptions,
  public.waouh_tel_rooms,
  public.waouh_tel_room_members,
  public.waouh_tel_room_messages,
  public.waouh_tel_audit_log
to service_role;

create policy "WAOUH tel admins read settings" on public.waouh_tel_settings
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'super_admin'));

revoke all on function public.waouh_tel_set_updated_at() from public, anon, authenticated;
revoke all on function public.waouh_tel_enqueue_events(jsonb) from public, anon, authenticated;
revoke all on function public.waouh_tel_claim_inbox(integer, text) from public, anon, authenticated;
revoke all on function public.waouh_tel_claim_outbox(integer, text) from public, anon, authenticated;
revoke all on function public.waouh_tel_limit_room_members() from public, anon, authenticated;
revoke all on function public.waouh_tel_install_dispatch_cron() from public, anon, authenticated;
revoke all on function public.waouh_tel_retry_worker_ready(text) from public, anon, authenticated;
revoke all on function public.waouh_tel_set_consent_state(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.waouh_tel_erase_user(uuid) from public, anon, authenticated;
grant execute on function public.waouh_tel_set_updated_at() to service_role;
grant execute on function public.waouh_tel_enqueue_events(jsonb) to service_role;
grant execute on function public.waouh_tel_claim_inbox(integer, text) to service_role;
grant execute on function public.waouh_tel_claim_outbox(integer, text) to service_role;
grant execute on function public.waouh_tel_limit_room_members() to service_role;
grant execute on function public.waouh_tel_install_dispatch_cron() to service_role;
grant execute on function public.waouh_tel_retry_worker_ready(text) to service_role;
grant execute on function public.waouh_tel_set_consent_state(uuid, text, text, text) to service_role;
grant execute on function public.waouh_tel_erase_user(uuid) to service_role;

comment on table public.waouh_tel_settings is 'Non-secret WAOUH Native Messaging settings. Provider credentials stay in Edge Function secrets.';
comment on table public.waouh_tel_users is 'Standalone SMS/RCS identities. Phone numbers are encrypted by the Edge layer and indexed by keyed hash.';
comment on table public.waouh_tel_outbox is 'Durable atomic SMS/RCS outbox. No client role can read or mutate it.';
comment on table public.waouh_tel_rooms is 'Virtual multi-participant rooms delivered through each member direct SMS/RCS thread.';