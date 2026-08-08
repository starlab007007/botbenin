-- PrivatAI licensing — essai 7 jours + licences administrables
-- Aucune donnée métier/document utilisateur n'est stockée ici.

create extension if not exists pgcrypto;

create table if not exists public.privatai_license_settings (
  id integer primary key default 1 check (id = 1),
  trial_days integer not null default 7 check (trial_days between 1 and 90),
  default_validity_days integer not null default 30 check (default_validity_days between 1 and 3650),
  default_max_devices integer not null default 1 check (default_max_devices between 1 and 100),
  online_check_hours integer not null default 24 check (online_check_hours between 1 and 720),
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.privatai_license_settings (id, trial_days, default_validity_days, default_max_devices, online_check_hours)
values (1, 7, 30, 1, 24)
on conflict (id) do nothing;

create table if not exists public.privatai_trials (
  id uuid primary key default gen_random_uuid(),
  device_hash text not null unique,
  device_label text null,
  platform text null,
  app_version text null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.privatai_licenses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text null,
  customer_email text null,
  notes text null,
  validity_days integer not null default 30 check (validity_days between 1 and 3650),
  activation_mode text not null default 'first_use' check (activation_mode in ('first_use', 'fixed')),
  fixed_expires_at timestamptz null,
  first_activated_at timestamptz null,
  expires_at timestamptz null,
  max_devices integer not null default 1 check (max_devices between 1 and 100),
  active boolean not null default true,
  last_validated_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privatai_license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.privatai_licenses(id) on delete cascade,
  device_hash text not null,
  device_label text null,
  platform text null,
  app_version text null,
  first_activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz null,
  unique (license_id, device_hash)
);

create table if not exists public.privatai_license_events (
  id uuid primary key default gen_random_uuid(),
  license_id uuid null references public.privatai_licenses(id) on delete set null,
  device_hash text null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_privatai_trials_expires_at on public.privatai_trials(expires_at);
create index if not exists idx_privatai_licenses_active on public.privatai_licenses(active);
create index if not exists idx_privatai_licenses_expires_at on public.privatai_licenses(expires_at);
create index if not exists idx_privatai_license_devices_license on public.privatai_license_devices(license_id);
create index if not exists idx_privatai_license_devices_device on public.privatai_license_devices(device_hash);
create index if not exists idx_privatai_license_events_created on public.privatai_license_events(created_at desc);

alter table public.privatai_license_settings enable row level security;
alter table public.privatai_trials enable row level security;
alter table public.privatai_licenses enable row level security;
alter table public.privatai_license_devices enable row level security;
alter table public.privatai_license_events enable row level security;

-- Pas de policies publiques : seuls les Edge Functions avec service_role accèdent aux tables.
comment on table public.privatai_licenses is 'Licences PrivatAI administrées depuis le backoffice BOT.BJ';
comment on table public.privatai_trials is 'Essais PrivatAI par empreinte technique pseudonymisée, sans contenu utilisateur';
