-- WAOUH — Visibilité des modules front par rôle / habilitation
-- Permet à l'administrateur d'activer/désactiver, de façon dynamique, les
-- modules affichés dans la barre latérale PC, le rail tablette, le menu
-- complet mobile (Web) et le menu « Espace de travail » (Flutter), module
-- par module, et de restreindre chacun à un sous-ensemble de rôles.
--
-- Registre : public.waouh_frontend_modules       (une ligne par module, clé stable)
-- Visibilité par rôle : public.waouh_frontend_module_roles
--   - Aucune ligne pour un module = visible par tous les rôles authentifiés
--     (comportement par défaut, rétro-compatible à la migration).
--   - Au moins une ligne = seuls les rôles listés voient le module.
-- Audit : public.waouh_frontend_module_audit     (traçabilité des bascules admin)

create table if not exists public.waouh_frontend_modules (
  module_key text primary key,
  label text not null,
  section text not null,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waouh_frontend_module_roles (
  module_key text not null references public.waouh_frontend_modules(module_key) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (module_key, role_id)
);
create index if not exists waouh_frontend_module_roles_role_idx
  on public.waouh_frontend_module_roles(role_id);

create table if not exists public.waouh_frontend_module_audit (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  actor_id uuid references auth.users(id) on delete set null,
  before_state jsonb,
  after_state jsonb,
  action text not null default 'update',
  created_at timestamptz not null default now()
);
create index if not exists waouh_frontend_module_audit_module_created_idx
  on public.waouh_frontend_module_audit(module_key, created_at desc);

-- Source unique côté Web : src/erp/navigation.ts (parité Flutter : live_menu_sheet.dart).
insert into public.waouh_frontend_modules (module_key, label, section, metadata) values
  ('chat', 'Chat Command Center', 'Communication', '{"route":"/app/chat"}'::jsonb),
  ('radar', 'Radar', 'Communication', '{"route":"/app/radar-map"}'::jsonb),
  ('whatsapp', 'WhatsApp IA', 'Communication', '{"route":"/app/whatsapp"}'::jsonb),
  ('diffusion', 'Diffusion', 'Communication', '{"route":"/app/diffusion"}'::jsonb),
  ('avatar', 'Avatar', 'Agents IA', '{"route":"/app/avatar"}'::jsonb),
  ('missions', 'Missions & veille', 'Agents IA', '{"route":"/app/missions"}'::jsonb),
  ('bots', 'Bots', 'Agents IA', '{"route":"/app/bots"}'::jsonb),
  ('agents_ia', 'Agents IA', 'Agents IA', '{"route":"/app/whatsapp/select-agent"}'::jsonb),
  ('conversationnel', 'Conversationnel', 'Agents IA', '{"route":"/app/whatsapp/conversationnel"}'::jsonb),
  ('bi', 'BI WAOUH IA', 'Agents IA', '{"route":"/app/whatsapp/bi"}'::jsonb),
  ('stock', 'Stock WAOUH IA', 'Agents IA', '{"route":"/app/stock"}'::jsonb),
  ('presence', 'Présence QR', 'Agents IA', '{"route":"/app/presence"}'::jsonb),
  ('privatia', 'PrivatAI (IA locale)', 'Agents IA', '{"route":"/privatia","external":true}'::jsonb),
  ('boutiques', 'Boutiques & magasins', 'Commerce', '{"route":"/app/partner/businesses"}'::jsonb),
  ('ventes', 'Ventes', 'Commerce', '{"route":"/app/partner/sales"}'::jsonb),
  ('partenaires', 'Partenaires', 'Commerce', '{"route":"/app/partner"}'::jsonb),
  ('apresbac', 'AprèsBac IA', 'Services IA', '{"route":"/app/apresbac"}'::jsonb),
  ('fa_ia', 'FA IA', 'Services IA', '{"route":"/app/fa-ia"}'::jsonb)
on conflict (module_key) do update set
  label = excluded.label,
  section = excluded.section,
  metadata = public.waouh_frontend_modules.metadata || excluded.metadata;

alter table public.waouh_frontend_modules enable row level security;
alter table public.waouh_frontend_module_roles enable row level security;
alter table public.waouh_frontend_module_audit enable row level security;

drop policy if exists "Admins read frontend modules" on public.waouh_frontend_modules;
create policy "Admins read frontend modules"
on public.waouh_frontend_modules for select to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "Admins write frontend modules" on public.waouh_frontend_modules;
create policy "Admins write frontend modules"
on public.waouh_frontend_modules for all to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "Admins read frontend module roles" on public.waouh_frontend_module_roles;
create policy "Admins read frontend module roles"
on public.waouh_frontend_module_roles for select to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "Admins write frontend module roles" on public.waouh_frontend_module_roles;
create policy "Admins write frontend module roles"
on public.waouh_frontend_module_roles for all to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "Admins read frontend module audit" on public.waouh_frontend_module_audit;
create policy "Admins read frontend module audit"
on public.waouh_frontend_module_audit for select to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create or replace function public.waouh_frontend_modules_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists waouh_frontend_modules_touch on public.waouh_frontend_modules;
create trigger waouh_frontend_modules_touch
before update on public.waouh_frontend_modules
for each row execute function public.waouh_frontend_modules_touch();

-- Résout, pour un utilisateur donné (ou invité si null), l'ensemble des
-- module_key visibles : module globalement activé ET (aucune restriction de
-- rôle, ou l'utilisateur détient au moins un des rôles autorisés).
create or replace function public.waouh_visible_modules_for_user(p_user_id uuid)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select m.module_key
  from public.waouh_frontend_modules m
  where m.enabled
    and (
      not exists (
        select 1 from public.waouh_frontend_module_roles mr
        where mr.module_key = m.module_key
      )
      or (
        p_user_id is not null
        and exists (
          select 1
          from public.waouh_frontend_module_roles mr
          join public.user_roles ur on ur.role_id = mr.role_id
          where mr.module_key = m.module_key and ur.user_id = p_user_id
        )
      )
    )
$$;

revoke all on function public.waouh_visible_modules_for_user(uuid) from public;
grant execute on function public.waouh_visible_modules_for_user(uuid) to anon, authenticated, service_role;

-- Lecture admin : état complet (module + rôles autorisés) pour l'écran de
-- gestion. role_names = tableau vide => ouvert à tous les rôles.
create or replace function public.waouh_admin_frontend_modules_state()
returns table (
  module_key text,
  label text,
  section text,
  enabled boolean,
  role_names text[],
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.module_key,
    m.label,
    m.section,
    m.enabled,
    coalesce(
      array_agg(r.name order by r.name) filter (where r.name is not null),
      array[]::text[]
    ) as role_names,
    m.updated_at
  from public.waouh_frontend_modules m
  left join public.waouh_frontend_module_roles mr on mr.module_key = m.module_key
  left join public.roles r on r.id = mr.role_id
  where public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin')
  group by m.module_key, m.label, m.section, m.enabled, m.updated_at
  order by m.section, m.label
$$;

revoke all on function public.waouh_admin_frontend_modules_state() from public;
grant execute on function public.waouh_admin_frontend_modules_state() to authenticated, service_role;

-- Écriture admin : bascule enabled et/ou remplace l'ensemble des rôles
-- autorisés (p_role_names = null => ne touche pas aux rôles ; tableau vide
-- => ré-ouvre le module à tous les rôles). Tracée dans l'audit.
create or replace function public.waouh_admin_set_frontend_module(
  p_module_key text,
  p_enabled boolean default null,
  p_role_names text[] default null
)
returns public.waouh_frontend_modules
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_before public.waouh_frontend_modules;
  v_after public.waouh_frontend_modules;
begin
  if v_uid is null or not (
    public.has_role(v_uid, 'admin') or public.has_role(v_uid, 'super_admin')
  ) then
    raise exception 'admin_required';
  end if;

  select * into v_before
  from public.waouh_frontend_modules
  where module_key = p_module_key
  for update;

  if not found then
    raise exception 'unknown_module:%', p_module_key;
  end if;

  update public.waouh_frontend_modules
  set enabled = coalesce(p_enabled, enabled),
      updated_by = v_uid,
      updated_at = now()
  where module_key = p_module_key
  returning * into v_after;

  if p_role_names is not null then
    delete from public.waouh_frontend_module_roles where module_key = p_module_key;
    insert into public.waouh_frontend_module_roles (module_key, role_id)
    select p_module_key, r.id
    from public.roles r
    where r.name = any(p_role_names);
  end if;

  insert into public.waouh_frontend_module_audit (module_key, actor_id, before_state, after_state, action)
  values (
    p_module_key,
    v_uid,
    to_jsonb(v_before),
    to_jsonb(v_after) || jsonb_build_object('role_names', to_jsonb(coalesce(p_role_names, array[]::text[]))),
    'update'
  );

  return v_after;
end;
$$;

revoke all on function public.waouh_admin_set_frontend_module(text, boolean, text[]) from public;
grant execute on function public.waouh_admin_set_frontend_module(text, boolean, text[]) to authenticated, service_role;

-- Temps réel : la bascule admin doit se répercuter sans rechargement.
alter publication supabase_realtime add table public.waouh_frontend_modules;
alter publication supabase_realtime add table public.waouh_frontend_module_roles;
alter table public.waouh_frontend_modules replica identity full;
alter table public.waouh_frontend_module_roles replica identity full;
