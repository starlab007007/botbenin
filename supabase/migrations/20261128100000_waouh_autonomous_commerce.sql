-- WAOUH Smart Autonomous Commerce, lot 1.
-- 1. Opportunité : un mandat autonome porte un dossier court ; Bot transmet la candidature dans l'échange
--    (annonceur présent uniquement), enregistre le dépôt et prévient le candidat.
-- 2. Le propriétaire est notifié de chaque action de Bot (premier contact, demande de devis,
--    contre-offre) et du moment où un seul geste est attendu (offre dans ses limites, acceptation
--    de l'interlocuteur, limites atteintes). Une réponse de l'interlocuteur réveille Bot sans attendre.
-- Construit à partir des définitions actives (empreintes identiques à 20261127171000).

CREATE OR REPLACE FUNCTION public.waouh_room_command(p_actor uuid, p_action text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.waouh_deal_room_links;c public.waouh_convergence_components;m public.waouh_convergence_missions;
 a public.waouh_convergence_agreements;rid uuid;mid uuid;cid uuid;req uuid;b jsonb;old public.waouh_room_requests;
 rules jsonb;own boolean;n numeric;budget numeric;initial numeric;duration integer;maxf integer;floor_price numeric;
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
 floor_price=nullif(rules->>'price_floor','')::numeric;
 if floor_price is not null and (floor_price<1 or floor_price>1e8 or floor_price::text='NaN') then raise exception 'invalid_price_floor';end if;
 if m.criteria ? 'workflow:sale' and floor_price is not null and c.amount>0 and floor_price>c.amount then raise exception 'floor_above_asking_price';end if;
 if rules->>'mode'='autonomous' and p_action='delegate' then
  if m.criteria ? 'workflow:sale' and floor_price is null then raise exception 'price_floor_required';end if;
  if not (m.criteria ? 'workflow:sale') and c.kind<>'announcement' and budget is null then raise exception 'budget_required';end if;
  -- Opportunité : Bot transmet lui-même la candidature, à partir d'un dossier court fourni dans le mandat.
  if c.kind='announcement' and length(trim(coalesce(rules->'application'->>'summary',''))) not between 30 and 1800 then raise exception 'application_dossier_required';end if;
 end if;
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
 if not own and r.control_mode='bot' and r.expires_at>now() then update public.waouh_deal_room_links set next_run_at=now() where id=r.id;end if;
 elsif p_action='propose' then
 if c.kind='announcement' then raise exception 'application_process_required';end if;if a.status in ('accepted','completed') then raise exception 'agreement_already_confirmed';end if;
 if own and r.control_mode='bot' then raise exception 'takeover_required';end if;
 if (p->>'version')::integer is distinct from coalesce(a.version,0) then raise exception 'offer_version_changed';end if;
 if coalesce((p->'terms'->>'quantity')::integer,0) not between 1 and 100000 or length(trim(coalesce(p->'terms'->>'payment','')))<2 then raise exception 'complete_quantity_and_payment';end if;
 b=public.waouh_convergence_command(p_actor,'agreement_propose',jsonb_build_object('component_id',c.id,'terms',(p->'terms')||'{"workflow_version":2}'));
 update public.waouh_deal_room_links set last_offer_actor=p_actor,next_run_at=case when control_mode='bot' then now() else null end where id=r.id;
 elsif p_action in ('accept','reject') then
 b=public.waouh_convergence_command(p_actor,'agreement_'||p_action,jsonb_build_object('component_id',c.id,'version',p->'version'));
 -- La réponse de l'interlocuteur réveille Bot tout de suite, pour prévenir le propriétaire sans attendre.
 if not own and r.control_mode='bot' then update public.waouh_deal_room_links set next_run_at=now() where id=r.id;end if;
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

CREATE OR REPLACE FUNCTION public.waouh_room_tick(p_limit integer DEFAULT 20, p_room_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.waouh_deal_room_links;c public.waouh_convergence_components;m public.waouh_convergence_missions;
 a public.waouh_convergence_agreements;counted integer=0;price numeric;budget numeric;floor_price numeric;is_sale boolean;msg text;req uuid;local_clock text;terms jsonb;
 note text;note_key text;outside boolean;applying boolean;
begin
 for r in select * from public.waouh_deal_room_links where active and control_mode='bot' and next_run_at<=now() and (p_room_id is null or id=p_room_id) order by next_run_at limit least(greatest(p_limit,1),50) for update skip locked loop
 begin
 price=null;note=null;note_key=null;applying=false;
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
 floor_price=case when is_sale then coalesce(nullif(r.mandate->>'price_floor','')::numeric,case when c.amount>0 then c.amount end) end;
 budget=nullif(r.mandate->>'budget_max','')::numeric;
 if r.mandate->>'mode'<>'autonomous' and (coalesce((r.mandate->>'one_step_approved')::boolean,false)=false or coalesce((r.mandate->>'approved_version')::integer,-1)<>coalesce(a.version,0)) then update public.waouh_deal_room_links set next_run_at=null where id=r.id;continue;end if;
 if a.status in ('accepted','completed','rejected') then update public.waouh_deal_room_links set next_run_at=null where id=r.id;continue;end if;
 msg=null;
 if a.id is not null and r.last_offer_actor=c.provider_id and a.version>r.processed_offer_version then
 if r.mandate->>'mode'='autonomous' and r.counter_rounds<3 and ((is_sale and floor_price is not null and (a.terms->>'amount')::numeric<floor_price)
   or (not is_sale and budget is not null and (a.terms->>'amount')::numeric+greatest(coalesce(c.extra_cost,0),coalesce(nullif(a.terms->>'delivery_fee','')::numeric,0))>budget)) then
 price=case when is_sale then greatest(floor_price,coalesce(c.amount,floor_price)) else budget-greatest(coalesce(c.extra_cost,0),coalesce(nullif(a.terms->>'delivery_fee','')::numeric,0)) end;
 if price<=0 then update public.waouh_deal_room_links set control_mode='paused',next_run_at=null where id=r.id;continue;end if;
 terms=a.terms||jsonb_build_object('amount',price,'workflow_version',2);
 perform public.waouh_convergence_command(r.owner_id,'agreement_propose',jsonb_build_object('component_id',c.id,'terms',terms));
 update public.waouh_deal_room_links set last_offer_actor=r.owner_id,counter_rounds=counter_rounds+1 where id=r.id;
 msg='Je propose '||price||' FCFA. L’accord final reste à confirmer par les deux parties.';
 note='Bot a proposé '||price||' FCFA pour « '||c.title||' ».';note_key='bot-counter:'||r.id||':'||a.version;
 else msg='Une proposition est disponible. Votre confirmation des conditions est attendue.';
 outside=(is_sale and floor_price is not null and (a.terms->>'amount')::numeric<floor_price)
  or (not is_sale and budget is not null and (a.terms->>'amount')::numeric+greatest(coalesce(c.extra_cost,0),coalesce(nullif(a.terms->>'delivery_fee','')::numeric,0))>budget);
 note=case when coalesce(outside,false) then 'La négociation pour « '||c.title||' » a atteint vos limites. Décidez de la suite.'
  else 'Une offre pour « '||c.title||' » respecte vos limites. Validez l’accord en un geste.' end;
 note_key='bot-decision:'||r.id||':'||a.version;
 end if;
 update public.waouh_deal_room_links set processed_offer_version=a.version where id=r.id;
 elsif not r.initial_sent then
 price=case when c.kind='announcement' then null when is_sale then greatest(floor_price,c.amount) else case when budget>coalesce(c.extra_cost,0) then least(coalesce(nullif(r.mandate->>'initial_offer','')::numeric,c.amount,budget),budget-coalesce(c.extra_cost,0)) end end;
 msg=case when is_sale and price is not null then 'Je représente le vendeur. Son prix est de '||price||' FCFA. Souhaitez-vous discuter de la remise ?'
 when is_sale then 'Je représente le vendeur. Pouvez-vous préciser la quantité souhaitée et vos conditions de remise ?'
 when c.kind='announcement' and length(trim(coalesce(r.mandate->'application'->>'summary','')))>=30 then 'Je représente le candidat. Voici sa candidature : '||trim(r.mandate->'application'->>'summary')||' Merci de confirmer la bonne réception et de préciser les prochaines étapes.'
 when c.kind='announcement' then 'Je représente le demandeur. Pouvez-vous préciser les modalités, les pièces nécessaires et la date limite de cette démarche ?'
 when r.mandate->>'strategy'='service' then 'Merci de préciser le périmètre, le tarif total avec déplacement et frais, les qualifications, la disponibilité et les garanties.'
 when r.mandate->>'strategy'='job' then 'Merci de préciser les livrables, le délai, les créneaux, le lieu et le coût total avec frais.'
 when r.mandate->>'strategy'='find' then 'Pouvez-vous confirmer la correspondance avec la demande, la disponibilité, la localisation et les conditions ?'
 when price is null then 'Pouvez-vous préciser votre prix total, la quantité, la remise et les conditions du devis ?' else 'Je représente le demandeur. Je propose '||price||' FCFA. Merci de préciser la quantité, la remise et les exclusions avant confirmation de l’accord.' end;
 update public.waouh_deal_room_links set initial_sent=true where id=r.id;
 applying=c.kind='announcement' and length(trim(coalesce(r.mandate->'application'->>'summary','')))>=30;
 note=case when applying then 'Bot a transmis votre candidature pour « '||c.title||' ».'
  when r.mandate->>'strategy' in ('service','job') then 'Bot a demandé un devis pour « '||c.title||' ».'
  when is_sale then 'Bot a présenté votre offre pour « '||c.title||' ».'
  else 'Bot a contacté l’interlocuteur pour « '||c.title||' ».' end;
 note_key='bot-first:'||r.id;
 elsif r.followups<coalesce((r.mandate->>'max_followups')::integer,1) and a.id is null and not exists(select 1 from public.waouh_business_messages bm where bm.component_id=c.id and bm.actor_id=c.provider_id)
 and not exists(select 1 from public.waouh_room_events where room_id=r.id and actor_kind='bot' and event_type='bot_step' and created_at>now()-case when r.followups>=1 then interval '48 hours' else interval '24 hours' end) then
 msg='Bonjour, avez-vous pu examiner cette demande ? Merci de préciser votre proposition dans cet échange.';
 update public.waouh_deal_room_links set followups=followups+1 where id=r.id;
 end if;
 -- L'interlocuteur a accepté la dernière proposition : il ne manque que le geste du propriétaire.
 if note is null and a.id is not null and a.status='proposed' and a.provider_accepted_at is not null and a.owner_accepted_at is null then
  note='L’interlocuteur accepte l’offre pour « '||c.title||' ». Validez l’accord en un geste.';note_key='bot-decision:'||r.id||':'||a.version;
 end if;
 if msg is not null then
 req=md5('room-bot:'||r.id||':'||r.mandate_revision||':'||coalesce(a.version,0)||':'||r.initial_sent||':'||r.followups)::uuid;
 perform public.waouh_business_command(r.owner_id,'business.message',jsonb_build_object('component_id',c.id,'request_id',req,'text',msg));
 update public.waouh_business_messages set author_kind='bot' where actor_id=r.owner_id and request_id=req;
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type,payload) values(r.id,r.owner_id,'bot','bot_step',jsonb_build_object('version',coalesce(a.version,0),'amount',case when a.id is null then price else null end));
 counted=counted+1;
 end if;
 -- Candidature transmise par Bot dans l'échange : même trace que le dépôt fait par le candidat.
 if applying and msg is not null then
  perform public.waouh_business_command(r.owner_id,'business.application_prepare',jsonb_build_object('component_id',c.id));
  perform public.waouh_business_command(r.owner_id,'business.application_submit',jsonb_build_object('component_id',c.id,'confirmation','submitted'));
 end if;
 -- Le propriétaire est prévenu de chaque action de Bot et du moment où son geste est attendu.
 if note is not null then
  insert into public.waouh_notifications(user_id,notification_type,photos,payload,channel,delivery_status,dedupe_key)
  select u.id,'avatar_mission_progress','{}',jsonb_build_object('text',note,'url','/app/deal-room?room_id='||r.id,'deal_room_id',r.id),'waouh_app','recorded',note_key
  from public.waouh_users u where u.auth_user_id=r.owner_id order by u.id limit 1 on conflict do nothing;
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
