-- A single room for human and delegated actions; business agreements remain authoritative.
create table public.waouh_deal_room_links (
 id uuid primary key references public.waouh_convergence_components(id),
 owner_id uuid not null references auth.users(id), source_ref text not null,
 thread_id uuid unique, blocked_reason text, active boolean not null default true,
 control_mode text not null default 'manual' check(control_mode in ('manual','bot','paused')),
 mandate_revision integer not null default 0, mandate jsonb not null default '{}',
 expires_at timestamptz, next_run_at timestamptz, last_offer_actor uuid,
 processed_offer_version integer not null default 0, initial_sent boolean not null default false, counter_rounds integer not null default 0,
 followups integer not null default 0, created_at timestamptz not null default now()
);
create unique index waouh_room_active_offer on public.waouh_deal_room_links(owner_id,source_ref) where active;
create index waouh_room_due on public.waouh_deal_room_links(next_run_at) where active and control_mode='bot';
create table public.waouh_room_events (
 id bigint generated always as identity primary key, room_id uuid not null references public.waouh_deal_room_links(id),
 actor_id uuid not null references auth.users(id), actor_kind text not null default 'human' check(actor_kind in ('human','bot','system')),
 event_type text not null, payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create index waouh_room_events_cursor on public.waouh_room_events(room_id,id);
create table public.waouh_room_requests (
 actor_id uuid not null references auth.users(id), request_id uuid not null, request_body jsonb not null,
 response jsonb not null, primary key(actor_id,request_id)
);
alter table public.waouh_business_messages add column author_kind text not null default 'human' check(author_kind in ('human','bot','system'));
do $$ declare t text;begin
 foreach t in array array['waouh_deal_room_links','waouh_room_events','waouh_room_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on sequence public.waouh_room_events_id_seq from public,anon,authenticated;
grant usage,select on sequence public.waouh_room_events_id_seq to service_role;

create function public.waouh_room_notify() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.waouh_convergence_components;m public.waouh_convergence_missions;target uuid;uid uuid;
begin
 -- Contact already emits its own invitation notice. Private mandate updates do not notify the seller.
 if new.event_type not in ('message','propose','accept','reject','receipt','payment_report','payment_receive','complete','issue','bot_step') then return new;end if;
 select * into c from public.waouh_convergence_components where id=new.room_id;
 select * into m from public.waouh_convergence_missions where id=c.mission_id;
 target=case when new.actor_id=m.owner_id then c.provider_id else m.owner_id end;
 select id into uid from public.waouh_users where auth_user_id=target order by id limit 1;
 if uid is not null then
 insert into public.waouh_notifications(user_id,notification_type,photos,payload,channel,delivery_status,dedupe_key)
 values(uid,'deal_room_update','{}',jsonb_build_object('text','Une mise à jour vous attend dans votre échange.','url','/app/deal-room?room_id='||new.room_id,'deal_room_id',new.room_id),'waouh_app','recorded','room-event:'||new.id) on conflict do nothing;
 end if;return new;
end $$;
revoke all on function public.waouh_room_notify() from public,anon,authenticated;
create trigger room_event_notification after insert on public.waouh_room_events for each row execute function public.waouh_room_notify();

create function public.waouh_room_snapshot(p_actor uuid,p_room uuid,p_before bigint default null,p_before_message uuid default null) returns jsonb
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
 if buyer and e.payment_reported_at is null then actions=actions||'["payment_report"]';end if;
 if not buyer and e.payment_reported_at is not null and e.payment_received_at is null then actions=actions||'["payment_receive"]';end if;
 if e.receipt_at is not null and e.payment_received_at is not null and (case when own then a.owner_completed_at else a.provider_completed_at end) is null then actions=actions||'["complete"]';end if;
 end if;
 end if;
 end if;
 return jsonb_build_object('deal_room_id',r.id,'thread_id',r.thread_id,'mission_id',m.id,'component_id',c.id,
 'blocked_reason',r.blocked_reason,'is_owner',own,'kind',c.kind,'title',c.title,'city',m.city,'product',c.source_snapshot->'product','price',c.amount,
 'provider_joined',c.provider_id is not null,'control_mode',r.control_mode,'mandate_revision',r.mandate_revision,
 'mandate',case when own then r.mandate else null end,'expires_at',case when own then r.expires_at else null end,'next_run_at',case when own then r.next_run_at else null end,
 'initial_price_proposal',(select payload||jsonb_build_object('revision',id) from public.waouh_room_events where room_id=r.id and actor_kind='bot' and payload->>'amount' is not null order by id desc limit 1),'agreement',case when a.id is null then null else to_jsonb(a) end,'current_offer_version',coalesce(a.version,0),'last_offer_mine',r.last_offer_actor=p_actor,
 'messages',msgs,'message_cursor',case when jsonb_array_length(msgs)=100 then msgs->0->>'id' else null end,'counterparty_name',(select coalesce(to_jsonb(u)->>'display_name','Interlocuteur') from public.waouh_users u where u.auth_user_id=case when own then c.provider_id else m.owner_id end order by u.id limit 1),'events',ev,'allowed_actions',actions,'closed',closed,
 'evidence',to_jsonb(e),
 'next_action',case when closed then 'completed' when a.status='accepted' then 'follow' when a.status='proposed' then 'review' when c.provider_id is null then 'invite' when r.control_mode='bot' then 'bot_running' else 'message' end);
end $$;

create function public.waouh_room_command(p_actor uuid,p_action text,p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
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
 b=public.waouh_convergence_command(p_actor,'create',jsonb_build_object('request_key','room:'||req,'kind',p->'source'->>'kind','goal',p->'source'->>'title','city',coalesce(nullif(p->>'city',''),'À préciser'),'budget_max',p->'budget_max'));
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
 b=public.waouh_business_open(p_actor,jsonb_build_object('mission_id',m.id,'component_id',c.id,'confirmed',true));
 else update public.waouh_deal_room_links set control_mode=case when p_action='pause' then 'paused' else 'manual' end,mandate_revision=mandate_revision+1,next_run_at=null where id=r.id;
 end if;
 elsif p_action='message' then
 if own and r.control_mode='bot' then raise exception 'takeover_required';end if;
 b=public.waouh_business_command(p_actor,'business.message',jsonb_build_object('component_id',c.id,'request_id',req,'text',p->>'text'));
 elsif p_action='propose' then
 if c.kind='announcement' then raise exception 'application_process_required';end if;
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
 elsif p_action in ('receipt','payment_report','payment_receive','complete','issue','rating','application_prepare','application_submit') then
 b=public.waouh_business_command(p_actor,'business.'||p_action,p||jsonb_build_object('component_id',c.id));
 elsif p_action not in ('open','adopt') then raise exception 'unknown_action';end if;
 insert into public.waouh_room_events(room_id,actor_id,event_type,payload) values(r.id,p_actor,p_action,jsonb_build_object('version',(select version from public.waouh_convergence_agreements where component_id=c.id)));
 b=public.waouh_room_snapshot(p_actor,r.id)||case when p_action='invite' then jsonb_build_object('token',b->'token') else '{}'::jsonb end;
 insert into public.waouh_room_requests values(p_actor,req,jsonb_build_object('action',p_action,'payload',p),b);
 return b;
end $$;

-- Executes only transactional in-app actions; never accepts an agreement for a human.
create function public.waouh_room_tick(p_limit integer default 20,p_room_id uuid default null) returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.waouh_deal_room_links;c public.waouh_convergence_components;m public.waouh_convergence_missions;
 a public.waouh_convergence_agreements;counted integer=0;price numeric;budget numeric;msg text;req uuid;local_clock text;terms jsonb;
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
 budget=nullif(r.mandate->>'budget_max','')::numeric;
 if r.mandate->>'mode'<>'autonomous' and (coalesce((r.mandate->>'one_step_approved')::boolean,false)=false or coalesce((r.mandate->>'approved_version')::integer,-1)<>coalesce(a.version,0)) then update public.waouh_deal_room_links set next_run_at=null where id=r.id;continue;end if;
 if a.status in ('accepted','completed','rejected') then update public.waouh_deal_room_links set next_run_at=null where id=r.id;continue;end if;
 msg=null;
 if a.id is not null and r.last_offer_actor=c.provider_id and a.version>r.processed_offer_version then
 if r.mandate->>'mode'='autonomous' and r.counter_rounds<3 and budget is not null and (a.terms->>'amount')::numeric>budget then
 terms=a.terms||jsonb_build_object('amount',budget,'workflow_version',2);
 perform public.waouh_convergence_command(r.owner_id,'agreement_propose',jsonb_build_object('component_id',c.id,'terms',terms));
 update public.waouh_deal_room_links set last_offer_actor=r.owner_id,counter_rounds=counter_rounds+1 where id=r.id;
 msg='Je propose '||budget||' FCFA. L’accord final reste à confirmer par les deux parties.';
 else msg='Une proposition est disponible. Votre confirmation des conditions est attendue.';end if;
 update public.waouh_deal_room_links set processed_offer_version=a.version where id=r.id;
 elsif not r.initial_sent then
 price=case when c.kind='announcement' then null else coalesce(nullif(r.mandate->>'initial_offer','')::numeric,case when budget is not null and c.amount>0 then least(c.amount,budget) end) end;
 msg=case when c.kind='announcement' then 'Je représente le demandeur. Pouvez-vous préciser les modalités, les pièces nécessaires et la date limite de cette démarche ?' when price is null then 'Pouvez-vous préciser votre prix total, la quantité, la remise et les conditions du devis ?' else 'Je représente le demandeur. Je propose '||price||' FCFA. Merci de préciser la quantité, la remise et les exclusions avant confirmation de l’accord.' end;
 update public.waouh_deal_room_links set initial_sent=true where id=r.id;
 elsif r.followups<coalesce((r.mandate->>'max_followups')::integer,1) and a.id is null then
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
 update public.waouh_deal_room_links set next_run_at=now()+interval '24 hours',mandate=mandate-'one_step_approved'-'approved_version' where id=r.id;
 exception when others then
 update public.waouh_deal_room_links set next_run_at=now()+interval '15 minutes' where id=r.id;
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type) values(r.id,r.owner_id,'system','retry_required');
 end;
 end loop;
 return counted;
end $$;
revoke all on function public.waouh_room_snapshot(uuid,uuid,bigint,uuid),public.waouh_room_command(uuid,text,jsonb),public.waouh_room_tick(integer,uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_snapshot(uuid,uuid,bigint,uuid),public.waouh_room_command(uuid,text,jsonb),public.waouh_room_tick(integer,uuid) to service_role;
