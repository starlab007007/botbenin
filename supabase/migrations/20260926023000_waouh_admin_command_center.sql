-- WAOUH Admin Command Center
-- Central cross-cutting runtime controls + audit trail for NEXUS, Avatar, chats,
-- agentic missions, negotiation, deals and outbound dispatch.

create table if not exists public.waouh_admin_module_controls (
  module_key text primary key,
  label text not null,
  description text,
  enabled boolean not null default true,
  automation_enabled boolean not null default true,
  maintenance_message text,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waouh_admin_module_controls_key_check check (module_key in (
    'nexus',
    'avatar_commerce',
    'chat_web',
    'chat_whatsapp',
    'muse_agents',
    'negotiation',
    'deals',
    'outbound'
  ))
);

create table if not exists public.waouh_admin_control_audit (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  actor_id uuid references auth.users(id) on delete set null,
  before_state jsonb,
  after_state jsonb,
  action text not null default 'update',
  created_at timestamptz not null default now()
);

create index if not exists waouh_admin_control_audit_module_created_idx
  on public.waouh_admin_control_audit(module_key, created_at desc);

alter table public.waouh_admin_module_controls enable row level security;
alter table public.waouh_admin_control_audit enable row level security;

drop policy if exists "Admins read WAOUH module controls" on public.waouh_admin_module_controls;
create policy "Admins read WAOUH module controls"
on public.waouh_admin_module_controls
for select to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
);

drop policy if exists "Admins update WAOUH module controls" on public.waouh_admin_module_controls;
create policy "Admins update WAOUH module controls"
on public.waouh_admin_module_controls
for update to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
);

drop policy if exists "Admins read WAOUH control audit" on public.waouh_admin_control_audit;
create policy "Admins read WAOUH control audit"
on public.waouh_admin_control_audit
for select to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
);

insert into public.waouh_admin_module_controls
(module_key,label,description,enabled,automation_enabled,metadata)
values
('nexus','NEXUS Discovery','Recherche globale, Signal Fabric, sources publiques et mises en relation.',true,true,'{"scope":"nexus.*"}'::jsonb),
('avatar_commerce','Avatar Commerce','Parcours Acheter / Vendre / Demander piloté par Avatar jusqu’au deal.',true,true,'{"surfaces":["web_avatar_commerce","flutter_avatar_commerce","avatar_home"]}'::jsonb),
('chat_web','WAOUH Chat Web/App','Entrées conversationnelles Web et App vers le moteur WAOUH.',true,true,'{"channels":["web","app","flutter"]}'::jsonb),
('chat_whatsapp','WAOUH WhatsApp','Entrées WhatsApp WAHA et réponses conversationnelles.',true,true,'{"channels":["whatsapp"]}'::jsonb),
('muse_agents','Muse & Agents IA','Missions, watchlists, plans, étapes et actions agentiques.',true,true,'{"scope":["mission.*","watch.*","approval.*","offer.*"]}'::jsonb),
('negotiation','Négociation','Offres, contre-propositions, acceptations et refus.',true,true,'{}'::jsonb),
('deals','Deal Room / Deal Graph','Confirmation vendeur, paiement, livraison et clôture.',true,true,'{}'::jsonb),
('outbound','Outbound Messaging','Dispatch WhatsApp/Web des notifications et événements transactionnels.',true,true,'{}'::jsonb)
on conflict (module_key) do update set
  label=excluded.label,
  description=excluded.description,
  metadata=public.waouh_admin_module_controls.metadata || excluded.metadata;

create or replace function public.waouh_admin_module_controls_touch()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists waouh_admin_module_controls_touch on public.waouh_admin_module_controls;
create trigger waouh_admin_module_controls_touch
before update on public.waouh_admin_module_controls
for each row execute function public.waouh_admin_module_controls_touch();

create or replace function public.waouh_admin_set_module_control(
  p_module_key text,
  p_enabled boolean default null,
  p_automation_enabled boolean default null,
  p_maintenance_message text default null,
  p_metadata jsonb default null
)
returns public.waouh_admin_module_controls
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid := auth.uid();
  v_before public.waouh_admin_module_controls;
  v_after public.waouh_admin_module_controls;
begin
  if v_uid is null or not (
    public.has_role(v_uid,'admin')
    or public.has_role(v_uid,'super_admin')
  ) then
    raise exception 'admin_required';
  end if;

  select * into v_before
  from public.waouh_admin_module_controls
  where module_key=p_module_key
  for update;

  if not found then
    raise exception 'unknown_module:%', p_module_key;
  end if;

  update public.waouh_admin_module_controls
  set enabled=coalesce(p_enabled,enabled),
      automation_enabled=coalesce(p_automation_enabled,automation_enabled),
      maintenance_message=case
        when p_maintenance_message is null then maintenance_message
        when btrim(p_maintenance_message)='' then null
        else left(p_maintenance_message,500)
      end,
      metadata=case
        when p_metadata is null then metadata
        else metadata || p_metadata
      end,
      updated_by=v_uid,
      updated_at=now()
  where module_key=p_module_key
  returning * into v_after;

  insert into public.waouh_admin_control_audit(
    module_key,actor_id,before_state,after_state,action
  ) values (
    p_module_key,v_uid,to_jsonb(v_before),to_jsonb(v_after),'update'
  );

  return v_after;
end;
$$;

revoke all on function public.waouh_admin_set_module_control(text,boolean,boolean,text,jsonb) from public;
grant execute on function public.waouh_admin_set_module_control(text,boolean,boolean,text,jsonb) to authenticated, service_role;

create or replace function public.waouh_module_control_state(p_module_key text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'module_key',module_key,
        'enabled',enabled,
        'automation_enabled',automation_enabled,
        'maintenance_message',maintenance_message,
        'updated_at',updated_at
      )
      from public.waouh_admin_module_controls
      where module_key=p_module_key
    ),
    jsonb_build_object(
      'module_key',p_module_key,
      'enabled',true,
      'automation_enabled',true,
      'maintenance_message',null,
      'updated_at',null
    )
  );
$$;

revoke all on function public.waouh_module_control_state(text) from public;
grant execute on function public.waouh_module_control_state(text) to authenticated, service_role;
