-- Transactional audit only: all test business data is rolled back; no financial transfer.
begin;
set local statement_timeout='30s';
do $audit$
declare buyer uuid;seller uuid;outsider uuid;room uuid;source jsonb;r jsonb;d jsonb;terms jsonb;rules jsonb;payload jsonb;v integer;revision integer;mode text;started timestamptz=clock_timestamp();denied boolean;before_count integer;results jsonb='[]';
begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 select u.id into buyer from auth.users u where
 not exists(select 1 from public.waouh_avatar_prefs p where p.auth_user_id=u.id and p.autonomy_settings->>'paused'='true')
 and (select count(*) from public.waouh_module_policy(u.id) where module_key in ('nexus','missions','avatar') and access_enabled and automation_enabled)=3
 and (select count(*) from public.waouh_business_messages where actor_id=u.id and created_at>now()-interval '1 minute')<5
 order by u.created_at limit 1;
 select id into seller from auth.users where id<>buyer order by created_at limit 1;
 select id into outsider from auth.users where id not in(buyer,seller) order by created_at limit 1;
 if buyer is null or seller is null or outsider is null then raise exception 'audit_missing_eligible_participants';end if;
 terms=jsonb_build_object('amount',150000,'quantity',1,'scope','Recette technique sans transaction réelle','deadline','Demain','exclusions','Aucune livraison réelle','expected_result','Validation du parcours technique','payment','Déclaration de test sans transfert financier');
 rules=jsonb_build_object('mode','autonomous','budget_max',145000,'initial_offer',140000,'duration_hours',72,'max_followups',1,'active_start','00:00','active_end','23:59');
 foreach mode in array array['manual','bot'] loop
 source=jsonb_build_object('title','Recette technique annulée','kind',case when mode='manual' then 'product' else 'service' end,'source_ref','audit-full:'||gen_random_uuid(),'amount',150000,'source_snapshot',jsonb_build_object('product',jsonb_build_object('title','Recette technique annulée','photos','[]'::jsonb)));
 r=public.waouh_room_command(buyer,'open',jsonb_build_object('request_id',gen_random_uuid(),'source',source,'city','Cotonou','confirmed',false));
 room=(r->>'deal_room_id')::uuid;
 if r->'guidance'->>'phase'<>'contact' then raise exception 'guidance_contact_failed';end if;
 if room is null or r->'agreement'<>'null'::jsonb then raise exception 'initial_room_contract';end if;
 d=public.waouh_room_command(buyer,'open',jsonb_build_object('request_id',gen_random_uuid(),'source',source,'city','Cotonou','confirmed',false));
 if d->>'deal_room_id'<>room::text then raise exception 'duplicate_room';end if;
 denied=false;begin perform public.waouh_room_command(outsider,'get',jsonb_build_object('deal_room_id',room));exception when insufficient_privilege then denied=true;end;
 if not denied then raise exception 'privacy_failure';end if;
 r=public.waouh_room_command(buyer,'invite',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid()));
 perform public.waouh_convergence_command(seller,'redeem_invite',jsonb_build_object('token',r->>'token'));
 r=public.waouh_room_command(buyer,'contact',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'confirmed',true));
 if not (r->>'provider_joined')::boolean or jsonb_array_length(r->'messages')<>1 then raise exception 'contact_or_opener_failed';end if;
 perform public.waouh_room_command(buyer,'contact',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'confirmed',true));
 d=public.waouh_room_command(buyer,'get',jsonb_build_object('deal_room_id',room));
 if jsonb_array_length(d->'messages')<>1 then raise exception 'duplicate_opener';end if;
 if mode='bot' then
 r=public.waouh_room_command(buyer,'delegate',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'confirmed',true,'mandate_revision',0,'rules',rules));
 if public.waouh_room_tick(1,room)<>1 then raise exception 'bot_initial_step_failed';end if;
 r=public.waouh_room_command(buyer,'pause',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'mandate_revision',r->'mandate_revision'));
 before_count=(select count(*) from public.waouh_business_messages where component_id=room);
 if public.waouh_room_tick(1,room)<>0 then raise exception 'paused_bot_sent';end if;
 r=public.waouh_room_command(buyer,'resume_bot',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'confirmed',true,'mandate_revision',r->'mandate_revision'));
 perform public.waouh_room_tick(1,room);
 if (select count(*) from public.waouh_business_messages where component_id=room)<>before_count then raise exception 'resume_sent_early_followup';end if;
 end if;
 r=public.waouh_room_command(seller,'propose',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',0,'terms',terms));
 if mode='bot' then
 if public.waouh_room_tick(1,room)<>1 then raise exception 'bot_counter_step_failed';end if;
 r=public.waouh_room_command(buyer,'get',jsonb_build_object('deal_room_id',room));
 if (r->'agreement'->'terms'->>'amount')::numeric<>145000 or r->'agreement'->>'owner_accepted_at' is not null then raise exception 'bot_price_or_automatic_acceptance';end if;
 revision=(r->>'mandate_revision')::integer;
 r=public.waouh_room_command(buyer,'takeover',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'mandate_revision',revision));
 if r->>'control_mode'<>'manual' then raise exception 'takeover_failed';end if;
 else
 r=public.waouh_room_command(buyer,'propose',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',1,'terms',terms||jsonb_build_object('amount',145000)));
 end if;
 v=(r->>'current_offer_version')::integer;
 denied=false;begin perform public.waouh_room_command(buyer,'accept',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v-1));exception when others then if sqlerrm not like '%changed%' then raise;end if;denied=true;end;
 if not denied then raise exception 'stale_version_accepted';end if;
 payload=jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'text','Reprise technique après interruption');
 perform public.waouh_room_command(buyer,'message',payload);
 r=public.waouh_room_command(buyer,'message',payload);
 if r->>'replayed'<>'true' then raise exception 'request_replay_failed';end if;
 d=public.waouh_room_command(seller,'get',jsonb_build_object('deal_room_id',room));
 if d->'mandate'<>'null'::jsonb then raise exception 'private_mandate_exposed';end if;
 r=public.waouh_room_command(buyer,'accept',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 if r->'agreement'->>'status'='accepted' then raise exception 'unilateral_agreement';end if;
 r=public.waouh_room_command(seller,'accept',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 if r->'guidance'->>'phase'<>'fulfilment' then raise exception 'guidance_fulfilment_failed';end if;
 if r->'agreement'->>'status'<>'accepted' then raise exception 'bilateral_agreement_failed';end if;
 denied=false;begin perform public.waouh_room_command(buyer,'complete',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));exception when others then if sqlerrm not like '%evidence%' then raise;end if;denied=true;end;
 if not denied then raise exception 'premature_closure';end if;
 perform public.waouh_room_command(seller,'receipt',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 perform public.waouh_room_command(buyer,'receipt',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 perform public.waouh_room_command(buyer,'payment_report',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 perform public.waouh_room_command(seller,'payment_receive',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 r=public.waouh_room_command(buyer,'complete',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 if r->'agreement'->>'status'='completed' then raise exception 'unilateral_closure';end if;
 r=public.waouh_room_command(seller,'complete',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 if r->'guidance'->>'status'<>'completed' then raise exception 'guidance_completion_failed';end if;
 if r->'agreement'->>'status'<>'completed' or r->>'closed'<>'true' then raise exception 'final_closure_failed';end if;
 r=public.waouh_room_command(buyer,'rating',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'rating',5));
 if r->'evidence'->>'owner_rating'<>'5' then raise exception 'rating_failed';end if;
 results=results||jsonb_build_array(jsonb_build_object('mode',mode,'final_status',r->'agreement'->>'status','history_messages',jsonb_array_length(r->'messages'),'rating',5));
 end loop;
 perform set_config('waouh.audit_report',jsonb_build_object('passed',true,'paths',results,'elapsed_ms',round(extract(epoch from(clock_timestamp()-started))*1000,1),'persisted_test_data',false)::text,true);
end $audit$;
do $release_audit$
declare
 actor uuid;
 other_actor uuid;
 waouh_buyer uuid;
 item uuid;
 buyer_request uuid;
 courier_id uuid;
 room_id uuid;
 current_version integer;
 result jsonb;
 input jsonb;
 offer jsonb;
 provider_message text := gen_random_uuid()::text;
 guest_actor uuid := public.waouh_room_guest_actor();
begin
 select a.id, u.auth_user_id into item, actor from public.waouh_articles a
  join public.waouh_users u on u.id=a.seller_id
  where a.status='active' and u.auth_user_id is not null limit 1;
 select u.id, u.auth_user_id into waouh_buyer, other_actor from public.waouh_users u
  where u.auth_user_id is not null and u.auth_user_id<>actor limit 1;
 if actor is null or other_actor is null then raise exception 'audit_missing_sale_participants'; end if;
 insert into public.waouh_buyer_profiles(user_id,query_text)
 values(waouh_buyer,'Recherche de contrôle '||gen_random_uuid()) returning id into buyer_request;
 input := jsonb_build_object('request_id',gen_random_uuid(),'city','Cotonou','confirmed',true,'source',
  jsonb_build_object('title','Vente de contrôle','kind','product','source_ref','sale:'||item||':buyer:'||buyer_request,'amount',150000,
   'source_snapshot','{"product":{"title":"Vente de contrôle","photos":[]}}'::jsonb));
 result := public.waouh_room_command(actor,'open',input);
 room_id := (result->>'deal_room_id')::uuid;
 if result->>'buyer'<>'false' or result->>'provider_joined'<>'true' then raise exception 'sale_seller_roles_not_linked'; end if;
 result := public.waouh_room_command(other_actor,'get',jsonb_build_object('deal_room_id',room_id));
 if result->>'buyer'<>'true' then raise exception 'sale_buyer_role_not_linked'; end if;
 offer := jsonb_build_object('amount',150000,'quantity',1,'scope','Article de contrôle',
  'deadline','Demain','exclusions','Aucune livraison','expected_result','Validation technique','payment','Paiement de contrôle');
 result := public.waouh_room_command(actor,'propose',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'version',0,'terms',offer));
 current_version := (result->>'current_offer_version')::integer;
 perform public.waouh_room_command(actor,'accept',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'version',current_version));
 result := public.waouh_room_command(other_actor,'accept',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'version',current_version));
 if result->'agreement'->>'status'<>'accepted' then raise exception 'sale_bilateral_accept_failed'; end if;
 select id into courier_id from public.waouh_couriers where active and phone_number is not null limit 1;
 if courier_id is null then raise exception 'audit_missing_courier'; end if;
 insert into public.waouh_room_deliveries(room_id,agreement_version,delivery_address)
 values(room_id,current_version,'Adresse de contrôle');
 if not public.waouh_room_assign_courier(room_id,courier_id,encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex'),'Invitation de contrôle') then raise exception 'courier_assignment_failed'; end if;
 if public.waouh_room_assign_courier(room_id,courier_id,repeat('a',64),'Invitation de contrôle') then raise exception 'courier_assignment_duplicated'; end if;
 if not exists (select 1 from public.waouh_outbound_queue q where q.dedupe_key='dr-courier:'||room_id||':'||current_version and q.payload->>'courier_delivery'='true') then raise exception 'courier_invitation_not_queued'; end if;
 perform public.waouh_room_reject_delivery_code(room_id);
 if not public.waouh_room_delivery_complete(room_id) then raise exception 'versioned_delivery_confirmation_failed'; end if;
 result := public.waouh_room_delivery_view(other_actor,room_id);
 if result->>'status'<>'delivered' or result->>'is_buyer'<>'true' then raise exception 'sale_delivery_proof_failed'; end if;
 perform public.waouh_room_command(other_actor,'payment_report',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'version',current_version));
 perform public.waouh_room_command(actor,'payment_receive',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'version',current_version));
 perform public.waouh_room_command(actor,'complete',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'version',current_version));
 result := public.waouh_room_command(other_actor,'complete',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'version',current_version));
 if result->'agreement'->>'status'<>'completed' then raise exception 'sale_closure_failed'; end if;

 input := jsonb_build_object('request_id',gen_random_uuid(),'city','Cotonou','confirmed',false,'source',
  jsonb_build_object('title','Opportunité de contrôle','kind','announcement','source_ref','external:'||gen_random_uuid(),
   'source_snapshot','{"product":{"title":"Opportunité de contrôle","photos":[]}}'::jsonb));
 result := public.waouh_room_command(actor,'open',input);
 room_id := (result->>'deal_room_id')::uuid;
 if not public.waouh_room_attach_pending_guest(room_id) then raise exception 'external_pending_failed'; end if;
 perform public.waouh_room_command(actor,'message',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'text','Message de contrôle'));
 insert into public.waouh_room_guests(room_id,reference,channel,consent_basis,token_hash,token_encrypted,token_expires_at)
 values(room_id,'DR-AUDIT','link','shared_link',md5(gen_random_uuid()::text),'sealed-fixture',now()+interval '1 day');
 perform public.waouh_room_command(actor,'application_prepare',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid()));
 perform public.waouh_room_command(actor,'application_submit',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'confirmation','submitted'));
 result := public.waouh_room_command(guest_actor,'application_outcome',jsonb_build_object('deal_room_id',room_id,'request_id',gen_random_uuid(),'outcome','retained'));
 if result->'evidence'->>'application_outcome'<>'retained' then raise exception 'external_application_decision_failed'; end if;
 if not exists(select 1 from public.waouh_business_messages b where b.component_id=room_id and b.text='Message de contrôle') then raise exception 'pending_history_lost'; end if;

 insert into public.waouh_outbound_queue(template,channel,status,dedupe_key,payload)
 values('deal_room_guest_outreach','whatsapp','sent','dr-first:'||room_id,jsonb_build_object('provider_message_id',provider_message));
 perform public.waouh_room_record_outreach_ack(provider_message,'delivered');
 perform public.waouh_room_record_outreach_ack(provider_message,'sent');
 if not exists(select 1 from public.waouh_outbound_queue where dedupe_key='dr-first:'||room_id and payload->>'room_delivery_status'='delivered') then raise exception 'delivery_receipt_regressed'; end if;
 perform set_config('waouh.audit_report',(current_setting('waouh.audit_report')::jsonb || '{"sale":"completed","courier_assignment":"queued_once","delivery_confirmation":"passed","external_opportunity":"retained","whatsapp_receipt_contract":"passed"}'::jsonb)::text,true);
 if has_column_privilege('anon','public.waouh_articles','contact_whatsapp','SELECT')
  or has_column_privilege('authenticated','public.waouh_articles','contact_whatsapp','SELECT')
  or not has_column_privilege('anon','public.waouh_articles','title','SELECT')
  or not has_column_privilege('service_role','public.waouh_articles','contact_whatsapp','SELECT')
 then raise exception 'article_contact_privileges_failed'; end if;
end $release_audit$;

select current_setting('waouh.audit_report')::jsonb as audit_report;
rollback;

