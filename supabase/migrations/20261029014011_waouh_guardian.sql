-- Restored CLI-generated migration: GUARDIAN never repairs business data.
create schema if not exists guardian_private;
revoke all on schema guardian_private from public,anon,authenticated;
grant usage on schema guardian_private to service_role;
create table public.waouh_guardian_settings(id boolean primary key default true check(id),auto_repair_enabled boolean not null default true,alerts_enabled boolean not null default true,maintenance_until timestamptz,activated_at timestamptz,updated_at timestamptz not null default now(),updated_by uuid,tick_lease_until timestamptz);
insert into public.waouh_guardian_settings(id) values(true);
create table public.waouh_guardian_components(component text not null,observer text not null check(observer in('host','external','internal')),fresh_for_seconds int not null check(fresh_for_seconds between 60 and 1800),status text not null default 'unknown' check(status in('unknown','healthy','degraded','down','paused')),cause_code text not null default 'AWAITING_OBSERVATION',failure_streak int not null default 0,recovery_streak int not null default 0,first_failure_at timestamptz,last_seen_at timestamptz,last_healthy_at timestamptz,latency_ms int check(latency_ms between 0 and 120000),details jsonb not null default '{}' check(jsonb_typeof(details)='object' and octet_length(details::text)<=4096),primary key(component,observer));
insert into public.waouh_guardian_components(component,observer,fresh_for_seconds) values
('web_public','host',180),('web_origin','host',180),('host_monitor','host',180),('web_public','external',900),('web_render','external',900),('runtime','external',900),('external_monitor','external',900),('database','internal',420),('discovery','internal',420),('users_access','internal',420),('whatsapp','internal',420),('queues','internal',420),('collectors','internal',420),('client_errors','internal',420),('observer_health','internal',420),('internal_monitor','internal',420);
create table public.waouh_guardian_observations(report_id uuid not null,component text not null,observer text not null,observed_at timestamptz not null,status text not null check(status in('unknown','healthy','degraded','down','paused')),cause_code text not null,latency_ms int check(latency_ms between 0 and 120000),primary key(report_id,component,observer),foreign key(component,observer) references public.waouh_guardian_components(component,observer));
create index on public.waouh_guardian_observations(observed_at desc);
create table public.waouh_guardian_incidents(id uuid primary key default gen_random_uuid(),component text not null,cause_code text not null,severity text not null check(severity in('warning','critical')),status text not null default 'detected' check(status in('detected','confirmed','repairing','verifying','needs_attention','resolved')),detected_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),resolved_at timestamptz,resolution_code text check(resolution_code in('RECOVERED','POLICY_PAUSED')),notified_at timestamptz,recovery_notified_at timestamptz);
create unique index waouh_guardian_one_open_incident on public.waouh_guardian_incidents(component) where resolved_at is null;
create index on public.waouh_guardian_incidents(detected_at desc);
create table public.waouh_guardian_actions(id uuid primary key default gen_random_uuid(),request_id uuid not null unique,incident_id uuid not null references public.waouh_guardian_incidents(id),action text not null check(action='restart_web'),status text not null default 'claimed' check(status in('claimed','succeeded','failed','not_executed','unknown')),started_at timestamptz not null default now(),finished_at timestamptz,reason_code text not null default 'CONFIRMED_OUTAGE',unique(incident_id,action));
create index on public.waouh_guardian_actions(started_at desc);
create table public.waouh_guardian_client_events(id bigint generated always as identity primary key,user_id uuid not null,platform text not null check(platform in('web','flutter')),code text not null check(code in('render_error','unhandled_error','sale_error','users_error')),surface text not null check(surface in('home','avatar','mission','sale','users','other')),created_at timestamptz not null default now());
create index on public.waouh_guardian_client_events(created_at desc);
create table public.waouh_guardian_client_limits(user_id uuid primary key,bucket timestamptz not null,count int not null check(count between 1 and 5));
create table public.waouh_guardian_audit(id bigint generated always as identity primary key,actor_id uuid,event text not null,created_at timestamptz not null default now(),details jsonb not null default '{}');
do $$ declare t text;begin
foreach t in array array['settings','components','observations','incidents','actions','client_events','client_limits','audit'] loop
execute format('alter table public.waouh_guardian_%I enable row level security',t);
execute format('revoke all on public.waouh_guardian_%I from public,anon,authenticated',t);
execute format('grant all on public.waouh_guardian_%I to service_role',t);
end loop;end $$;
grant usage,select on sequence public.waouh_guardian_client_events_id_seq,public.waouh_guardian_audit_id_seq to service_role;

create function guardian_private.notify_incident(p_id uuid,p_recovered boolean default false) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v public.waouh_guardian_incidents;cfg public.waouh_guardian_settings;
begin
select * into v from public.waouh_guardian_incidents where id=p_id for update;select * into cfg from public.waouh_guardian_settings where id;
if not cfg.alerts_enabled or cfg.activated_at is null or cfg.maintenance_until>now() then return;end if;
if (not p_recovered and v.notified_at is not null) or (p_recovered and(v.notified_at is null or v.recovery_notified_at is not null)) then return;end if;
insert into public.notifications(user_id,title,content,type,action_url,metadata)
select distinct ur.user_id,case when p_recovered then 'GUARDIAN : service rétabli' else 'GUARDIAN : attention requise' end,
case when p_recovered then 'Le retour à la normale a été confirmé. Consultez le suivi de fiabilité.' else 'Une dégradation a été confirmée. Consultez son impact et les actions proposées.' end,'system','/admin/waouh/guardian',jsonb_build_object('guardian_incident_id',v.id,'recovered',p_recovered)
from public.user_roles ur join public.roles r on r.id=ur.role_id where r.name in('admin','super_admin');
if p_recovered then update public.waouh_guardian_incidents set recovery_notified_at=now() where id=p_id;else update public.waouh_guardian_incidents set notified_at=now() where id=p_id;end if;
exception when others then raise log 'guardian_notification_unavailable';end $$;

create function public.waouh_guardian_observe(p_report_id uuid,p_component text,p_observer text,p_status text,p_cause text,p_observed_at timestamptz,p_latency_ms int default null,p_details jsonb default '{}') returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare s public.waouh_guardian_components;i public.waouh_guardian_incidents;inserted uuid;confirmed boolean;
begin
perform 1 from public.waouh_guardian_settings where id for update;
select * into s from public.waouh_guardian_components where component=p_component and observer=p_observer;
if not found or p_status is null or p_observed_at is null or p_cause is null or p_status not in('healthy','degraded','down','paused','unknown') or p_cause !~ '^[A-Z_]{2,64}$' or p_observed_at>now()+interval '60 seconds' or p_observed_at<now()-interval '10 minutes' or p_details is null or jsonb_typeof(p_details)<>'object' or octet_length(p_details::text)>4096 then raise exception 'invalid_guardian_observation';end if;
insert into public.waouh_guardian_observations values(p_report_id,p_component,p_observer,p_observed_at,p_status,p_cause,p_latency_ms) on conflict do nothing returning report_id into inserted;
if inserted is null or p_observed_at<=s.last_seen_at then return jsonb_build_object('accepted',false);end if;
update public.waouh_guardian_components set status=p_status,cause_code=p_cause,last_seen_at=p_observed_at,latency_ms=p_latency_ms,details=p_details,failure_streak=case when p_status in('down','degraded') then s.failure_streak+1 else 0 end,recovery_streak=case when p_status='healthy' then s.recovery_streak+1 else 0 end,first_failure_at=case when p_status in('down','degraded') then coalesce(s.first_failure_at,p_observed_at) else null end,last_healthy_at=case when p_status='healthy' then p_observed_at else s.last_healthy_at end where component=p_component and observer=p_observer returning * into s;
if p_component='web_origin' then return jsonb_build_object('accepted',true);end if;
select * into i from public.waouh_guardian_incidents where component=p_component and resolved_at is null;
if p_status in('down','degraded') then
confirmed:=s.failure_streak>=2 and s.first_failure_at<=p_observed_at-interval '30 seconds';
if i.id is null then insert into public.waouh_guardian_incidents(component,cause_code,severity,status,detected_at,last_seen_at) values(p_component,p_cause,case when p_status='down' then 'critical' else 'warning' end,case when confirmed then 'confirmed' else 'detected' end,p_observed_at,p_observed_at) returning * into i;
else update public.waouh_guardian_incidents set cause_code=p_cause,last_seen_at=p_observed_at,severity=case when p_status='down' then 'critical' else severity end,status=case when status='detected' and confirmed then 'confirmed' when status='verifying' and confirmed then 'needs_attention' else status end where id=i.id returning * into i;end if;
if confirmed then perform guardian_private.notify_incident(i.id);end if;
elsif p_status='healthy' and i.id is not null then
if not exists(select 1 from public.waouh_guardian_components c where c.component=p_component and(c.status<>'healthy' or c.recovery_streak<2 or c.last_seen_at is null or c.last_seen_at<now()-c.fresh_for_seconds*interval '1 second')) then update public.waouh_guardian_incidents set status='resolved',resolution_code='RECOVERED',resolved_at=now(),last_seen_at=p_observed_at where id=i.id;perform guardian_private.notify_incident(i.id,true);end if;
elsif p_status='paused' and i.id is not null and not exists(select 1 from public.waouh_guardian_components where component=p_component and status<>'paused') then update public.waouh_guardian_incidents set status='resolved',resolution_code='POLICY_PAUSED',resolved_at=now() where id=i.id;end if;
return jsonb_build_object('accepted',true,'incident_id',i.id);end $$;

create function public.waouh_guardian_claim_restart(p_request_id uuid) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare cfg public.waouh_guardian_settings;l public.waouh_guardian_components;p public.waouh_guardian_components;e public.waouh_guardian_components;i public.waouh_guardian_incidents;a uuid;
begin
select * into cfg from public.waouh_guardian_settings where id for update;
if cfg.activated_at is null or not cfg.auto_repair_enabled or cfg.maintenance_until>now() then return jsonb_build_object('granted',false,'reason','REPAIRS_PAUSED');end if;
if exists(select 1 from public.waouh_guardian_actions where request_id=p_request_id) then return jsonb_build_object('granted',false,'reason','ALREADY_CLAIMED');end if;
select * into l from public.waouh_guardian_components where component='web_origin' and observer='host';select * into p from public.waouh_guardian_components where component='web_public' and observer='host';select * into e from public.waouh_guardian_components where component='web_public' and observer='external';
if l.status<>'down' or p.status<>'down' or e.status<>'down' or l.failure_streak<3 or p.failure_streak<3 or l.last_healthy_at is null or p.last_healthy_at is null or l.last_seen_at<now()-interval '3 minutes' or p.last_seen_at<now()-interval '3 minutes' or e.last_seen_at<now()-interval '15 minutes' or l.first_failure_at>now()-interval '2 minutes' or p.first_failure_at>now()-interval '2 minutes' or (l.details->>'restart_safe') is distinct from 'true' then return jsonb_build_object('granted',false,'reason','OUTAGE_NOT_CONFIRMED');end if;
select * into i from public.waouh_guardian_incidents where component='web_public' and resolved_at is null;
if i.id is null or i.status<>'confirmed' or exists(select 1 from public.waouh_guardian_actions where incident_id=i.id) then return jsonb_build_object('granted',false,'reason','INCIDENT_NOT_ELIGIBLE');end if;
if exists(select 1 from public.waouh_guardian_actions where started_at>now()-interval '1 hour') or(select count(*) from public.waouh_guardian_actions where started_at>now()-interval '24 hours')>=2 then return jsonb_build_object('granted',false,'reason','REPAIR_BUDGET_EXHAUSTED');end if;
insert into public.waouh_guardian_actions(request_id,incident_id,action) values(p_request_id,i.id,'restart_web') returning id into a;
update public.waouh_guardian_incidents set status='repairing' where id=i.id;
insert into public.waouh_guardian_audit(event,details) values('restart_claimed',jsonb_build_object('action_id',a,'incident_id',i.id));
return jsonb_build_object('granted',true,'action_id',a,'expires_at',now()+interval '2 minutes');end $$;

create function public.waouh_guardian_finish_restart(p_action_id uuid,p_status text,p_reason text) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare a public.waouh_guardian_actions;
begin
perform 1 from public.waouh_guardian_settings where id for update;
if p_status not in('succeeded','failed','not_executed') or p_reason !~ '^[A-Z_]{2,64}$' then raise exception 'invalid_guardian_result';end if;
select * into a from public.waouh_guardian_actions where id=p_action_id;if a.id is null or a.status<>'claimed' then return jsonb_build_object('accepted',false);end if;
update public.waouh_guardian_actions set status=p_status,finished_at=now(),reason_code=p_reason where id=a.id;
update public.waouh_guardian_incidents set status=case when p_status='succeeded' then 'verifying' else 'needs_attention' end where id=a.incident_id and resolved_at is null;
insert into public.waouh_guardian_audit(event,details) values('restart_finished',jsonb_build_object('action_id',a.id,'result',p_status));return jsonb_build_object('accepted',true);end $$;

create function public.waouh_guardian_client_event(p_user_id uuid,p_platform text,p_code text,p_surface text) returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare accepted uuid;b timestamptz:=date_trunc('minute',now());begin
if p_user_id is null then return false;end if;
insert into public.waouh_guardian_client_limits(user_id,bucket,count) values(p_user_id,b,1) on conflict(user_id) do update set bucket=b,count=case when public.waouh_guardian_client_limits.bucket<>b then 1 else public.waouh_guardian_client_limits.count+1 end where public.waouh_guardian_client_limits.bucket<>b or public.waouh_guardian_client_limits.count<5 returning user_id into accepted;
if accepted is null then return false;end if;
insert into public.waouh_guardian_client_events(user_id,platform,code,surface) values(p_user_id,p_platform,p_code,p_surface);return true;end $$;
create function public.waouh_guardian_configure(p_actor_id uuid,p_auto_repair boolean,p_maintenance_minutes int) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare cfg public.waouh_guardian_settings;begin
if p_actor_id is null or p_auto_repair is null or p_maintenance_minutes not in(0,30,60,240) then raise exception 'invalid_configuration';end if;
update public.waouh_guardian_settings set auto_repair_enabled=p_auto_repair,maintenance_until=case when p_maintenance_minutes is null then maintenance_until when p_maintenance_minutes=0 then null else now()+p_maintenance_minutes*interval '1 minute' end,updated_at=now(),updated_by=p_actor_id where id returning * into cfg;
insert into public.waouh_guardian_audit(actor_id,event,details) values(p_actor_id,'settings_changed',jsonb_build_object('auto_repair_enabled',p_auto_repair,'maintenance_minutes',p_maintenance_minutes));return to_jsonb(cfg);end $$;
create function public.waouh_guardian_activate() returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$begin
perform 1 from public.waouh_guardian_settings where id for update;
if exists(select 1 from public.waouh_guardian_components where component in('web_public','web_origin','web_render','database','runtime','host_monitor','external_monitor','internal_monitor') and(status<>'healthy' or last_seen_at is null or last_seen_at<now()-fresh_for_seconds*interval '1 second')) then return false;end if;
update public.waouh_guardian_settings set activated_at=now(),updated_at=now() where id and activated_at is null;if found then insert into public.waouh_guardian_audit(event) values('monitoring_activated');end if;return true;end $$;
create function public.waouh_guardian_begin_tick() returns boolean language sql security invoker set search_path='' as $$with claimed as(update public.waouh_guardian_settings set tick_lease_until=now()+interval '90 seconds' where id and(tick_lease_until is null or tick_lease_until<now()) returning id) select exists(select 1 from claimed)$$;
create function public.waouh_guardian_housekeeping() returns void language plpgsql security invoker set search_path=pg_catalog,public as $$begin
perform 1 from public.waouh_guardian_settings where id for update;
with expired as(update public.waouh_guardian_actions set status='unknown',finished_at=now(),reason_code='RESULT_MISSING' where status='claimed' and started_at<now()-interval '3 minutes' returning incident_id) update public.waouh_guardian_incidents set status='needs_attention' where id in(select incident_id from expired) and resolved_at is null;
delete from public.waouh_guardian_observations where(report_id,component,observer) in(select report_id,component,observer from public.waouh_guardian_observations where observed_at<now()-interval '14 days' limit 1000);
delete from public.waouh_guardian_client_events where id in(select id from public.waouh_guardian_client_events where created_at<now()-interval '7 days' limit 1000);
delete from public.waouh_guardian_client_limits where user_id in(select user_id from public.waouh_guardian_client_limits where bucket<now()-interval '1 day' limit 1000);end $$;
create function public.waouh_guardian_metrics() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('queue_overdue',(select count(*) from(select id from public.waouh_outbound_queue where status='pending' and created_at<now()-interval '30 minutes' and coalesce(next_attempt_at,created_at)<now() and(circuit_open_until is null or circuit_open_until<now()) limit 200)q),'client_errors',(select count(*) from public.waouh_guardian_client_events where created_at>now()-interval '10 minutes'),'affected_users',(select count(distinct user_id) from public.waouh_guardian_client_events where created_at>now()-interval '10 minutes'))$$;

-- Infrastructure: no credential is stored in cron text or returned through an API.
do $$begin
if not exists(select 1 from vault.secrets where name='waouh_guardian_host_secret') then perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'waouh_guardian_host_secret');end if;
if not exists(select 1 from vault.secrets where name='waouh_guardian_external_secret') then perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'waouh_guardian_external_secret');end if;end $$;
create function guardian_private.probe_actor(p_token text) returns text language sql stable security definer set search_path='' as $$select case name when 'waouh_guardian_host_secret' then 'host' else 'external' end from vault.decrypted_secrets where name in('waouh_guardian_host_secret','waouh_guardian_external_secret') and length(p_token)=64 and decrypted_secret=p_token limit 1$$;
create function public.waouh_guardian_probe_actor(p_token text) returns text language sql stable security invoker set search_path='' as $$select guardian_private.probe_actor(p_token)$$;
create function guardian_private.collectors_enabled() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('site',exists(select 1 from cron.job where jobname='waouh-radar-site-scraper-6h' and active),'apify',exists(select 1 from cron.job where jobname='waouh-radar-apify-6h' and active))$$;
create function public.waouh_guardian_collectors_enabled() returns jsonb language sql stable security invoker set search_path='' as $$select guardian_private.collectors_enabled()$$;
-- All functions, including private definer adapters, are service-only.
do $$declare f record;begin
for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='guardian_private' or(n.nspname='public' and p.proname like 'waouh_guardian_%') loop
execute format('revoke all on function %s from public,anon,authenticated',f.signature);
execute format('grant execute on function %s to service_role',f.signature);end loop;end $$;
select cron.schedule('waouh-guardian-observer','*/2 * * * *',$cron$
select net.http_post(url:='https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-health-check',headers:=jsonb_build_object('Content-Type','application/json','X-Waouh-Internal',(select decrypted_secret from vault.decrypted_secrets where name='waouh_runtime_internal_secret' limit 1)),body:='{"action":"guardian.tick"}'::jsonb,timeout_milliseconds:=55000);
$cron$);
