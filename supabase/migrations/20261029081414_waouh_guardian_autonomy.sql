-- Notify meaningful changes once, and escalate repairs whose outcome is unknown.
alter table public.waouh_guardian_incidents add column notified_states text[] not null default '{}';
update public.waouh_guardian_incidents set notified_states=array['incident:'||severity||':'||cause_code] where notified_at is not null;

create or replace function guardian_private.notify_incident(p_id uuid,p_recovered boolean default false) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v public.waouh_guardian_incidents;cfg public.waouh_guardian_settings;state_key text;sent int;
begin
select * into v from public.waouh_guardian_incidents where id=p_id for update;
select * into cfg from public.waouh_guardian_settings where id;
if v.id is null or not cfg.alerts_enabled or cfg.activated_at is null or cfg.maintenance_until>now() then return;end if;
if p_recovered then
 if v.resolution_code is distinct from 'RECOVERED' or v.notified_at is null or v.recovery_notified_at is not null then return;end if;
else
 if v.status not in('confirmed','repairing','verifying','needs_attention') then return;end if;
 state_key:=case when v.status='needs_attention' then 'attention:' else 'incident:' end||v.severity||':'||v.cause_code;
 if state_key=any(v.notified_states) then return;end if;
end if;
insert into public.notifications(user_id,title,content,type,action_url,metadata)
select distinct ur.user_id,
case when p_recovered then 'GUARDIAN : service rétabli' when v.status='needs_attention' then 'GUARDIAN : intervention nécessaire' else 'GUARDIAN : attention requise' end,
case when p_recovered then 'Le retour à la normale a été confirmé.'
when v.status='needs_attention' then 'Le rétablissement automatique n’a pas été confirmé. Une vérification humaine est nécessaire.'
when v.component in('observer_health','internal_monitor','external_monitor','host_monitor','runtime') then 'La continuité de la surveillance doit être vérifiée.'
when v.component in('web_public','web_render') then 'L’accès à l’application est perturbé.'
when v.component='whatsapp' then 'La connexion WhatsApp nécessite une vérification.'
else 'Une dégradation du service a été confirmée.' end||' Consultez le suivi de fiabilité.',
'system','/admin/waouh/guardian',jsonb_build_object('guardian_incident_id',v.id,'recovered',p_recovered)
from public.user_roles ur join public.roles r on r.id=ur.role_id where r.name in('admin','super_admin');
get diagnostics sent = row_count;
if sent=0 then return;end if;
if p_recovered then update public.waouh_guardian_incidents set recovery_notified_at=now() where id=p_id;
else update public.waouh_guardian_incidents set notified_at=coalesce(notified_at,now()),notified_states=array_append(notified_states,state_key) where id=p_id;end if;
exception when others then raise log 'guardian_notification_unavailable';end $$;

create or replace function public.waouh_guardian_housekeeping() returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare incident record;
begin
perform 1 from public.waouh_guardian_settings where id for update;
with expired as(update public.waouh_guardian_actions set status='unknown',finished_at=now(),reason_code='RESULT_MISSING' where status='claimed' and started_at<now()-interval '3 minutes' returning incident_id)
update public.waouh_guardian_incidents set status='needs_attention',cause_code='RESULT_MISSING' where id in(select incident_id from expired) and resolved_at is null;
update public.waouh_guardian_incidents i set status='needs_attention',cause_code='RECOVERY_UNCONFIRMED'
where i.status='verifying' and i.resolved_at is null and exists(select 1 from public.waouh_guardian_actions a where a.incident_id=i.id and a.status='succeeded' and a.finished_at<now()-interval '20 minutes');
-- Retries after maintenance or temporary notification failure, without duplicates.
for incident in select id,resolved_at,resolution_code from public.waouh_guardian_incidents where resolved_at is null and status<>'detected' or resolution_code='RECOVERED' and notified_at is not null and recovery_notified_at is null loop
 perform guardian_private.notify_incident(incident.id,incident.resolution_code='RECOVERED');
end loop;
delete from public.waouh_guardian_observations where(report_id,component,observer) in(select report_id,component,observer from public.waouh_guardian_observations where observed_at<now()-interval '14 days' limit 1000);
delete from public.waouh_guardian_client_events where id in(select id from public.waouh_guardian_client_events where created_at<now()-interval '7 days' limit 1000);
delete from public.waouh_guardian_client_limits where user_id in(select user_id from public.waouh_guardian_client_limits where bucket<now()-interval '1 day' limit 1000);
end $$;
revoke all on function guardian_private.notify_incident(uuid,boolean),public.waouh_guardian_housekeeping() from public,anon,authenticated;
grant execute on function guardian_private.notify_incident(uuid,boolean),public.waouh_guardian_housekeeping() to service_role;
