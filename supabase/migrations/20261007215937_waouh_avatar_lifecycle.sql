-- One bounded executor; lease and claims are service-only.
create table if not exists public.waouh_avatar_worker_leases (
  name text primary key, token uuid not null, expires_at timestamptz not null
);
alter table public.waouh_avatar_worker_leases enable row level security;
revoke all on public.waouh_avatar_worker_leases from public,anon,authenticated;
grant all on public.waouh_avatar_worker_leases to service_role;
create or replace function public.waouh_avatar_claim_worker(p_token uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
  insert into waouh_avatar_worker_leases(name,token,expires_at)
  values('lifecycle',p_token,now()+interval '600 seconds')
  on conflict(name) do update set token=excluded.token,expires_at=excluded.expires_at
  where waouh_avatar_worker_leases.expires_at<now();
  return found;
end $$;
create or replace function public.waouh_avatar_release_worker(p_token uuid)
returns void language sql security invoker set search_path=public as $$
 delete from waouh_avatar_worker_leases where name='lifecycle' and token=p_token;
$$;
revoke all on function public.waouh_avatar_claim_worker(uuid), public.waouh_avatar_release_worker(uuid) from public,anon,authenticated;
grant execute on function public.waouh_avatar_claim_worker(uuid), public.waouh_avatar_release_worker(uuid) to service_role;

create unique index if not exists waouh_avatar_legacy_mission_unique
on public.waouh_avatar_mandates((metadata->>'legacy_mission_id')) where metadata ? 'legacy_mission_id';
create unique index if not exists waouh_avatar_approval_action_unique
on public.waouh_agent_approvals((context->>'avatar_action_key')) where context ? 'avatar_action_key';
create index if not exists waouh_avatar_journey_mandate_stage
on public.waouh_opportunity_journeys(mandate_id,stage,last_activity_at);

-- Atomic legacy bridge. Search-only missions retain assisted permissions.
create or replace function public.waouh_avatar_bridge_missions(p_limit integer default 20)
returns integer language plpgsql security invoker set search_path=public as $$
declare m record; mid uuid; n integer:=0; budget numeric; continuous boolean;
begin
 for m in select a.* from waouh_agent_missions a
 where a.status='active' and not exists(select 1 from waouh_avatar_mandates b where b.metadata->>'legacy_mission_id'=a.id::text)
 order by a.created_at limit least(greatest(p_limit,1),100) for update skip locked
 loop
   budget:=case when coalesce(m.constraints->>'budget_max_amount',m.constraints->>'budget_max','') ~ '^\d+(\.\d+)?$'
     then coalesce(m.constraints->>'budget_max_amount',m.constraints->>'budget_max')::numeric else null end;
   continuous:=exists(select 1 from waouh_agent_steps s where s.mission_id=m.id and s.tool_name='continuous_watch');
   insert into waouh_avatar_mandates(owner_id,mode,autonomy_mode,goal,normalized_query,city,budget_max,max_contacts,max_followups,
    allow_waouh,allow_whatsapp,allow_public_business,require_approval_for_c1,status,expires_at,metadata)
   values(m.owner_id,'buy','assisted',m.goal,m.goal,m.constraints->>'city',budget,3,0,true,false,false,true,'active',now()+interval '72 hours',
    jsonb_build_object('legacy_mission_id',m.id,'external_refresh_enabled',false,'completion_goal',case when continuous then 'transaction' else 'recommendations' end,
     'migrated_permissions','search_only','followup_hours',8,'max_negotiation_rounds',0)) returning id into mid;
   insert into waouh_persistent_intents(owner_id,mandate_id,mode,query_text,city,budget_max,status,next_scan_at,expires_at,scan_interval_minutes,metadata)
   values(m.owner_id,mid,'find_sellers',m.goal,m.constraints->>'city',budget,'active',now(),now()+interval '72 hours',360,
     jsonb_build_object('legacy_mission_id',m.id,'external_refresh_enabled',false));
   update waouh_agent_missions set preferences=preferences||jsonb_build_object('avatar_mandate_id',mid),last_error=null where id=m.id;
   n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.waouh_avatar_bridge_missions(integer) from public,anon,authenticated;
grant execute on function public.waouh_avatar_bridge_missions(integer) to service_role;

-- State propagation has no outbound effect. A financial record is never fabricated.
create or replace function public.waouh_avatar_mandate_state_sync()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status is not distinct from old.status then return new; end if;
 update waouh_persistent_intents set status=new.status, next_scan_at=case when new.status='active' then now() else next_scan_at end
 where mandate_id=new.id;
 if new.metadata ? 'legacy_mission_id' then
   update waouh_agent_missions set status=case when new.status='expired' then 'paused' else new.status end,
    completed_at=case when new.status in ('completed','cancelled') then now() else completed_at end
   where id::text=new.metadata->>'legacy_mission_id' and owner_id=new.owner_id;
 end if;
 if new.status in ('completed','cancelled','expired') then
   update waouh_agent_approvals set status='cancelled',decision_note='Mandat terminé',decided_at=now()
   where status='pending' and context->>'mandate_id'=new.id::text;
 end if;
 return new;
end $$;
revoke all on function public.waouh_avatar_mandate_state_sync() from public,anon,authenticated;
create trigger waouh_avatar_mandate_state_sync after update of status on public.waouh_avatar_mandates
for each row execute function public.waouh_avatar_mandate_state_sync();

create or replace function public.waouh_avatar_finish_mission()
returns trigger language plpgsql security definer set search_path=public as $$
declare m record;
begin
 if new.mandate_id is null or new.stage not in ('agreed','completed') then return new; end if;
 if tg_op='UPDATE' and new.stage is not distinct from old.stage then return new; end if;
 select * into m from waouh_avatar_mandates where id=new.mandate_id and owner_id=new.owner_id for update;
 if m.id is null or m.status not in ('active','paused') then return new; end if;
 update waouh_avatar_mandates set metadata=metadata||jsonb_build_object('agreement_reached_at',now()) where id=m.id;
 -- Agreement stops prospecting immediately; fulfillment remains supervised.
 update waouh_persistent_intents set status='paused' where mandate_id=m.id and status='active';
 if new.stage='completed' or m.metadata->>'completion_goal'='agreement' then
  update waouh_avatar_mandates set status='completed',metadata=metadata||jsonb_build_object(
   'completed_at',now(),'winning_journey_id',new.id,'deal_id',new.deal_id,'outcome','fulfilled') where id=m.id;
  update waouh_opportunity_journeys set stage='cancelled',last_action='mission_fulfilled_elsewhere',
   last_message='Mission accomplie avec une autre opportunité.',next_best_action='COMPLETE',completed_at=now()
  where mandate_id=m.id and id<>new.id and stage in ('discovered','enriching','contact_ready','contacting','waiting_reply');
 end if;
 return new;
end $$;
revoke all on function public.waouh_avatar_finish_mission() from public,anon,authenticated;
create trigger waouh_avatar_finish_mission after insert or update of stage on public.waouh_opportunity_journeys
for each row execute function public.waouh_avatar_finish_mission();

-- Lock the exact approved revision through the existing atomic commerce transition.
create or replace function public.waouh_avatar_accept_approved_offer(
 p_approval_id uuid,p_negotiation_id uuid,p_thread_id uuid,p_actor_user_id uuid default null,
 p_actor_role text default null,p_commission_rate numeric default 0.05,p_correlation_id text default null
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare a record; n record; m record; result jsonb;
begin
 select * into a from waouh_agent_approvals where id=p_approval_id for update;
 if a.id is null or a.status<>'approved' or a.action_type<>'accept_offer' or a.context->>'operation'<>'avatar.lifecycle'
 then raise exception 'avatar_approval_required'; end if;
 select * into m from waouh_avatar_mandates where id=(a.context->>'mandate_id')::uuid for update;
 if m.id is null or m.owner_id<>a.owner_id or m.status<>'active' or m.expires_at<=now()
 or not exists(select 1 from waouh_users where id=p_actor_user_id and auth_user_id=a.owner_id)
 then raise exception 'avatar_mandate_inactive'; end if;
 select * into n from waouh_negotiations where id=p_negotiation_id for update;
 if n.id is null or n.id::text<>a.context->>'negotiation_id' or p_thread_id::text<>a.context->>'thread_id'
 or n.updated_at is distinct from (a.context->>'negotiation_revision')::timestamptz
 or n.last_offer_price is distinct from (a.context->>'amount')::numeric
 then raise exception 'offer_changed_reapproval_required'; end if;
 result:=waouh_accept_negotiation_atomic(p_negotiation_id,p_thread_id,p_actor_user_id,p_actor_role,p_commission_rate,p_correlation_id);
 return result;
end $$;
revoke all on function public.waouh_avatar_accept_approved_offer(uuid,uuid,uuid,uuid,text,numeric,text) from public,anon,authenticated;
grant execute on function public.waouh_avatar_accept_approved_offer(uuid,uuid,uuid,uuid,text,numeric,text) to service_role;

create or replace function public.waouh_avatar_preserve_optout()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (tg_op='UPDATE' and old.consent_state='revoked') or exists(
  select 1 from waouh_entity_contacts where value_hash=new.value_hash and consent_state='revoked'
 ) then
  new.consent_state:='revoked'; new.contactability_level:='C0';
  new.verification_status:='revoked'; new.is_whatsapp_reachable:=false;
 end if;
 return new;
end $$;
revoke all on function public.waouh_avatar_preserve_optout() from public,anon,authenticated;
create trigger waouh_avatar_preserve_optout before insert or update on public.waouh_entity_contacts
for each row execute function public.waouh_avatar_preserve_optout();
