-- Sale and purchase use the same room commands and the same agreement/version checks.
CREATE OR REPLACE FUNCTION public.waouh_room_command(p_actor uuid, p_action text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.waouh_deal_room_links;c public.waouh_convergence_components;m public.waouh_convergence_missions;
 a public.waouh_convergence_agreements;rid uuid;mid uuid;cid uuid;req uuid;b jsonb;old public.waouh_room_requests;
 rules jsonb;own boolean;n numeric;budget numeric;initial numeric;duration integer;maxf integer;
begin
 if p_actor is null then raise exception 'forbidden' using errcode='42501';end if;
 if p_action='list' then return jsonb_build_object('rooms',coalesce((select jsonb_agg(x) from (
 select jsonb_build_object('deal_room_id',l.id,'title',cc.title,'control_mode',l.control_mode,'created_at',l.created_at) x
 from public.waouh_deal_room_links l join public.waouh_convergence_components cc on cc.id=l.id
 where l.owner_id=p_actor or cc.provider_id=p_actor order by l.created_at desc limit 100) q),'[]'));end if;
 if p_action not in ('get','events') then
 req=nullif(p->>'request_id','')::uuid;if req is null then raise exception 'request_required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||req::text,42));
 select * into old from public.waouh_room_requests where actor_id=p_actor and request_id=req;
 if found then
 if old.request_body is distinct from jsonb_build_object('action',p_action,'payload',p) then raise exception 'request_scope_changed';end if;
 return public.waouh_room_snapshot(p_actor,(old.response->>'deal_room_id')::uuid)||case when old.response ? 'token' then jsonb_build_object('token',old.response->'token') else '{}'::jsonb end||jsonb_build_object('replayed',true);
 end if;
 end if;
 if p_action='open' then
 if length(coalesce(p->'source'->>'source_ref','')) not between 1 and 300 then raise exception 'invalid_source';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||(p->'source'->>'source_ref'),43));
 select l.* into r from public.waouh_deal_room_links l join public.waouh_convergence_components cc on cc.id=l.id
 join public.waouh_convergence_missions mm on mm.id=cc.mission_id
 where l.owner_id=p_actor and l.source_ref=p->'source'->>'source_ref' and l.active and mm.status not in ('completed','cancelled');
 if r.id is null then
 update public.waouh_deal_room_links l set active=false from public.waouh_convergence_components cc,public.waouh_convergence_missions mm
 where l.id=cc.id and cc.mission_id=mm.id and l.owner_id=p_actor and l.source_ref=p->'source'->>'source_ref' and mm.status in ('completed','cancelled');
 b=public.waouh_convergence_command(p_actor,'create',jsonb_build_object('request_key','room:'||req,'kind',p->'source'->>'kind','goal',p->'source'->>'title','city',coalesce(nullif(p->>'city',''),'À préciser'),'budget_max',p->'budget_max',
 'criteria',case when (p->'source'->>'source_ref') like 'sale:%' then '["workflow:sale"]'::jsonb else '[]'::jsonb end));
 mid=(b->'mission'->>'id')::uuid;
 b=public.waouh_business_command(p_actor,'business.select',jsonb_build_object('mission_id',mid,'source',p->'source'));
 cid=(b->>'selected_component_id')::uuid;
 insert into public.waouh_deal_room_links(id,owner_id,source_ref) values(cid,p_actor,p->'source'->>'source_ref') returning * into r;
 end if;
 elsif p_action='adopt' then
 select * into c from public.waouh_convergence_components where id=(p->>'component_id')::uuid;
 select * into m from public.waouh_convergence_missions where id=c.mission_id for update;
 if m.owner_id is distinct from p_actor and c.provider_id is distinct from p_actor then raise exception 'forbidden' using errcode='42501';end if;
 insert into public.waouh_deal_room_links(id,owner_id,source_ref) values(c.id,m.owner_id,coalesce(c.source_ref,'component:'||c.id)) on conflict(id) do nothing;
 select * into r from public.waouh_deal_room_links where id=c.id;
 else select * into r from public.waouh_deal_room_links where id=(p->>'deal_room_id')::uuid;end if;
 if r.id is null then raise exception 'room_not_found';end if;
 select * into c from public.waouh_convergence_components where id=r.id;
 select * into r from public.waouh_deal_room_links where id=r.id for update;
 select * into m from public.waouh_convergence_missions where id=c.mission_id for update;
 own=m.owner_id=p_actor;
 if not own and c.provider_id is distinct from p_actor then raise exception 'forbidden' using errcode='42501';end if;
 if p_action in ('get','events') then return public.waouh_room_snapshot(p_actor,r.id,nullif(p->>'after','')::bigint,nullif(p->>'before_message','')::uuid);end if;
 if r.blocked_reason is not null then raise exception 'legacy_room_requires_reconciliation';end if;
 if m.status in ('completed','cancelled') and p_action<>'rating' then raise exception 'room_closed';end if;
 select * into a from public.waouh_convergence_agreements where component_id=c.id;
 if p_action='contact' or (p_action='open' and p->>'confirmed'='true') then
 b=public.waouh_business_open(p_actor,jsonb_build_object('mission_id',m.id,'component_id',c.id,'confirmed',p->'confirmed'));
 elsif p_action in ('delegate','resume_bot','takeover','pause','approve_step') then
 if not own then raise exception 'owner_required' using errcode='42501';end if;
 if (p->>'mandate_revision')::integer is distinct from r.mandate_revision then raise exception 'mandate_revision_changed';end if;
 if p_action='approve_step' then
 if r.control_mode<>'bot' or r.expires_at<=now() or (p->>'version')::integer is distinct from coalesce(a.version,0) then raise exception 'approval_stale';end if;
 update public.waouh_deal_room_links set mandate=mandate||jsonb_build_object('one_step_approved',true,'approved_version',coalesce(a.version,0)),next_run_at=now() where id=r.id;
 elsif p_action in ('delegate','resume_bot') then
 if p->>'confirmed' is distinct from 'true' then raise exception 'confirmation_required';end if;
 if a.status in ('accepted','completed') then raise exception 'agreement_already_confirmed';end if;
 if exists(select 1 from public.waouh_avatar_prefs where auth_user_id=p_actor and autonomy_settings->>'paused'='true') then raise exception 'avatar_account_paused';end if;
 rules=case when p_action='resume_bot' then r.mandate else p->'rules' end;
 rules=rules-'one_step_approved'-'approved_version';
 if rules->>'mode' not in ('assisted','semi_autonomous','autonomous') or rules->>'mode' is null then raise exception 'invalid_mode';end if;
 budget=nullif(rules->>'budget_max','')::numeric;initial=nullif(rules->>'initial_offer','')::numeric;
 duration=coalesce((rules->>'duration_hours')::integer,72);maxf=coalesce((rules->>'max_followups')::integer,1);
 if budget is not null and (budget<1 or budget>1e8 or budget::text='NaN') then raise exception 'invalid_budget';end if;
 if initial is not null and (initial<1 or initial>1e8 or initial::text='NaN' or budget is null or initial>budget) then raise exception 'initial_offer_outside_budget';end if;
 if duration not between 1 and 168 or maxf not between 0 and 2 then raise exception 'invalid_limits';end if;
 if rules->>'active_start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or rules->>'active_end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or rules->>'active_start'>=rules->>'active_end' or not(rules ?& array['active_start','active_end']) then raise exception 'invalid_hours';end if;
 if p_action='resume_bot' and r.expires_at<=now() then raise exception 'mandate_expired';end if;
 if budget is not null then update public.waouh_convergence_missions set budget_max=budget where id=m.id;end if;
 update public.waouh_deal_room_links set mandate=rules,mandate_revision=mandate_revision+1,control_mode='bot',
 expires_at=case when p_action='resume_bot' then expires_at else now()+make_interval(hours=>duration) end,next_run_at=now() where id=r.id;
 -- This is the sole authorized first contact for this room, including retries.
 b=public.waouh_business_open(p_actor,jsonb_build_object('mission_id',m.id,'component_id',c.id,'confirmed',true));update public.waouh_business_messages set author_kind='bot' where component_id=c.id and actor_id=p_actor and request_id=md5('waouh-interest:'||p_actor::text||':'||c.id::text)::uuid and created_at=now();
 else update public.waouh_deal_room_links set control_mode=case when p_action='pause' then 'paused' else 'manual' end,mandate_revision=mandate_revision+1,next_run_at=null where id=r.id;
 end if;
 elsif p_action='message' then
 if own and r.control_mode='bot' then raise exception 'takeover_required';end if;
 b=public.waouh_business_command(p_actor,'business.message',jsonb_build_object('component_id',c.id,'request_id',req,'text',p->>'text'));
 elsif p_action='propose' then
 if c.kind='announcement' then raise exception 'application_process_required';end if;if a.status in ('accepted','completed') then raise exception 'agreement_already_confirmed';end if;
 if own and r.control_mode='bot' then raise exception 'takeover_required';end if;
 if (p->>'version')::integer is distinct from coalesce(a.version,0) then raise exception 'offer_version_changed';end if;
 if coalesce((p->'terms'->>'quantity')::integer,0) not between 1 and 100000 or length(trim(coalesce(p->'terms'->>'payment','')))<2 then raise exception 'complete_quantity_and_payment';end if;
 b=public.waouh_convergence_command(p_actor,'agreement_propose',jsonb_build_object('component_id',c.id,'terms',(p->'terms')||'{"workflow_version":2}'));
 update public.waouh_deal_room_links set last_offer_actor=p_actor,next_run_at=case when control_mode='bot' then now() else null end where id=r.id;
 elsif p_action in ('accept','reject') then
 b=public.waouh_convergence_command(p_actor,'agreement_'||p_action,jsonb_build_object('component_id',c.id,'version',p->'version'));
 if p_action='accept' and exists(select 1 from public.waouh_convergence_agreements where component_id=c.id and status='accepted') then
 update public.waouh_deal_room_links set control_mode='manual',next_run_at=null,mandate_revision=mandate_revision+1 where id=r.id;end if;
 elsif p_action='revoke_invite' then
 if not own or c.provider_id is not null then raise exception 'invitation_unavailable';end if;
 update public.waouh_convergence_components set invite_hash=null,invite_expires_at=null where id=c.id;
 elsif p_action='invite' then
 b=public.waouh_convergence_command(p_actor,'invite',jsonb_build_object('component_id',c.id));
 elsif p_action in ('receipt','payment_report','payment_receive','complete','issue','rating','application_prepare','application_submit','application_outcome') then
 b=public.waouh_business_command(p_actor,'business.'||p_action,p||jsonb_build_object('component_id',c.id));
 elsif p_action not in ('open','adopt') then raise exception 'unknown_action';end if;
 insert into public.waouh_room_events(room_id,actor_id,event_type,payload) values(r.id,p_actor,p_action,jsonb_build_object('version',(select version from public.waouh_convergence_agreements where component_id=c.id)));
 b=public.waouh_room_snapshot(p_actor,r.id)||case when p_action='invite' then jsonb_build_object('token',b->'token') else '{}'::jsonb end;
 insert into public.waouh_room_requests values(p_actor,req,jsonb_build_object('action',p_action,'payload',p),b);
 return b;
end $function$;

CREATE OR REPLACE FUNCTION public.waouh_business_command(p_actor uuid, p_action text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  if target_auth is null and c.source_ref ~ '^catalog:[0-9a-f-]{36}$' then
   select p.user_id,(select u.id from public.waouh_users u where u.auth_user_id=p.user_id order by u.id limit 1) into target_auth,target_user
   from public.waouh_unified_catalog cat join public.waouh_partners p on p.id=cat.partner_id
   where cat.id=substring(c.source_ref from 9)::uuid and cat.is_active and cat.source='partner' and p.user_id is not null;
  end if;
  if target_auth is null and c.source_ref ~ '^sale:[0-9a-f-]{36}:buyer:[0-9a-f-]{36}(p_actor,m.id)||jsonb_build_object('needs_invite',true);end if;
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
 elsif p_action='business.application_outcome' then
  if own or c.kind<>'announcement' or c.provider_id is distinct from p_actor then raise exception 'forbidden' using errcode='42501';end if;
  if coalesce(p->>'outcome','') not in ('retained','declined') then raise exception 'invalid_outcome' using errcode='22023';end if;
  if length(trim(coalesce(p->>'text','')))>0 and length(trim(p->>'text')) not between 3 and 500 then raise exception 'invalid_outcome_note' using errcode='22023';end if;
  if not exists(select 1 from public.waouh_business_evidence where component_id=c.id and version=0 and application_submitted_at is not null) then raise exception 'application_not_submitted' using errcode='22023';end if;
  if exists(select 1 from public.waouh_business_evidence where component_id=c.id and version=0 and application_outcome is not null) then raise exception 'application_outcome_recorded' using errcode='22023';end if;
  update public.waouh_business_evidence set application_outcome=p->>'outcome',application_outcome_at=now(),application_outcome_note=nullif(trim(coalesce(p->>'text','')),'') where component_id=c.id and version=0;
  -- La réponse conclut l'échange : Bot cesse de relancer et ne passe pas à une autre offre.
  update public.waouh_deal_room_links set control_mode='manual',next_run_at=null,mandate_revision=mandate_revision+1 where id=c.id and control_mode in ('bot','paused');
  select u.id into target_user from public.waouh_users u where u.auth_user_id=m.owner_id order by u.id limit 1;
  if target_user is not null then
   insert into public.waouh_notifications(user_id,notification_type,photos,payload,channel,delivery_status,dedupe_key)
   values(target_user,'avatar_mission_progress','{}'::text[],jsonb_build_object('text',case when p->>'outcome'='retained' then 'Bonne nouvelle : votre candidature « '||c.title||' » est retenue.' else 'Votre candidature « '||c.title||' » n’a pas été retenue.' end,'url','/app/deal-room?room_id='||c.id,'component_id',c.id),'waouh_app','recorded','application-outcome:'||c.id) on conflict do nothing;
  end if;
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
end $function$ then
   aid=split_part(c.source_ref,':',2)::uuid;
   select u.auth_user_id,u.id into target_auth,target_user
   from public.waouh_buyer_profiles bp join public.waouh_users u on u.id=bp.user_id
   join public.waouh_articles ar on ar.id=aid and ar.status='active'
   join public.waouh_users seller on seller.id=ar.seller_id and seller.auth_user_id=m.owner_id
   where bp.id=split_part(c.source_ref,':',4)::uuid and bp.is_active;
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
 elsif p_action='business.application_outcome' then
  if own or c.kind<>'announcement' or c.provider_id is distinct from p_actor then raise exception 'forbidden' using errcode='42501';end if;
  if coalesce(p->>'outcome','') not in ('retained','declined') then raise exception 'invalid_outcome' using errcode='22023';end if;
  if length(trim(coalesce(p->>'text','')))>0 and length(trim(p->>'text')) not between 3 and 500 then raise exception 'invalid_outcome_note' using errcode='22023';end if;
  if not exists(select 1 from public.waouh_business_evidence where component_id=c.id and version=0 and application_submitted_at is not null) then raise exception 'application_not_submitted' using errcode='22023';end if;
  if exists(select 1 from public.waouh_business_evidence where component_id=c.id and version=0 and application_outcome is not null) then raise exception 'application_outcome_recorded' using errcode='22023';end if;
  update public.waouh_business_evidence set application_outcome=p->>'outcome',application_outcome_at=now(),application_outcome_note=nullif(trim(coalesce(p->>'text','')),'') where component_id=c.id and version=0;
  -- La réponse conclut l'échange : Bot cesse de relancer et ne passe pas à une autre offre.
  update public.waouh_deal_room_links set control_mode='manual',next_run_at=null,mandate_revision=mandate_revision+1 where id=c.id and control_mode in ('bot','paused');
  select u.id into target_user from public.waouh_users u where u.auth_user_id=m.owner_id order by u.id limit 1;
  if target_user is not null then
   insert into public.waouh_notifications(user_id,notification_type,photos,payload,channel,delivery_status,dedupe_key)
   values(target_user,'avatar_mission_progress','{}'::text[],jsonb_build_object('text',case when p->>'outcome'='retained' then 'Bonne nouvelle : votre candidature « '||c.title||' » est retenue.' else 'Votre candidature « '||c.title||' » n’a pas été retenue.' end,'url','/app/deal-room?room_id='||c.id,'component_id',c.id),'waouh_app','recorded','application-outcome:'||c.id) on conflict do nothing;
  end if;
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
end $function$;

CREATE OR REPLACE FUNCTION public.waouh_business_open(p_actor uuid, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare c public.waouh_convergence_components; m public.waouh_convergence_missions; b jsonb; rid uuid; msg text;
begin
 select * into c from public.waouh_convergence_components where id=(p->>'component_id')::uuid;
 if c.id is null then raise exception 'forbidden' using errcode='42501';end if;
 select * into m from public.waouh_convergence_missions where id=c.mission_id for update;
 if m.owner_id is distinct from p_actor or (p->>'mission_id' is not null and (p->>'mission_id')::uuid<>m.id) then raise exception 'forbidden' using errcode='42501';end if;
 if m.status in ('completed','cancelled') then raise exception 'mission_closed';end if;
 if p->>'confirmed' is distinct from 'true' then raise exception 'explicit_confirmation_required' using errcode='42501';end if;
 b=public.waouh_business_command(p_actor,'business.contact',jsonb_build_object('component_id',c.id,'confirmed',true));
 if b->>'needs_invite'='true' then return b||jsonb_build_object('contact_state','contact_required');end if;
 -- Fixed server-side UUID; a changed browser request ID cannot duplicate the opener.
 rid=md5('waouh-interest:'||p_actor::text||':'||c.id::text)::uuid;
 if exists(select 1 from public.waouh_business_messages where actor_id=p_actor and request_id=rid) then
  return b||jsonb_build_object('contact_state','recorded');
 end if;
 msg=case when m.criteria ? 'workflow:sale' then 'Bonjour, votre recherche correspond à mon annonce. Souhaitez-vous en discuter ?'
 when c.kind='service' then 'Bonjour, je souhaite un devis pour cette prestation.'
 when c.kind='announcement' then 'Bonjour, je souhaite connaître les modalités de cette opportunité.'
 else 'Bonjour, je suis intéressé. Cette offre est-elle disponible ?' end;
 b=public.waouh_business_command(p_actor,'business.message',jsonb_build_object('component_id',c.id,'request_id',rid,'text',msg));
 return b||jsonb_build_object('contact_state','recorded');
end $function$;

CREATE OR REPLACE FUNCTION public.waouh_room_attach_pending_guest(p_room uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare c public.waouh_convergence_components;own uuid;
begin
 select * into c from public.waouh_convergence_components where id=p_room for update;
 if c.id is null or c.provider_id is not null or (coalesce(c.source_ref,'') not like 'external:%' and coalesce(c.source_ref,'') not like 'sale:%:external:%') then return false;end if;
 select owner_id into own from public.waouh_deal_room_links where id=p_room;
 update public.waouh_convergence_components set provider_id=public.waouh_room_guest_actor() where id=c.id;
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type,payload) values(p_room,own,'system','seller_pending','{}');
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.waouh_room_tick(p_limit integer DEFAULT 20, p_room_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.waouh_deal_room_links;c public.waouh_convergence_components;m public.waouh_convergence_missions;
 a public.waouh_convergence_agreements;counted integer=0;price numeric;budget numeric;floor_price numeric;is_sale boolean;msg text;req uuid;local_clock text;terms jsonb;
begin
 for r in select * from public.waouh_deal_room_links where active and control_mode='bot' and next_run_at<=now() and (p_room_id is null or id=p_room_id) order by next_run_at limit least(greatest(p_limit,1),50) for update skip locked loop
 begin
 price=null;
 if (select count(*) from public.waouh_module_policy(r.owner_id) where module_key in ('nexus','missions','avatar') and access_enabled and automation_enabled)<>3 then update public.waouh_deal_room_links set next_run_at=now()+interval '15 minutes' where id=r.id;continue;end if;
 select * into c from public.waouh_convergence_components where id=r.id;
 select * into m from public.waouh_convergence_missions where id=c.mission_id;
 if r.expires_at<=now() or m.status in ('completed','cancelled') then update public.waouh_deal_room_links set control_mode='paused',next_run_at=null where id=r.id;continue;end if;
 local_clock=to_char(now() at time zone 'Africa/Lagos','HH24:MI');
 if local_clock<r.mandate->>'active_start' or local_clock>=r.mandate->>'active_end' then update public.waouh_deal_room_links set next_run_at=now()+interval '15 minutes' where id=r.id;continue;end if;
 if exists(select 1 from public.waouh_avatar_prefs where auth_user_id=r.owner_id and autonomy_settings->>'paused'='true') then update public.waouh_deal_room_links set next_run_at=now()+interval '15 minutes' where id=r.id;continue;end if;
 if c.provider_id is null then update public.waouh_deal_room_links set next_run_at=now()+interval '10 minutes' where id=r.id;continue;end if;
 select * into a from public.waouh_convergence_agreements where component_id=c.id;
 is_sale=m.criteria ? 'workflow:sale';
 floor_price=case when is_sale and c.amount>0 then c.amount end;
 budget=nullif(r.mandate->>'budget_max','')::numeric;
 if r.mandate->>'mode'<>'autonomous' and (coalesce((r.mandate->>'one_step_approved')::boolean,false)=false or coalesce((r.mandate->>'approved_version')::integer,-1)<>coalesce(a.version,0)) then update public.waouh_deal_room_links set next_run_at=null where id=r.id;continue;end if;
 if a.status in ('accepted','completed','rejected') then update public.waouh_deal_room_links set next_run_at=null where id=r.id;continue;end if;
 msg=null;
 if a.id is not null and r.last_offer_actor=c.provider_id and a.version>r.processed_offer_version then
 if r.mandate->>'mode'='autonomous' and r.counter_rounds<3 and ((is_sale and floor_price is not null and (a.terms->>'amount')::numeric<floor_price)
   or (not is_sale and budget is not null and (a.terms->>'amount')::numeric>budget)) then
 price=case when is_sale then floor_price else budget end;
 terms=a.terms||jsonb_build_object('amount',price,'workflow_version',2);
 perform public.waouh_convergence_command(r.owner_id,'agreement_propose',jsonb_build_object('component_id',c.id,'terms',terms));
 update public.waouh_deal_room_links set last_offer_actor=r.owner_id,counter_rounds=counter_rounds+1 where id=r.id;
 msg='Je propose '||price||' FCFA. L’accord final reste à confirmer par les deux parties.';
 else msg='Une proposition est disponible. Votre confirmation des conditions est attendue.';end if;
 update public.waouh_deal_room_links set processed_offer_version=a.version where id=r.id;
 elsif not r.initial_sent then
 price=case when c.kind='announcement' then null when is_sale then floor_price else coalesce(nullif(r.mandate->>'initial_offer','')::numeric,case when budget is not null and c.amount>0 then least(c.amount,budget) end) end;
 msg=case when is_sale and price is not null then 'Je représente le vendeur. Son prix est de '||price||' FCFA. Souhaitez-vous discuter de la remise ?'
 when is_sale then 'Je représente le vendeur. Pouvez-vous préciser la quantité souhaitée et vos conditions de remise ?'
 when c.kind='announcement' then 'Je représente le demandeur. Pouvez-vous préciser les modalités, les pièces nécessaires et la date limite de cette démarche ?' when price is null then 'Pouvez-vous préciser votre prix total, la quantité, la remise et les conditions du devis ?' else 'Je représente le demandeur. Je propose '||price||' FCFA. Merci de préciser la quantité, la remise et les exclusions avant confirmation de l’accord.' end;
 update public.waouh_deal_room_links set initial_sent=true where id=r.id;
 elsif r.followups<coalesce((r.mandate->>'max_followups')::integer,1) and a.id is null and not exists(select 1 from public.waouh_business_messages bm where bm.component_id=c.id and bm.actor_id=c.provider_id)
 and not exists(select 1 from public.waouh_room_events where room_id=r.id and actor_kind='bot' and event_type='bot_step' and created_at>now()-case when r.followups>=1 then interval '48 hours' else interval '24 hours' end) then
 msg='Bonjour, avez-vous pu examiner cette demande ? Merci de préciser votre proposition dans cet échange.';
 update public.waouh_deal_room_links set followups=followups+1 where id=r.id;
 end if;
 if msg is not null then
 req=md5('room-bot:'||r.id||':'||r.mandate_revision||':'||coalesce(a.version,0)||':'||r.initial_sent||':'||r.followups)::uuid;
 perform public.waouh_business_command(r.owner_id,'business.message',jsonb_build_object('component_id',c.id,'request_id',req,'text',msg));
 update public.waouh_business_messages set author_kind='bot' where actor_id=r.owner_id and request_id=req;
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type,payload) values(r.id,r.owner_id,'bot','bot_step',jsonb_build_object('version',coalesce(a.version,0),'amount',case when a.id is null then price else null end));
 counted=counted+1;
 end if;
 update public.waouh_deal_room_links set next_run_at=case
 when msg is null and a.id is null and r.followups<coalesce((r.mandate->>'max_followups')::integer,1)
 then greatest(now()+interval '1 minute',(select max(created_at)+case when r.followups>=1 then interval '48 hours' else interval '24 hours' end from public.waouh_room_events where room_id=r.id and actor_kind='bot' and event_type='bot_step'))
 else now()+interval '24 hours' end,mandate=mandate-'one_step_approved'-'approved_version' where id=r.id;
 exception when others then
 update public.waouh_deal_room_links set next_run_at=now()+interval '15 minutes' where id=r.id;
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type) values(r.id,r.owner_id,'system','retry_required');
 end;
 end loop;
 return counted;
end $function$;
