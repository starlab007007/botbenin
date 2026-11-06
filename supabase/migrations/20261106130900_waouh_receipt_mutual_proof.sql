-- Réception honnête : la confirmation de remise devient mutuelle (demandeur ET interlocuteur),
-- avec une note et une photo facultatives comme preuve. Aucun suivi coursier n'est ajouté :
-- seule l'étape "Réception" déjà existante est complétée, sans rien prétendre de plus.

alter table public.waouh_business_evidence
  add column if not exists receipt_note text,
  add column if not exists receipt_photo_url text,
  add column if not exists receipt_handover_at timestamptz,
  add column if not exists receipt_handover_note text,
  add column if not exists receipt_handover_photo_url text;

create or replace function public.waouh_business_command(p_actor uuid,p_action text,p jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
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
   -- Preuve facultative (note + photo) : validée pour la réception ET la remise, jamais obligatoire.
   if p_action='business.receipt' and (p->>'text') is not null and length(trim(p->>'text'))>0 and length(trim(p->>'text')) not between 3 and 500 then raise exception 'invalid_receipt_note';end if;
   if p_action='business.receipt' and (p->>'photo_url') is not null and length(trim(p->>'photo_url'))>0 and (length(p->>'photo_url')>500 or p->>'photo_url' !~ '^https?://') then raise exception 'invalid_receipt_photo';end if;
   if p_action='business.receipt' and buyer then
    update public.waouh_business_evidence set receipt_at=coalesce(receipt_at,now()),
     receipt_note=coalesce(nullif(trim(p->>'text'),''),receipt_note),
     receipt_photo_url=coalesce(nullif(trim(p->>'photo_url'),''),receipt_photo_url)
     where component_id=c.id and version=a.version;
   elsif p_action='business.receipt' and not buyer then
    -- Côté interlocuteur (remise) : même geste, pour une confirmation mutuelle réelle.
    update public.waouh_business_evidence set receipt_handover_at=coalesce(receipt_handover_at,now()),
     receipt_handover_note=coalesce(nullif(trim(p->>'text'),''),receipt_handover_note),
     receipt_handover_photo_url=coalesce(nullif(trim(p->>'photo_url'),''),receipt_handover_photo_url)
     where component_id=c.id and version=a.version;
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

create or replace function public.waouh_room_snapshot(p_actor uuid,p_room uuid,p_before bigint default null,p_before_message uuid default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.waouh_deal_room_links;c public.waouh_convergence_components;m public.waouh_convergence_missions;
 a public.waouh_convergence_agreements;msgs jsonb;ev jsonb;own boolean;actions jsonb;closed boolean;buyer boolean;e public.waouh_business_evidence;
begin
 select * into r from public.waouh_deal_room_links where id=p_room;
 select * into c from public.waouh_convergence_components where id=r.id;
 select * into m from public.waouh_convergence_missions where id=c.mission_id;
 if r.id is null or (p_actor is distinct from m.owner_id and p_actor is distinct from c.provider_id) then raise exception 'forbidden' using errcode='42501';end if;
 own=m.owner_id=p_actor;closed=m.status in ('completed','cancelled') or r.blocked_reason is not null;
 select * into a from public.waouh_convergence_agreements where component_id=c.id;
 select * into e from public.waouh_business_evidence where component_id=c.id and version=coalesce(a.version,0);
 buyer=case when m.criteria ? 'workflow:sale' then not own else own end;
 select coalesce(jsonb_agg(x order by x->>'created_at',x->>'id'),'[]') into msgs from (
 select jsonb_build_object('id',id,'text',text,'mine',actor_id=p_actor,'author_kind',author_kind,'created_at',created_at,'status','recorded') x
 from public.waouh_business_messages where component_id=c.id and (p_before_message is null or (created_at,id)<(select created_at,id from public.waouh_business_messages where id=p_before_message and component_id=c.id)) order by created_at desc,id desc limit 100) q;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.id),'[]') into ev from (
 select id,event_type,actor_kind,created_at,payload from public.waouh_room_events where room_id=r.id and (p_before is null or id>p_before) order by case when p_before is null then -id else id end limit 100) q;
 actions='[]'::jsonb;if a.status='completed' then actions='["rating"]'::jsonb;end if;
 if not closed then
 if c.provider_id is not null then actions=actions||'["message"]';if c.kind<>'announcement' then actions=actions||'["propose"]';end if;end if;
 if c.kind='announcement' and own then actions=actions||'["application_prepare"]';if e.application_prepared_at is not null and e.application_submitted_at is null then actions=actions||'["application_submit"]';end if;end if;
 if own then actions=actions||'["delegate","takeover","pause","resume_bot","invite"]';if r.control_mode='bot' and r.mandate->>'mode'<>'autonomous' then actions=actions||'["approve_step"]';end if;end if;
 if a.id is not null and a.status='proposed' then actions=actions||'["accept","reject"]';end if;
 if a.status='accepted' then
 actions=actions||'["issue"]';
 if e.issue is null then
 if buyer and e.receipt_at is null then actions=actions||'["receipt"]';end if;
 if not buyer and e.receipt_handover_at is null then actions=actions||'["receipt"]';end if;
 if buyer and e.payment_reported_at is null then actions=actions||'["payment_report"]';end if;
 if not buyer and e.payment_reported_at is not null and e.payment_received_at is null then actions=actions||'["payment_receive"]';end if;
 if e.receipt_at is not null and e.payment_received_at is not null and (case when own then a.owner_completed_at else a.provider_completed_at end) is null then actions=actions||'["complete"]';end if;
 end if;
 end if;
 end if;
 return jsonb_build_object('deal_room_id',r.id,'thread_id',r.thread_id,'mission_id',m.id,'component_id',c.id,
 'blocked_reason',r.blocked_reason,'is_owner',own,'buyer',buyer,'kind',c.kind,'title',c.title,'city',m.city,'product',c.source_snapshot->'product','price',c.amount,
 'provider_joined',c.provider_id is not null,'control_mode',r.control_mode,'mandate_revision',r.mandate_revision,
 'mandate',case when own then r.mandate else null end,'expires_at',case when own then r.expires_at else null end,'next_run_at',case when own then r.next_run_at else null end,
 'initial_price_proposal',(select payload||jsonb_build_object('revision',id) from public.waouh_room_events where room_id=r.id and actor_kind='bot' and payload->>'amount' is not null order by id desc limit 1),'agreement',case when a.id is null then null else to_jsonb(a) end,'current_offer_version',coalesce(a.version,0),'last_offer_mine',r.last_offer_actor=p_actor,
 'messages',msgs,'message_cursor',case when jsonb_array_length(msgs)=100 then msgs->0->>'id' else null end,'counterparty_name',(select coalesce(to_jsonb(u)->>'display_name','Interlocuteur') from public.waouh_users u where u.auth_user_id=case when own then c.provider_id else m.owner_id end order by u.id limit 1),'events',ev,'allowed_actions',actions,'closed',closed,
 'evidence',to_jsonb(e),
 'next_action',case when closed then 'completed' when a.status='accepted' then 'follow' when a.status='proposed' then 'review' when c.provider_id is null then 'invite' when r.control_mode='bot' then 'bot_running' else 'message' end);
end $$;
