create schema if not exists waouh_private;
revoke all on schema waouh_private from public;
create table if not exists public.waouh_frontend_modules(module_key text primary key,label text not null,section text not null,enabled boolean not null default true,access_enabled boolean not null default true,automation_enabled boolean not null default true,metadata jsonb not null default '{}',updated_by uuid references auth.users(id) on delete set null,updated_at timestamptz not null default now());
alter table public.waouh_frontend_modules add column if not exists access_enabled boolean not null default true;
alter table public.waouh_frontend_modules add column if not exists automation_enabled boolean not null default true;
create table if not exists public.waouh_frontend_module_roles(module_key text references public.waouh_frontend_modules(module_key) on delete cascade,role_id uuid references public.roles(id) on delete cascade,primary key(module_key,role_id));
create table if not exists public.waouh_frontend_module_audit(id uuid primary key default gen_random_uuid(),module_key text not null,actor_id uuid references auth.users(id) on delete set null,before_state jsonb,after_state jsonb,action text not null default 'update',created_at timestamptz not null default now());
create table if not exists public.waouh_module_revision(id integer primary key check(id=1),revision bigint not null default 1);
insert into public.waouh_module_revision(id) values(1) on conflict do nothing;
insert into public.waouh_frontend_modules(module_key,label,section,metadata) values
('chat','Chat Command Center','Modules','{"paths": ["/app/chat", "/app/conversations"]}'::jsonb),
('radar','Radar','Modules','{"paths": ["/app/radar-map"]}'::jsonb),
('whatsapp','WhatsApp IA','Modules','{"paths": ["/app/whatsapp"]}'::jsonb),
('diffusion','Diffusion','Modules','{"paths": ["/app/diffusion"]}'::jsonb),
('avatar','Avatar','Modules','{"paths": ["/app/avatar", "/", "/app/muse", "/app/command"]}'::jsonb),
('missions','Missions & veille','Modules','{"paths": ["/app/missions"]}'::jsonb),
('bots','Bots','Modules','{"paths": ["/app/bots"]}'::jsonb),
('agents_ia','Agents IA','Modules','{"paths": ["/app/whatsapp/select-agent", "/app/agents"]}'::jsonb),
('conversationnel','Conversationnel','Modules','{"paths": ["/app/whatsapp/conversationnel"]}'::jsonb),
('bi','BI WAOUH IA','Modules','{"paths": ["/app/whatsapp/bi"]}'::jsonb),
('stock','Stock WAOUH IA','Modules','{"paths": ["/app/stock"]}'::jsonb),
('presence','Présence QR','Modules','{"paths": ["/app/presence", "/presence"]}'::jsonb),
('privatia','PrivatAI (IA locale)','Modules','{"paths": ["/privatia"]}'::jsonb),
('boutiques','Boutiques & magasins','Modules','{"paths": ["/app/partner/businesses"]}'::jsonb),
('ventes','Ventes','Modules','{"paths": ["/app/partner/sales"]}'::jsonb),
('partenaires','Partenaires','Modules','{"paths": ["/app/partner"]}'::jsonb),
('apresbac','AprèsBac IA','Modules','{"paths": ["/app/apresbac", "/app/apres-bac", "/apresbac", "/apresbacia"]}'::jsonb),
('fa_ia','FA IA','Modules','{"paths": ["/app/fa-ia", "/app/fa", "/fa"]}'::jsonb),
('nexus','Recherche guidée','Modules','{"paths": ["/app/nexus", "/app/radar"]}'::jsonb),
('ia','IA','Modules','{"paths": ["/app/ia"]}'::jsonb),
('versements','Versements','Modules','{"paths": ["/app/partner/payouts"]}'::jsonb),
('paiements','Paiements','Modules','{"paths": ["/app/partner/payments"]}'::jsonb)
on conflict(module_key) do update set label=excluded.label,metadata=excluded.metadata;
create index if not exists waouh_frontend_module_roles_role_idx on public.waouh_frontend_module_roles(role_id);
create index if not exists waouh_frontend_module_audit_time_idx on public.waouh_frontend_module_audit(created_at desc);
alter table public.waouh_frontend_modules enable row level security;
alter table public.waouh_frontend_module_roles enable row level security;
alter table public.waouh_frontend_module_audit enable row level security;
alter table public.waouh_module_revision enable row level security;
revoke all on public.waouh_frontend_modules,public.waouh_frontend_module_roles,public.waouh_frontend_module_audit from anon,authenticated;
grant select on public.waouh_frontend_modules,public.waouh_frontend_module_roles,public.waouh_frontend_module_audit to authenticated;
grant all on public.waouh_frontend_modules,public.waouh_frontend_module_roles,public.waouh_frontend_module_audit,public.waouh_module_revision to service_role;
grant select on public.waouh_module_revision to anon,authenticated;
create policy module_admin_read on public.waouh_frontend_modules for select to authenticated using(public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy module_roles_admin_read on public.waouh_frontend_module_roles for select to authenticated using(public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy module_audit_admin_read on public.waouh_frontend_module_audit for select to authenticated using(public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy module_revision_read on public.waouh_module_revision for select to anon,authenticated using(true);
create or replace function waouh_private.module_policy_rows(p_user uuid)
returns table(module_key text,visible boolean,access_enabled boolean,automation_enabled boolean)
language sql stable security definer set search_path='' as $$
 select m.module_key,m.enabled and m.access_enabled and allowed.ok,m.access_enabled and allowed.ok,m.access_enabled and m.automation_enabled and allowed.ok
 from public.waouh_frontend_modules m cross join lateral(select not exists(select 1 from public.waouh_frontend_module_roles mr where mr.module_key=m.module_key) or exists(select 1 from public.waouh_frontend_module_roles mr join public.user_roles ur on ur.role_id=mr.role_id where mr.module_key=m.module_key and ur.user_id=p_user) as ok) allowed
$$;
revoke all on function waouh_private.module_policy_rows(uuid) from public;
create or replace function public.waouh_module_policy(p_user_id uuid default null)
returns table(module_key text,visible boolean,access_enabled boolean,automation_enabled boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(auth.role(),'')<>'service_role' and p_user_id is not null and p_user_id is distinct from auth.uid() then raise exception 'Action non autorisée.' using errcode='42501'; end if;
 return query select * from waouh_private.module_policy_rows(coalesce(p_user_id,auth.uid()));
end $$;
revoke all on function public.waouh_module_policy(uuid) from public;
grant execute on function public.waouh_module_policy(uuid) to anon,authenticated,service_role;
create or replace function public.waouh_visible_modules_for_user(p_user_id uuid default null) returns setof text language sql stable security invoker set search_path='' as $$select module_key from public.waouh_module_policy(p_user_id) where visible$$;
revoke all on function public.waouh_visible_modules_for_user(uuid) from public;
grant execute on function public.waouh_visible_modules_for_user(uuid) to anon,authenticated,service_role;
drop function if exists public.waouh_admin_frontend_modules_state();
create or replace function public.waouh_admin_frontend_modules_state()
returns table(module_key text,label text,section text,enabled boolean,access_enabled boolean,automation_enabled boolean,role_names text[],updated_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not(public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin')) then raise exception 'Administration réservée.' using errcode='42501'; end if;
 return query select m.module_key,m.label,m.section,m.enabled,m.access_enabled,m.automation_enabled,coalesce(array_agg(r.name order by r.name) filter(where r.name is not null),array[]::text[]),m.updated_at from public.waouh_frontend_modules m left join public.waouh_frontend_module_roles mr on mr.module_key=m.module_key left join public.roles r on r.id=mr.role_id group by m.module_key,m.label,m.section,m.enabled,m.access_enabled,m.automation_enabled,m.updated_at order by m.label;
end $$;
revoke all on function public.waouh_admin_frontend_modules_state() from public;
grant execute on function public.waouh_admin_frontend_modules_state() to authenticated;
create or replace function public.waouh_admin_update_module(p_module_key text,p_visible boolean default null,p_access boolean default null,p_automation boolean default null,p_role_names text[] default null)
returns void language plpgsql security definer set search_path='' as $$
declare before_row jsonb; after_row jsonb; old_roles text[];
begin
 if auth.uid() is null or not(public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin')) then raise exception 'Administration réservée.' using errcode='42501'; end if;
 select to_jsonb(m) into before_row from public.waouh_frontend_modules m where m.module_key=p_module_key for update;
 if before_row is null then raise exception 'Module indisponible.'; end if;
 if exists(select 1 from unnest(p_role_names) k where not exists(select 1 from public.roles r where r.name=k)) then raise exception 'Rôle indisponible.'; end if;
 select array_agg(r.name order by r.name) into old_roles from public.waouh_frontend_module_roles mr join public.roles r on r.id=mr.role_id where mr.module_key=p_module_key;
 update public.waouh_frontend_modules set enabled=coalesce(p_visible,enabled),access_enabled=coalesce(p_access,access_enabled),automation_enabled=coalesce(p_automation,automation_enabled),updated_by=auth.uid(),updated_at=now() where module_key=p_module_key returning to_jsonb(waouh_frontend_modules) into after_row;
 if p_role_names is not null then
 delete from public.waouh_frontend_module_roles where module_key=p_module_key;
 insert into public.waouh_frontend_module_roles(module_key,role_id) select p_module_key,r.id from public.roles r where r.name=any(p_role_names);
 end if;
 insert into public.waouh_frontend_module_audit(module_key,actor_id,before_state,after_state) values(p_module_key,auth.uid(),before_row||jsonb_build_object('roles',coalesce(old_roles,array[]::text[])),after_row||jsonb_build_object('roles',coalesce(p_role_names,old_roles,array[]::text[])));
 update public.waouh_module_revision set revision=revision+1 where id=1;
end $$;
revoke all on function public.waouh_admin_update_module(text,boolean,boolean,boolean,text[]) from public;
grant execute on function public.waouh_admin_update_module(text,boolean,boolean,boolean,text[]) to authenticated;
-- This predicate adds a restriction; it grants no new access to business data.
create or replace function public.waouh_module_access_allowed(p_key text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select access_enabled from waouh_private.module_policy_rows(auth.uid()) where module_key=p_key),false)
$$;
revoke all on function public.waouh_module_access_allowed(text) from public;
grant execute on function public.waouh_module_access_allowed(text) to anon,authenticated;
create policy module_access_guard on public.waouh_avatar_prefs as restrictive for all to anon,authenticated using(public.waouh_module_access_allowed('avatar')) with check(public.waouh_module_access_allowed('avatar'));
create policy module_access_guard on public.waouh_avatar_mandates as restrictive for all to anon,authenticated using(public.waouh_module_access_allowed('missions')) with check(public.waouh_module_access_allowed('missions'));
create policy module_access_guard on public.waouh_persistent_intents as restrictive for all to anon,authenticated using(public.waouh_module_access_allowed('missions')) with check(public.waouh_module_access_allowed('missions'));
create policy module_access_guard on public.waouh_agent_missions as restrictive for all to anon,authenticated using(public.waouh_module_access_allowed('missions')) with check(public.waouh_module_access_allowed('missions'));
create policy module_access_guard on public.waouh_agent_approvals as restrictive for all to anon,authenticated using(public.waouh_module_access_allowed('missions')) with check(public.waouh_module_access_allowed('missions'));
create policy module_access_guard on public.waouh_stock_items as restrictive for all to anon,authenticated using(public.waouh_module_access_allowed('stock')) with check(public.waouh_module_access_allowed('stock'));
create policy module_access_guard on public.waouh_presence_sessions as restrictive for all to anon,authenticated using(public.waouh_module_access_allowed('presence')) with check(public.waouh_module_access_allowed('presence'));
create policy module_access_guard on public.waouh_partners as restrictive for all to anon,authenticated using(public.waouh_module_access_allowed('partenaires')) with check(public.waouh_module_access_allowed('partenaires'));
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='waouh_module_revision') then alter publication supabase_realtime add table public.waouh_module_revision; end if; end $$;
