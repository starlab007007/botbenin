-- Opportunité : l'annonceur répond au dossier transmis (retenu / non retenu), ce qui
-- conclut le parcours. Jusqu'ici l'échange s'arrêtait sur « Réponse attendue » sans
-- aucun moyen d'aboutir.
--  * Preuve : réponse, date et note facultative, enregistrées une seule fois.
--  * Seul l'annonceur (interlocuteur) peut répondre, et seulement après transmission.
--  * La réponse arrête Bot sur cet échange (plus de relance ni de reprise sur une autre
--    offre) et le candidat reçoit un avis.
--  * Le guide affiche une 4e étape « Réponse » et la conclusion des deux côtés.

alter table public.waouh_business_evidence
 add column if not exists application_outcome text check (application_outcome in ('retained','declined')),
 add column if not exists application_outcome_at timestamptz,
 add column if not exists application_outcome_note text check (application_outcome_note is null or length(application_outcome_note) between 3 and 500);

do $business$
declare d text=pg_get_functiondef('public.waouh_business_command(uuid,text,jsonb)'::regprocedure);
 anchor text='elsif p_action in (''business.application_prepare'',''business.application_submit'') then';
begin
 if position(anchor in d)=0 then raise exception 'business command anchor missing';end if;
 if position('business.application_outcome' in d)>0 then return;end if;
 d=replace(d,anchor,$branch$elsif p_action='business.application_outcome' then
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
 $branch$||anchor);
 execute d;
end $business$;

do $command$
declare d text=pg_get_functiondef('public.waouh_room_command(uuid,text,jsonb)'::regprocedure);
 anchor text='''application_prepare'',''application_submit'') then';
begin
 if position(anchor in d)=0 then raise exception 'room command anchor missing';end if;
 if position('''application_outcome''' in d)>0 then return;end if;
 d=replace(d,anchor,'''application_prepare'',''application_submit'',''application_outcome'') then');
 execute d;
end $command$;

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
 'messages',msgs,'message_cursor',case when jsonb_array_length(msgs)=100 then msgs->0->>'id' else null end,'counterparty_name',(select coalesce(to_jsonb(u)->>'display_name','Interlocuteur') from public.waouh_users u where u.auth_user_id=case when own then c.provider_id else m.owner_id end order by u.id limit 1),'events',ev,'allowed_actions',actions,'closed',closed,
 'evidence',to_jsonb(e),
 'next_action',case when closed then 'completed' when a.status='accepted' then 'follow' when a.status='proposed' then 'review' when c.provider_id is null then 'invite' when r.control_mode='bot' then 'bot_running' else 'message' end);
 return bundle||jsonb_build_object('guidance',public.waouh_room_guidance(bundle));
end $$;
revoke all on function public.waouh_room_snapshot(uuid,uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_snapshot(uuid,uuid,bigint,uuid) to service_role;

-- Guide complet (inclut les libellés « remise » de la migration précédente).
create or replace function public.waouh_room_guidance(p jsonb,p_now timestamptz default now()) returns jsonb
language plpgsql immutable security invoker set search_path=pg_catalog,pg_temp as $$
declare a jsonb=p->'agreement';e jsonb=coalesce(p->'evidence','{}');actions jsonb=coalesce(p->'allowed_actions','[]');
 own boolean=coalesce((p->>'is_owner')::boolean,false);joined boolean=coalesce((p->>'provider_joined')::boolean,false);
 accepted boolean;finished boolean;proposed boolean;fulfilled boolean;mine_done boolean;other_done boolean;mine_signed boolean;
 expired boolean;bot_spoke boolean;phase integer;labels text[];keys text[];done boolean[];i integer;steps jsonb='[]';checks jsonb='[]';alternatives jsonb='[]';choice text;
 state text='active';actor text='you';title text;detail text;action text;cta text;step_state text;
begin
 accepted=coalesce(a->>'status' in ('accepted','completed'),false) and a->>'owner_accepted_at' is not null and a->>'provider_accepted_at' is not null;
 fulfilled=e->>'receipt_at' is not null and e->>'payment_reported_at' is not null and e->>'payment_received_at' is not null;
 mine_signed=case when own then a->>'owner_accepted_at' else a->>'provider_accepted_at' end is not null;
 mine_done=case when own then a->>'owner_completed_at' else a->>'provider_completed_at' end is not null;
 other_done=case when own then a->>'provider_completed_at' else a->>'owner_completed_at' end is not null;
 finished=accepted and fulfilled and mine_done and other_done and a->>'status'='completed' and e->>'issue' is null and p->>'blocked_reason' is null;
 proposed=coalesce((a->>'version')::integer,0)>0 and jsonb_typeof(a->'terms')='object' and coalesce(a->>'status' in ('proposed','accepted','completed'),false);
 expired=own and p->>'control_mode' in ('bot','paused') and p->>'expires_at' is not null and (p->>'expires_at')::timestamptz<=p_now;
 bot_spoke=exists(select 1 from jsonb_array_elements(coalesce(p->'messages','[]')) m where m->>'author_kind'='bot') or p->'initial_price_proposal'->>'amount' is not null;
 labels=array['Recherche','Contact','Négociation','Accord','Réception','Clôture'];
 keys=array['search','contact','negotiation','agreement','fulfilment','closure'];
 done=array[p->>'deal_room_id' is not null,joined,proposed,accepted,accepted and fulfilled,finished];
 phase=case when finished then 6 when accepted and fulfilled then 6 when accepted then 5 when proposed then 4 when joined then 3 else 2 end;
 if p->>'kind'='announcement' then
 labels=array['Offre choisie','Dossier','Transmission','Réponse'];keys=array['search','preparation','submission','outcome'];
 done=array[p->>'deal_room_id' is not null,e->>'application_prepared_at' is not null,e->>'application_submitted_at' is not null,e->>'application_outcome' is not null];
 phase=case when e->>'application_submitted_at' is not null then 4 when e->>'application_prepared_at' is not null then 3 else 2 end;
 if e->>'application_outcome' is not null then
 state='completed';actor='done';
 title=case when e->>'application_outcome'='retained' then 'Candidature retenue' else 'Candidature non retenue' end;
 detail=case when not own then 'Votre réponse est enregistrée et a été transmise.' when e->>'application_outcome'='retained' then 'L’annonceur a retenu votre dossier. Poursuivez avec lui dans l’échange.' else 'L’annonceur n’a pas retenu ce dossier. Vous pouvez reprendre une recherche.' end;
 elsif own then
 if phase=2 and actions ? 'application_prepare' then title='Préparer votre dossier';detail='Rassemblez les éléments demandés pour cette opportunité.';action='application_prepare';cta='Préparer ma démarche';
 elsif phase=3 and actions ? 'application_submit' then title='Confirmer la transmission';detail='Confirmez uniquement un dossier réellement transmis.';action='application_submit';cta='Je confirme avoir transmis mon dossier';
 else actor='counterparty';title='Réponse attendue';detail='La transmission est déclarée. Aucun résultat n’est encore confirmé.';end if;
 elsif actions ? 'application_outcome' then title='Répondre au dossier';detail='Le dossier vous a été transmis. Indiquez s’il est retenu.';action='application_outcome';cta='Répondre au dossier';
 else actor='counterparty';title='Dossier en préparation';detail='Le candidat prépare son dossier. Vous pourrez y répondre après sa transmission.';end if;
 elsif finished then
 state='completed';title='Deal clôturé';detail='Les deux parties ont confirmé la fin de l’échange.';actor='done';
 if actions ? 'rating' and (case when own then e->>'owner_rating' else e->>'provider_rating' end) is null then actor='you';action='rating';cta='Évaluer l’échange';detail='Votre avis est facultatif.';end if;
 elsif not joined then
 title='Inviter votre interlocuteur';detail='Il doit rejoindre la Deal Room avant de pouvoir y répondre.';
 if own and actions ? 'invite' then action='invite';cta='Préparer et copier l’invitation';else actor='counterparty';end if;
 elsif accepted then
 if e->>'receipt_at' is null then
 title='Confirmer la réception';detail='Validez uniquement après la remise du produit ou la réalisation de la prestation.';
 if actions ? 'receipt' and coalesce((p->>'buyer')::boolean,true) is false then title='Confirmer la remise';detail='Validez uniquement après avoir remis le produit ou réalisé la prestation.';action='receipt';cta='Confirmer la remise';elsif actions ? 'receipt' then action='receipt';cta='Confirmer la réception';elsif actions ? 'payment_receive' then title='Confirmer le paiement reçu';detail='Le paiement est déclaré. Vérifiez sa réception effective.';action='payment_receive';cta='J’ai reçu le paiement';else actor='counterparty';title='Réception attendue';detail='La personne qui reçoit doit confirmer la réception.';end if;
 elsif e->>'payment_reported_at' is null then
 title='Déclarer le paiement effectué';detail='Cette déclaration ne déclenche aucun transfert d’argent.';
 if actions ? 'payment_report' then action='payment_report';cta='J’ai effectué le paiement';else actor='counterparty';title='Paiement à déclarer';detail='La personne qui paie doit déclarer son paiement.';end if;
 elsif e->>'payment_received_at' is null then
 title='Confirmer le paiement reçu';detail='Vérifiez la réception effective avant de confirmer.';
 if actions ? 'payment_receive' then action='payment_receive';cta='J’ai reçu le paiement';else actor='counterparty';title='Confirmation du paiement attendue';detail='Votre interlocuteur doit confirmer le paiement reçu.';end if;
 elsif not mine_done and actions ? 'complete' then title='Confirmer la clôture';detail='Réception et paiement sont confirmés. Chaque partie clôture séparément.';action='complete';cta='Confirmer la clôture';
 elsif not other_done then actor='counterparty';title='Dernière confirmation attendue';detail='Votre clôture est enregistrée. L’autre partie doit encore confirmer.';
 else actor='system';title='Vérification de la clôture';detail='Les confirmations doivent être synchronisées avant de terminer.';action='refresh';cta='Actualiser';end if;
 elsif proposed then
 if not mine_signed and actions ? 'accept' then title='Relire les conditions';detail='Vérifiez la version '||(a->>'version')||' avant de donner votre accord.';action='review';cta='Relire les conditions';
 elsif mine_signed then actor='counterparty';title='Accord de l’autre partie attendu';detail='Votre accord est enregistré pour cette version.';
 else actor='system';title='Actualiser les conditions';detail='Les confirmations disponibles doivent être vérifiées.';action='refresh';cta='Actualiser l’échange';end if;
 elsif own and expired then title='Reprendre la décision';detail='Le mandat est arrivé à échéance. Aucun nouvel envoi automatique n’est autorisé.';action='takeover';cta='Reprendre la main';
 elsif own and p->>'control_mode'='paused' then title='Bot est en pause';detail='L’historique et le mandat sont conservés.';action='resume_bot';cta='Reprendre avec le mandat conservé';
 elsif own and p->>'control_mode'='bot' then
 if actions ? 'approve_step' then title='Autoriser l’étape de Bot';detail='La prochaine proposition ou relance reste dans les limites de votre mandat.';action='approve_step';cta='Autoriser l’étape';
 elsif bot_spoke then actor='counterparty';title='Réponse attendue';detail='Bot a écrit dans l’échange. La réponse de l’interlocuteur est attendue.';
 else actor='bot';title='Bot prend le relais';detail='Son intervention suit vos limites et les horaires du mandat. Vous confirmerez l’accord final.';end if;
 elsif actions ? 'propose' and p->>'kind'<>'service' and p->>'price' is not null then title='Proposer vos conditions';detail='Précisez le prix total, la remise et le paiement convenu.';action='propose';cta='Proposer un prix / des conditions';
 elsif actions ? 'message' then title='Préciser la demande';detail='Échangez sur le prix total et les conditions avant l’accord.';action='message';cta='Écrire dans l’échange';
 else actor='counterparty';title='Échange en attente';detail='La prochaine action dépend de votre interlocuteur.';end if;
 if p->>'blocked_reason' is not null then state='blocked';actor='system';title='Dossier à vérifier';detail='Un échange historique doit être relié avant de continuer.';action=null;cta=null;
 elsif e->>'issue' is not null then state='blocked';actor='both';title='Problème à résoudre';detail='Un signalement est enregistré. La clôture est suspendue.';action='issue';cta='Voir le signalement';
 elsif coalesce((p->>'closed')::boolean,false) and not finished then state='stopped';actor='system';title='Dossier fermé';detail='Ce dossier n’accepte plus d’action. Son historique reste disponible.';action=null;cta=null;
 end if;
 if action in ('invite','propose','receipt','payment_report','payment_receive','complete','resume_bot','takeover','approve_step','application_prepare','application_submit','application_outcome') and not (actions ? action) then
 actor='system';action='refresh';cta='Actualiser l’échange';title='Actualiser le suivi';detail='Les actions disponibles ont changé.';
 end if;
 -- Receipt and payment can occur in either order according to the agreed terms.
 if accepted and not fulfilled and state='active' then
 foreach choice in array array['receipt','payment_report','payment_receive'] loop
 if actions ? choice and choice is distinct from action then
 alternatives=alternatives||jsonb_build_array(jsonb_build_object('action',choice,'label',case choice when 'receipt' then case when coalesce((p->>'buyer')::boolean,true) then 'Confirmer la réception' else 'Confirmer la remise' end when 'payment_report' then 'J’ai effectué le paiement' else 'J’ai reçu le paiement' end));
 end if;
 end loop;
 end if;
 for i in 1..array_length(labels,1) loop
 step_state=case when coalesce(done[i],false) then 'complete' when i=phase and state in ('blocked','stopped') then 'blocked' when i=phase then 'current' else 'upcoming' end;
 steps=steps||jsonb_build_array(jsonb_build_object('id',keys[i],'label',labels[i],'state',step_state));
 end loop;
 if accepted then
 checks=jsonb_build_array(jsonb_build_object('label','Réception confirmée','confirmed',e->>'receipt_at' is not null),jsonb_build_object('label','Paiement déclaré','confirmed',e->>'payment_reported_at' is not null),jsonb_build_object('label','Paiement reçu','confirmed',e->>'payment_received_at' is not null));
 if fulfilled then checks=checks||jsonb_build_array(jsonb_build_object('label','Votre clôture','confirmed',mine_done),jsonb_build_object('label','Clôture de l’autre partie','confirmed',other_done));end if;
 end if;
 return jsonb_build_object('schema','waouh.room_guidance.v1','phase',keys[phase],'phase_label',labels[phase],'step',phase,'total',array_length(labels,1),'status',state,'actor',actor,
 'actor_label',case when actor='you' then 'À vous' when actor='bot' then 'Bot' when actor='counterparty' then 'Réponse attendue' when actor='both' then 'À résoudre ensemble' when actor='done' then 'Terminé' else 'Vérification' end,
 'title',title,'detail',detail,'action',action,'action_label',cta,'steps',steps,'checklist',checks,'alternatives',alternatives,'offer_version',coalesce((a->>'version')::integer,0));
end $$;
revoke all on function public.waouh_room_guidance(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.waouh_room_guidance(jsonb,timestamptz) to service_role;
