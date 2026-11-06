-- Deal Room : corrections issues du test de bout en bout (achat, vente, opportunité).
--
-- 1. Le guide d'étapes (Étape X sur N + action principale) avait disparu de chaque
--    snapshot : la migration 20261106130900 (réception mutuelle) a réécrit
--    waouh_room_snapshot à partir d'une version antérieure au guide. On rétablit le
--    guide sans rien perdre de la réception mutuelle (champ buyer, remise côté vendeur).
-- 2. Un accord confirmé ne peut plus être remplacé par de nouvelles conditions :
--    sinon une partie pouvait, après remise ou paiement déclaré, renvoyer l'accord à
--    l'état « proposé » et effacer les confirmations. En cas de souci, « Signaler un
--    problème » reste disponible.
-- 3. Quand l'utilisateur confie l'échange à Bot, le message d'ouverture envoyé à sa
--    place est attribué à Bot (et non présenté comme écrit par l'utilisateur).
-- 4. Le guide parle de « remise » à la partie qui remet (vendeur), de « réception » à
--    celle qui reçoit.
-- 5. Opportunité : « Préparer ma démarche » n'est plus proposé une fois le dossier préparé.

create or replace function public.waouh_room_snapshot(p_actor uuid,p_room uuid,p_before bigint default null,p_before_message uuid default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.waouh_deal_room_links;c public.waouh_convergence_components;m public.waouh_convergence_missions;
 a public.waouh_convergence_agreements;msgs jsonb;ev jsonb;bundle jsonb;own boolean;actions jsonb;closed boolean;buyer boolean;e public.waouh_business_evidence;
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
 if c.provider_id is not null then actions=actions||'["message"]';
  -- Un accord confirmé (ou clôturé) ne se renégocie plus par une nouvelle proposition.
  if c.kind<>'announcement' and coalesce(a.status,'') not in ('accepted','completed') then actions=actions||'["propose"]';end if;
 end if;
 -- Opportunité : une seule action utile à la fois (préparer, puis confirmer la transmission).
 if c.kind='announcement' and own then
  if e.application_prepared_at is null then actions=actions||'["application_prepare"]';
  elsif e.application_submitted_at is null then actions=actions||'["application_submit"]';end if;
 end if;
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
 'messages',msgs,'message_cursor',case when jsonb_array_length(msgs)=100 then msgs->0->>'id' else null end,'counterparty_name',(select coalesce(to_jsonb(u)->>'display_name','Interlocuteur') from public.waouh_users u where u.auth_user_id=case when own then c.provider_id else m.owner_id end order by u.id limit 1),'events',ev,'allowed_actions',actions,'closed',closed,
 'evidence',to_jsonb(e),
 'next_action',case when closed then 'completed' when a.status='accepted' then 'follow' when a.status='proposed' then 'review' when c.provider_id is null then 'invite' when r.control_mode='bot' then 'bot_running' else 'message' end);
 return bundle||jsonb_build_object('guidance',public.waouh_room_guidance(bundle));
end $$;
revoke all on function public.waouh_room_snapshot(uuid,uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_snapshot(uuid,uuid,bigint,uuid) to service_role;

-- Guide : vocabulaire « remise » pour la partie qui remet. Sans champ buyer (anciens
-- appelants), le comportement reste celui du demandeur, inchangé.
do $guide$
declare d text=pg_get_functiondef('public.waouh_room_guidance(jsonb,timestamptz)'::regprocedure);
 anchors text[]=array[
  'if actions ? ''receipt'' then action=''receipt'';cta=''Confirmer la réception'';',
  'then ''Confirmer la réception'' when ''payment_report'''];
 a text;
begin
 foreach a in array anchors loop if position(a in d)=0 then raise exception 'room guidance anchor missing: %',a;end if;end loop;
 d=replace(d,anchors[1],
  'if actions ? ''receipt'' and coalesce((p->>''buyer'')::boolean,true) is false then title=''Confirmer la remise'';detail=''Validez uniquement après avoir remis le produit ou réalisé la prestation.'';action=''receipt'';cta=''Confirmer la remise'';elsif actions ? ''receipt'' then action=''receipt'';cta=''Confirmer la réception'';');
 d=replace(d,anchors[2],'then case when coalesce((p->>''buyer'')::boolean,true) then ''Confirmer la réception'' else ''Confirmer la remise'' end when ''payment_report''');
 execute d;
end $guide$;

-- Commande : verrou de l'accord confirmé + message d'ouverture attribué à Bot lors d'une délégation.
do $command$
declare d text=pg_get_functiondef('public.waouh_room_command(uuid,text,jsonb)'::regprocedure);
 propose_anchor text='raise exception ''application_process_required'';end if;';
 open_anchor text='b=public.waouh_business_open(p_actor,jsonb_build_object(''mission_id'',m.id,''component_id'',c.id,''confirmed'',true));';
begin
 if position(propose_anchor in d)=0 or position(open_anchor in d)=0 then raise exception 'room command anchor missing';end if;
 if position(propose_anchor||'if a.status in' in d)>0 then return;end if; -- déjà appliquée
 d=replace(d,propose_anchor,propose_anchor||'if a.status in (''accepted'',''completed'') then raise exception ''agreement_already_confirmed'';end if;');
 d=replace(d,open_anchor,open_anchor||'update public.waouh_business_messages set author_kind=''bot'' where component_id=c.id and actor_id=p_actor and request_id=md5(''waouh-interest:''||p_actor::text||'':''||c.id::text)::uuid and created_at=now();');
 execute d;
end $command$;
