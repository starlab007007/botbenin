-- Deal Room : Bot joint lui-même les propriétaires qui n'ont pas WAOUH.
--  * Partenaires du catalogue (compte WAOUH) : reliés directement à l'échange.
--  * Autres propriétaires joignables (partenaire, entreprise publique, personne ayant
--    elle-même publié ou initié le contact) : un message WhatsApp avec un lien qui ouvre
--    l'échange sans application ni compte. Les particuliers au consentement inconnu ne
--    sont jamais contactés automatiquement.
--  * Un seul compte technique représente ces interlocuteurs ; chaque lien n'ouvre que
--    son propre échange (jeton haché, stocké aussi chiffré pour les relais).
--  * STOP : arrêt définitif pour ce numéro ; Bot passe à l'offre suivante.
--  * Une réponse écrite du propriétaire arrête les relances automatiques.

insert into auth.users(id) values('00000000-0000-4000-8000-0000000ae01e') on conflict do nothing;
do $guest_identity$ begin
 if exists(select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='email') then
  execute $u$update auth.users set email=coalesce(email,'interlocuteur-externe@invite.bot.bj'),aud=coalesce(aud,'authenticated'),role=coalesce(role,'authenticated'),
   raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||'{"waouh_role":"room_external_guest"}'::jsonb where id='00000000-0000-4000-8000-0000000ae01e'$u$;
 end if;
end $guest_identity$;

create or replace function public.waouh_room_guest_actor() returns uuid language sql immutable as $$select '00000000-0000-4000-8000-0000000ae01e'::uuid$$;

create table if not exists public.waouh_room_guests(
 room_id uuid primary key references public.waouh_deal_room_links(id) on delete cascade,
 reference text not null unique,
 display_name text,
 channel text not null default 'whatsapp' check (channel in ('whatsapp')),
 phone_encrypted text not null,
 phone_hash text not null,
 phone_last4 text,
 consent_basis text not null check (consent_basis in ('partner','public_business','initiated','listing_owner')),
 contact_id uuid,
 token_hash text not null unique,
 token_encrypted text not null,
 token_expires_at timestamptz not null,
 status text not null default 'contacted' check (status in ('contacted','joined','stopped')),
 relayed_until timestamptz,
 relayed_version integer not null default 0,
 relayed_status text,
 contacted_at timestamptz not null default now(),
 joined_at timestamptz,
 last_inbound_at timestamptz,
 stopped_at timestamptz,
 created_at timestamptz not null default now());
create index if not exists waouh_room_guests_phone_idx on public.waouh_room_guests(phone_hash);
alter table public.waouh_room_guests enable row level security;
revoke all on public.waouh_room_guests from public,anon,authenticated;

-- Relie l'interlocuteur extérieur (compte technique) à l'échange, une seule fois.
create or replace function public.waouh_room_attach_guest(p_room uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.waouh_convergence_components;own uuid;
begin
 select * into c from public.waouh_convergence_components where id=p_room for update;
 if c.id is null or c.provider_id is not null then return false;end if;
 select owner_id into own from public.waouh_deal_room_links where id=p_room;
 update public.waouh_convergence_components set provider_id=public.waouh_room_guest_actor() where id=c.id;
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type,payload) values(p_room,own,'system','guest_contacted','{}');
 update public.waouh_deal_room_links set next_run_at=now() where id=p_room and control_mode='bot';
 return true;
end $$;

-- STOP : arrêt définitif, Bot s'arrête (et la reprise passe à l'offre suivante).
create or replace function public.waouh_room_guest_stop(p_room uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.waouh_room_guests set status='stopped',stopped_at=coalesce(stopped_at,now()),token_expires_at=least(token_expires_at,now()) where room_id=p_room;
 update public.waouh_deal_room_links set control_mode='paused',next_run_at=null where id=p_room and control_mode='bot';
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type,payload)
  select p_room,owner_id,'system','guest_stopped','{}' from public.waouh_deal_room_links where id=p_room;
end $$;
revoke all on function public.waouh_room_attach_guest(uuid) from public,anon,authenticated;
revoke all on function public.waouh_room_guest_stop(uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_attach_guest(uuid) to service_role;
grant execute on function public.waouh_room_guest_stop(uuid) to service_role;

-- Partenaire du catalogue avec compte WAOUH : relié directement, comme un article.
do $business$
declare d text=pg_get_functiondef('public.waouh_business_command(uuid,text,jsonb)'::regprocedure);
 anchor text='if target_auth is null or target_auth=p_actor then return public.waouh_business_bundle(p_actor,m.id)||jsonb_build_object(''needs_invite'',true);end if;';
begin
 if position(anchor in d)=0 then raise exception 'business command anchor missing';end if;
 if position('waouh_unified_catalog' in d)>0 then return;end if;
 d=replace(d,anchor,$branch$if target_auth is null and c.source_ref ~ '^catalog:[0-9a-f-]{36}$' then
   select p.user_id,(select u.id from public.waouh_users u where u.auth_user_id=p.user_id order by u.id limit 1) into target_auth,target_user
   from public.waouh_unified_catalog cat join public.waouh_partners p on p.id=cat.partner_id
   where cat.id=substring(c.source_ref from 9)::uuid and cat.is_active and cat.source='partner' and p.user_id is not null;
  end if;
  $branch$||anchor);
 execute d;
end $business$;

-- Bot : plus de relance automatique une fois que l'interlocuteur a écrit dans l'échange.
do $tick$
declare d text=pg_get_functiondef('public.waouh_room_tick(integer,uuid)'::regprocedure);
 anchor text='elsif r.followups<coalesce((r.mandate->>''max_followups'')::integer,1) and a.id is null';
begin
 if position(anchor in d)=0 then raise exception 'room tick anchor missing';end if;
 if position('bm.actor_id=c.provider_id' in d)>0 then return;end if;
 d=replace(d,anchor,anchor||' and not exists(select 1 from public.waouh_business_messages bm where bm.component_id=c.id and bm.actor_id=c.provider_id)');
 execute d;
end $tick$;

create or replace function public.waouh_room_snapshot(p_actor uuid,p_room uuid,p_before bigint default null,p_before_message uuid default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.waouh_deal_room_links;c public.waouh_convergence_components;m public.waouh_convergence_missions;
 a public.waouh_convergence_agreements;msgs jsonb;ev jsonb;bundle jsonb;own boolean;actions jsonb;closed boolean;buyer boolean;e public.waouh_business_evidence;g public.waouh_room_guests;
begin
 select * into r from public.waouh_deal_room_links where id=p_room;
 select * into c from public.waouh_convergence_components where id=r.id;
 select * into m from public.waouh_convergence_missions where id=c.mission_id;
 if r.id is null or (p_actor is distinct from m.owner_id and p_actor is distinct from c.provider_id) then raise exception 'forbidden' using errcode='42501';end if;
 own=m.owner_id=p_actor;closed=m.status in ('completed','cancelled') or r.blocked_reason is not null;
 select * into a from public.waouh_convergence_agreements where component_id=c.id;
 select * into g from public.waouh_room_guests where room_id=r.id;
 select * into e from public.waouh_business_evidence where component_id=c.id and version=coalesce(a.version,0);
 buyer=case when m.criteria ? 'workflow:sale' then not own else own end;
 select coalesce(jsonb_agg(x order by x->>'created_at',x->>'id'),'[]') into msgs from (
 select jsonb_build_object('id',id,'text',text,'mine',actor_id=p_actor,'author_kind',author_kind,'created_at',created_at,'status','recorded') x
 from public.waouh_business_messages where component_id=c.id and (p_before_message is null or (created_at,id)<(select created_at,id from public.waouh_business_messages where id=p_before_message and component_id=c.id)) order by created_at desc,id desc limit 100) q;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.id),'[]') into ev from (
 select id,event_type,actor_kind,created_at,payload from public.waouh_room_events where room_id=r.id and (p_before is null or id>p_before) order by case when p_before is null then -id else id end limit 100) q;
 actions='[]'::jsonb;if a.status='completed' then actions='["rating"]'::jsonb;end if;
 if not closed then
 if c.provider_id is not null then actions=actions||'["message"]';
  -- Un accord confirmé (ou clôturé) ne se renégocie plus par une nouvelle proposition.
  if c.kind<>'announcement' and coalesce(a.status,'') not in ('accepted','completed') then actions=actions||'["propose"]';end if;
 end if;
 -- Opportunité : une seule action utile à la fois (préparer, puis confirmer la transmission).
 if c.kind='announcement' and own then
  if e.application_prepared_at is null then actions=actions||'["application_prepare"]';
  elsif e.application_submitted_at is null then actions=actions||'["application_submit"]';end if;
 end if;
 -- Annonceur : répondre au dossier une fois transmis (retenu / non retenu).
 if c.kind='announcement' and not own and c.provider_id=p_actor and e.application_submitted_at is not null and e.application_outcome is null then actions=actions||'["application_outcome"]';end if;
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
 bundle=jsonb_build_object('deal_room_id',r.id,'thread_id',r.thread_id,'mission_id',m.id,'component_id',c.id,
 'blocked_reason',r.blocked_reason,'is_owner',own,'buyer',buyer,'kind',c.kind,'title',c.title,'city',m.city,'product',c.source_snapshot->'product','price',c.amount,
 'provider_joined',c.provider_id is not null,'control_mode',r.control_mode,'mandate_revision',r.mandate_revision,
 'mandate',case when own then r.mandate else null end,'expires_at',case when own then r.expires_at else null end,'next_run_at',case when own then r.next_run_at else null end,
 'initial_price_proposal',(select payload||jsonb_build_object('revision',id) from public.waouh_room_events where room_id=r.id and actor_kind='bot' and payload->>'amount' is not null order by id desc limit 1),'agreement',case when a.id is null then null else to_jsonb(a) end,'current_offer_version',coalesce(a.version,0),'last_offer_mine',r.last_offer_actor=p_actor,
 'messages',msgs,'message_cursor',case when jsonb_array_length(msgs)=100 then msgs->0->>'id' else null end,'counterparty_name',case when own and g.room_id is not null then coalesce(nullif(g.display_name,''),'Vendeur hors WAOUH') else (select coalesce(to_jsonb(u)->>'display_name','Interlocuteur') from public.waouh_users u where u.auth_user_id=case when own then c.provider_id else m.owner_id end order by u.id limit 1) end,
 'external_contact',case when own and g.room_id is not null then jsonb_build_object('channel',g.channel,'status',g.status,'last4',g.phone_last4,'contacted_at',g.contacted_at,'last_reply_at',g.last_inbound_at) else null end,'events',ev,'allowed_actions',actions,'closed',closed,
 'evidence',to_jsonb(e),
 'next_action',case when closed then 'completed' when a.status='accepted' then 'follow' when a.status='proposed' then 'review' when c.provider_id is null then 'invite' when r.control_mode='bot' then 'bot_running' else 'message' end);
 return bundle||jsonb_build_object('guidance',public.waouh_room_guidance(bundle));
end $$;
revoke all on function public.waouh_room_snapshot(uuid,uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_snapshot(uuid,uuid,bigint,uuid) to service_role;
