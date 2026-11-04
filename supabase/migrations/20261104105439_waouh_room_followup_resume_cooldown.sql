-- A pause/resume cannot bypass the 24-hour follow-up interval. New seller offers remain immediate.
create or replace function public.waouh_room_tick(p_limit integer default 20,p_room_id uuid default null) returns integer
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
 elsif r.followups<coalesce((r.mandate->>'max_followups')::integer,1) and a.id is null
 and not exists(select 1 from public.waouh_room_events where room_id=r.id and actor_kind='bot' and event_type='bot_step' and created_at>now()-interval '24 hours') then
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
 then greatest(now()+interval '1 minute',(select max(created_at)+interval '24 hours' from public.waouh_room_events where room_id=r.id and actor_kind='bot' and event_type='bot_step'))
 else now()+interval '24 hours' end,mandate=mandate-'one_step_approved'-'approved_version' where id=r.id;
 exception when others then
 update public.waouh_deal_room_links set next_run_at=now()+interval '15 minutes' where id=r.id;
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type) values(r.id,r.owner_id,'system','retry_required');
 end;
 end loop;
 return counted;
end $$;
revoke all on function public.waouh_room_tick(integer,uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_tick(integer,uuid) to service_role;
