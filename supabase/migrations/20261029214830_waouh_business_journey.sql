-- Participant-scoped business conversation and evidence, on the existing mission.
create table public.waouh_business_messages (
 id uuid primary key default gen_random_uuid(),component_id uuid not null references public.waouh_convergence_components(id) on delete cascade,
 actor_id uuid not null references auth.users(id),request_id uuid not null,text text not null check(length(text) between 1 and 2000),created_at timestamptz not null default now(),
 unique(actor_id,request_id)
);
create index waouh_business_messages_component_idx on public.waouh_business_messages(component_id,created_at);
create table public.waouh_business_evidence (
 component_id uuid not null references public.waouh_convergence_components(id) on delete cascade,version integer not null,
 receipt_at timestamptz,payment_reported_at timestamptz,payment_received_at timestamptz,issue text,issue_at timestamptz,
 owner_rating integer check(owner_rating between 1 and 5),provider_rating integer check(provider_rating between 1 and 5),
 application_prepared_at timestamptz,application_submitted_at timestamptz,primary key(component_id,version)
);
alter table public.waouh_business_messages enable row level security;
alter table public.waouh_business_evidence enable row level security;
revoke all on public.waouh_business_messages,public.waouh_business_evidence from public,anon,authenticated;
grant all on public.waouh_business_messages,public.waouh_business_evidence to service_role;

create function public.waouh_business_bundle(p_actor uuid,p_mid uuid) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare b jsonb; msgs jsonb; ev jsonb;
begin
 b=public.waouh_convergence_bundle(p_actor,p_mid);
 select coalesce(jsonb_agg(x order by x->>'created_at'),'[]') into msgs from (
 select jsonb_build_object('id',msg.id,'component_id',msg.component_id,'mine',msg.actor_id=p_actor,'text',msg.text,'created_at',msg.created_at,'status','recorded') x
 from public.waouh_business_messages msg join public.waouh_convergence_components c on c.id=msg.component_id join public.waouh_convergence_missions m on m.id=c.mission_id
 where m.id=p_mid and (m.owner_id=p_actor or c.provider_id=p_actor) order by msg.created_at desc limit 100) s;
 select coalesce(jsonb_agg(to_jsonb(e)),'[]') into ev from public.waouh_business_evidence e join public.waouh_convergence_components c on c.id=e.component_id join public.waouh_convergence_missions m on m.id=c.mission_id where m.id=p_mid and (m.owner_id=p_actor or c.provider_id=p_actor);
 return b||jsonb_build_object('messages',msgs,'evidence',ev);
end $$;
revoke all on function public.waouh_business_bundle(uuid,uuid) from public,anon,authenticated;
grant execute on function public.waouh_business_bundle(uuid,uuid) to service_role;

create function public.waouh_business_completion_guard() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare e public.waouh_business_evidence;
begin
 if old.terms->>'workflow_version'='2' then new.terms=jsonb_set(new.terms,'{workflow_version}','2');end if;
 if new.terms->>'workflow_version'='2' and new.status='completed' then
   select * into e from public.waouh_business_evidence where component_id=new.component_id and version=new.version;
   if e.receipt_at is null or e.payment_reported_at is null or e.payment_received_at is null or e.issue is not null then raise exception 'completion_evidence_required' using errcode='22023'; end if;
 end if;
 return new;
end $$;
revoke all on function public.waouh_business_completion_guard() from public,anon,authenticated;
create trigger business_completion_guard before update on public.waouh_convergence_agreements for each row execute function public.waouh_business_completion_guard();

create function public.waouh_business_command(p_actor uuid,p_action text,p jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare m public.waouh_convergence_missions;c public.waouh_convergence_components;a public.waouh_convergence_agreements;e public.waouh_business_evidence;mid uuid;pid uuid;rid uuid;own boolean;buyer boolean;b jsonb;j jsonb;count_recent integer;target_auth uuid;target_user uuid;aid uuid;
begin
 mid=nullif(p->>'mission_id','')::uuid;
 if p ? 'component_id' then select * into c from public.waouh_convergence_components where id=(p->>'component_id')::uuid;mid=c.mission_id;end if;
 select * into m from public.waouh_convergence_missions where id=mid for update;
 if not found then raise exception 'mission_not_found' using errcode='P0002';end if;
 own=m.owner_id=p_actor;
 if not own and (c.id is null or c.provider_id is distinct from p_actor) and not (p_action='business.get' and exists(select 1 from public.waouh_convergence_components where mission_id=m.id and provider_id=p_actor)) then raise exception 'forbidden' using errcode='42501';end if;
 if p_action='business.get' then return public.waouh_business_bundle(p_actor,m.id);end if;
 if p_action='business.select' then
  if not own or m.status in ('cancelled','completed','active','agreed') then raise exception 'selection_unavailable' using errcode='22023';end if;
  j=p->'source';
  if length(coalesce(j->>'title','')) not between 2 and 300 or length(coalesce(j->>'source_ref','')) not between 1 and 300 or j->>'kind' not in ('product','service','announcement') then raise exception 'invalid_source' using errcode='22023';end if;
  select plan_id into pid from public.waouh_convergence_components where mission_id=m.id and source_ref=j->>'source_ref' limit 1;
  if pid is null then b=public.waouh_convergence_command(p_actor,'plan_add',jsonb_build_object('mission_id',m.id,'title',left(j->>'title',200)));select id into pid from public.waouh_convergence_plans where mission_id=m.id order by created_at desc limit 1;perform public.waouh_convergence_command(p_actor,'plan_select',jsonb_build_object('mission_id',m.id,'plan_id',pid));end if;
  if m.selected_plan_id is distinct from pid then perform public.waouh_convergence_command(p_actor,'plan_select',jsonb_build_object('mission_id',m.id,'plan_id',pid));end if;
  perform public.waouh_convergence_command(p_actor,'component_add',j||jsonb_build_object('mission_id',m.id,'plan_id',pid));
  select id into rid from public.waouh_convergence_components where plan_id=pid and source_ref=j->>'source_ref';
  return public.waouh_business_bundle(p_actor,m.id)||jsonb_build_object('selected_component_id',rid);
 end if;
 if c.id is null or (not own and c.provider_id is distinct from p_actor) then raise exception 'forbidden' using errcode='42501';end if;
 if p_action='business.contact' then
  if not own or p->>'confirmed' is distinct from 'true' then raise exception 'explicit_confirmation_required' using errcode='42501';end if;
  if m.selected_plan_id is distinct from c.plan_id then perform public.waouh_convergence_command(p_actor,'plan_select',jsonb_build_object('mission_id',m.id,'plan_id',c.plan_id));end if;
  if c.provider_id is not null then return public.waouh_business_bundle(p_actor,m.id);end if;
  if c.source_ref ~ '^article:[0-9a-f-]{36}$' then
   aid=substring(c.source_ref from 9)::uuid;
   select u.auth_user_id,u.id into target_auth,target_user from public.waouh_articles ar join public.waouh_users u on u.id=ar.seller_id where ar.id=aid and ar.status='active';
  end if;
  if target_auth is null or target_auth=p_actor then return public.waouh_business_bundle(p_actor,m.id)||jsonb_build_object('needs_invite',true);end if;
  update public.waouh_convergence_components set provider_id=target_auth where id=c.id;
  insert into public.waouh_notifications(user_id,notification_type,article_id,photos,payload,channel,delivery_status,dedupe_key)
  values(target_user,'new_buyer',aid,array(select jsonb_array_elements_text(coalesce(c.source_snapshot->'product'->'photos','[]'))),jsonb_build_object('text','Une demande vous attend : '||c.title,'url','/app/premium?mission_id='||m.id||'&component_id='||c.id||'&screen=seller','mission_id',m.id,'component_id',c.id),'waouh_app','recorded','business-request:'||c.id) on conflict do nothing;
  return public.waouh_business_bundle(p_actor,m.id);
 end if;
 select * into a from public.waouh_convergence_agreements where component_id=c.id for update;
 if p_action='business.rating' then
  if a.status is distinct from 'completed' or (p->>'rating')::integer not between 1 and 5 or p->>'rating' is null then raise exception 'rating_unavailable' using errcode='22023';end if;
  insert into public.waouh_business_evidence(component_id,version) values(c.id,a.version) on conflict do nothing;
  update public.waouh_business_evidence set owner_rating=case when own then (p->>'rating')::integer else owner_rating end,provider_rating=case when not own then (p->>'rating')::integer else provider_rating end where component_id=c.id and version=a.version;
  return public.waouh_business_bundle(p_actor,m.id);
 end if;
 if m.status in ('cancelled','completed') then raise exception 'mission_closed' using errcode='22023';end if;
 if p_action='business.message' then
  if c.provider_id is null then raise exception 'contact_not_joined' using errcode='22023';end if;
  if length(trim(coalesce(p->>'text',''))) not between 1 and 2000 then raise exception 'invalid_message' using errcode='22023';end if;
  rid=(p->>'request_id')::uuid;if rid is null then raise exception 'request_required';end if;
  if exists(select 1 from public.waouh_business_messages where actor_id=p_actor and request_id=rid and component_id<>c.id) then raise exception 'request_scope_changed';end if;
  select count(*) into count_recent from public.waouh_business_messages where actor_id=p_actor and created_at>now()-interval '1 minute';if count_recent>=20 then raise exception 'rate_limited' using errcode='54000';end if;
  insert into public.waouh_business_messages(component_id,actor_id,request_id,text) values(c.id,p_actor,rid,trim(p->>'text')) on conflict(actor_id,request_id) do nothing;
 elsif p_action in ('business.application_prepare','business.application_submit') then
  if not own or c.kind<>'announcement' then raise exception 'forbidden' using errcode='42501';end if;
  insert into public.waouh_business_evidence(component_id,version) values(c.id,0) on conflict do nothing;
  if p_action='business.application_prepare' then update public.waouh_business_evidence set application_prepared_at=coalesce(application_prepared_at,now()) where component_id=c.id and version=0;
  else
   if p->>'confirmation' is distinct from 'submitted' or not exists(select 1 from public.waouh_business_evidence where component_id=c.id and version=0 and application_prepared_at is not null) then raise exception 'application_confirmation_required';end if;
   update public.waouh_business_evidence set application_submitted_at=coalesce(application_submitted_at,now()) where component_id=c.id and version=0;
  end if;
 else
  if a.id is null or (p->>'version')::integer is distinct from a.version then raise exception 'agreement_unavailable_or_changed' using errcode='22023';end if;
  insert into public.waouh_business_evidence(component_id,version) values(c.id,a.version) on conflict do nothing;
  select * into e from public.waouh_business_evidence where component_id=c.id and version=a.version for update;
  if p_action='business.issue' then
   if length(trim(coalesce(p->>'text',''))) not between 3 and 1000 then raise exception 'invalid_issue';end if;
   update public.waouh_business_evidence set issue=trim(p->>'text'),issue_at=now() where component_id=c.id and version=a.version;
  else
   if a.status<>'accepted' or e.issue is not null then raise exception 'confirmed_agreement_required' using errcode='22023';end if;
   buyer=case when m.criteria ? 'workflow:sale' then not own else own end;
   if p_action='business.receipt' and buyer then
    update public.waouh_business_evidence set receipt_at=coalesce(receipt_at,now()) where component_id=c.id and version=a.version;
   elsif p_action='business.payment_report' and buyer then
    update public.waouh_business_evidence set payment_reported_at=coalesce(payment_reported_at,now()) where component_id=c.id and version=a.version;
   elsif p_action='business.payment_receive' and not buyer and e.payment_reported_at is not null then
    update public.waouh_business_evidence set payment_received_at=coalesce(payment_received_at,now()) where component_id=c.id and version=a.version;
   elsif p_action='business.complete' then
    if e.receipt_at is null or e.payment_reported_at is null or e.payment_received_at is null then raise exception 'completion_evidence_required' using errcode='22023';end if;
    perform public.waouh_convergence_command(p_actor,'agreement_complete',jsonb_build_object('component_id',c.id,'version',a.version));
   else raise exception 'participant_role_required' using errcode='42501';end if;
  end if;
 end if;
 insert into public.waouh_convergence_events(actor_id,mission_id,event_type,payload) values(p_actor,m.id,p_action,jsonb_build_object('component_id',c.id));
 return public.waouh_business_bundle(p_actor,m.id);
end $$;
revoke all on function public.waouh_business_command(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.waouh_business_command(uuid,text,jsonb) to service_role;
