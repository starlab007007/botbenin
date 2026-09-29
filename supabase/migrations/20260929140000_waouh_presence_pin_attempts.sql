-- Pointage public : limitation des essais de PIN (force brute d'un PIN à 4 chiffres).
-- Table réservée au service role (RLS activée, aucune politique) : lue et écrite par waouh-presence-public-page.
create table if not exists public.waouh_presence_pin_attempts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  employee_code text not null,
  client_hash text not null,
  failed_at timestamptz not null default now()
);
create index if not exists waouh_presence_pin_attempts_identity_idx
  on public.waouh_presence_pin_attempts (site_id, employee_code, failed_at desc);
create index if not exists waouh_presence_pin_attempts_client_idx
  on public.waouh_presence_pin_attempts (client_hash, failed_at desc);
alter table public.waouh_presence_pin_attempts enable row level security;
revoke all on public.waouh_presence_pin_attempts from anon, authenticated;
comment on table public.waouh_presence_pin_attempts is
  'Échecs de PIN du pointage public (5 / matricule et 20 / client sur 15 min). Service role uniquement.';
