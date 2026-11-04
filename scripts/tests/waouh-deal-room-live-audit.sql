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
 if r->'agreement'->>'status'<>'accepted' then raise exception 'bilateral_agreement_failed';end if;
 denied=false;begin perform public.waouh_room_command(buyer,'complete',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));exception when others then if sqlerrm not like '%evidence%' then raise;end if;denied=true;end;
 if not denied then raise exception 'premature_closure';end if;
 perform public.waouh_room_command(buyer,'receipt',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 perform public.waouh_room_command(buyer,'payment_report',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 perform public.waouh_room_command(seller,'payment_receive',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 r=public.waouh_room_command(buyer,'complete',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 if r->'agreement'->>'status'='completed' then raise exception 'unilateral_closure';end if;
 r=public.waouh_room_command(seller,'complete',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'version',v));
 if r->'agreement'->>'status'<>'completed' or r->>'closed'<>'true' then raise exception 'final_closure_failed';end if;
 r=public.waouh_room_command(buyer,'rating',jsonb_build_object('deal_room_id',room,'request_id',gen_random_uuid(),'rating',5));
 if r->'evidence'->>'owner_rating'<>'5' then raise exception 'rating_failed';end if;
 results=results||jsonb_build_array(jsonb_build_object('mode',mode,'final_status',r->'agreement'->>'status','history_messages',jsonb_array_length(r->'messages'),'rating',5));
 end loop;
 perform set_config('waouh.audit_report',jsonb_build_object('passed',true,'paths',results,'elapsed_ms',round(extract(epoch from(clock_timestamp()-started))*1000,1),'persisted_test_data',false)::text,true);
end $audit$;
select current_setting('waouh.audit_report')::jsonb as audit_report;
rollback;

