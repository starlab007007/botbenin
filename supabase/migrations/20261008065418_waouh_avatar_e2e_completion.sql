-- A signal belongs to a distinct mission; legacy standalone journeys keep their identity.
alter table public.waouh_opportunity_journeys drop constraint if exists waouh_opportunity_journeys_owner_id_fabric_id_mode_key;
create unique index if not exists waouh_avatar_journey_scope_unique
 on public.waouh_opportunity_journeys(owner_id,fabric_id,mode,mandate_id) where mandate_id is not null;
create unique index if not exists waouh_avatar_standalone_scope_unique
 on public.waouh_opportunity_journeys(owner_id,fabric_id,mode) where mandate_id is null;

create or replace function public.waouh_avatar_check_journey_scope()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='UPDATE' and (new.owner_id is distinct from old.owner_id or new.mandate_id is distinct from old.mandate_id) then
  raise exception 'journey_scope_immutable';
 end if;
 if new.mandate_id is not null and not exists(select 1 from waouh_avatar_mandates m where m.id=new.mandate_id and m.owner_id=new.owner_id and m.mode=new.mode) then
  raise exception 'journey_mandate_mismatch';
 end if;
 return new;
end $$;
revoke all on function public.waouh_avatar_check_journey_scope() from public,anon,authenticated;
create trigger waouh_avatar_check_journey_scope before insert or update on public.waouh_opportunity_journeys
for each row execute function public.waouh_avatar_check_journey_scope();

-- Endpoint contains a hash or canonical account id, never a clear telephone number.
create table public.waouh_avatar_contact_limits (
 owner_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null check(length(endpoint) between 5 and 160),
 journey_id uuid not null references public.waouh_opportunity_journeys(id) on delete cascade,
 reserved_at timestamptz not null default now(),
 primary key(owner_id,endpoint)
);
alter table public.waouh_avatar_contact_limits enable row level security;
revoke all on public.waouh_avatar_contact_limits from public,anon,authenticated;
grant all on public.waouh_avatar_contact_limits to service_role;
create or replace function public.waouh_avatar_claim_contact(p_owner_id uuid,p_journey_id uuid,p_endpoint text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare row_limit record;
begin
 if not exists(select 1 from waouh_opportunity_journeys j join waouh_avatar_mandates m on m.id=j.mandate_id
  where j.id=p_journey_id and j.owner_id=p_owner_id and m.status='active' and m.expires_at>now()
   and not(m.metadata ? 'agreement_reached_at') and j.stage not in ('completed','cancelled')) then return false; end if;
 -- All initial contacts from this owner serialize here; queue keys ensure retries are idempotent.
 perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text,0));
 select * into row_limit from waouh_avatar_contact_limits where owner_id=p_owner_id and endpoint=p_endpoint;
 if row_limit.journey_id=p_journey_id then return true; end if;
 if row_limit.reserved_at>now()-interval '24 hours' then return false; end if;
 if (select count(*) from waouh_avatar_contact_limits where owner_id=p_owner_id and reserved_at>now()-interval '24 hours')>=20 then return false; end if;
 insert into waouh_avatar_contact_limits(owner_id,endpoint,journey_id,reserved_at) values(p_owner_id,p_endpoint,p_journey_id,now())
 on conflict(owner_id,endpoint) do update set journey_id=excluded.journey_id,reserved_at=excluded.reserved_at;
 return true;
end $$;
revoke all on function public.waouh_avatar_claim_contact(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.waouh_avatar_claim_contact(uuid,uuid,text) to service_role;

create or replace function public.waouh_avatar_finish_mission()
returns trigger language plpgsql security definer set search_path=public as $$
declare m record;
begin
 if new.mandate_id is null or new.stage not in ('agreed','completed') then return new; end if;
 if tg_op='UPDATE' and new.stage is not distinct from old.stage then return new; end if;
 select * into m from waouh_avatar_mandates where id=new.mandate_id and owner_id=new.owner_id for update;
 if m.id is null or m.status not in ('active','paused') then return new; end if;
 if m.metadata ? 'winning_journey_id' and m.metadata->>'winning_journey_id'<>new.id::text then raise exception 'mission_already_agreed'; end if;
 update waouh_avatar_mandates set metadata=metadata||jsonb_build_object('agreement_reached_at',coalesce(metadata->>'agreement_reached_at',now()::text),'winning_journey_id',new.id,'deal_id',new.deal_id) where id=m.id;
 update waouh_persistent_intents set status='paused' where mandate_id=m.id and status='active';
 update waouh_agent_approvals set status='cancelled',decided_at=now(),decision_note='Un accord a été retenu pour cette mission.'
 where status='pending' and context->>'mandate_id'=m.id::text;
 -- Close only negotiations not in use by a different active mission or standalone journey.
 update waouh_negotiations n set state='closed',updated_at=now()
 where n.state in ('proposed','countered') and n.id is distinct from new.negotiation_id
 and exists(select 1 from waouh_opportunity_journeys j where j.mandate_id=m.id and j.id<>new.id and j.negotiation_id=n.id)
 and not exists(select 1 from waouh_opportunity_journeys j where j.negotiation_id=n.id and j.mandate_id is distinct from m.id and j.stage not in ('completed','cancelled'));
 update waouh_opportunity_journeys set stage='cancelled',last_action='mission_agreed_elsewhere',
  last_message='Un accord a été retenu pour cette mission. Cette piste est arrêtée.',next_best_action='COMPLETE',next_action='Consulter l’accord retenu',completed_at=now()
 where mandate_id=m.id and id<>new.id and stage in ('discovered','enriching','contact_ready','contacting','waiting_reply','negotiating');
 update waouh_outbound_queue set status='failed',last_error='mission_already_agreed',next_attempt_at=null
 where status='pending' and payload->>'mandate_id'=m.id::text and template='nexus_discovery_outreach';
 if new.stage='completed' or m.metadata->>'completion_goal'='agreement' then
  update waouh_avatar_mandates set status='completed',metadata=metadata||jsonb_build_object('completed_at',now(),
   'outcome',case when new.stage='completed' then 'fulfilled' else 'agreement_reached' end) where id=m.id;
 end if;
 return new;
end $$;
revoke all on function public.waouh_avatar_finish_mission() from public,anon,authenticated;

-- Serialize the final approval with the mission winner.
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
 or m.metadata ? 'agreement_reached_at'
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

-- Distinguish queued, sent, operator-delivered and replied. An in-app insert is not a read receipt.
create or replace function public.waouh_avatar_mission_metrics(p_owner_id uuid)
returns table(mandate_id uuid,discovered bigint,queued bigint,sent bigint,delivered bigint,replied bigint,agreed bigint,completed bigint)
language sql stable security invoker set search_path=public as $$
 select m.id,count(j.id),
  count(j.id) filter(where exists(select 1 from waouh_outbound_queue o where o.payload->>'journey_id'=j.id::text and o.status='pending')
    or exists(select 1 from waouh_tel_outbox o where o.payload->>'journey_id'=j.id::text and o.status in ('queued','retry','processing'))),
  count(j.id) filter(where exists(select 1 from waouh_outbound_queue o where o.payload->>'journey_id'=j.id::text and o.status in ('sent','delivered'))
    or exists(select 1 from waouh_tel_outbox o where o.payload->>'journey_id'=j.id::text and o.status='sent')),
  count(j.id) filter(where exists(select 1 from waouh_outbound_queue o where o.payload->>'journey_id'=j.id::text and o.status='delivered')
    or exists(select 1 from waouh_tel_outbox o join waouh_tel_receipts r on r.outbox_id=o.id where o.payload->>'journey_id'=j.id::text and r.status in ('delivered','read'))),
  m.replied_count::bigint,
  count(j.id) filter(where j.stage in ('agreed','executing','completed')),
  count(j.id) filter(where j.stage='completed')
 from waouh_avatar_mandates m left join waouh_opportunity_journeys j on j.mandate_id=m.id and j.owner_id=p_owner_id
 where m.owner_id=p_owner_id group by m.id;
$$;
revoke all on function public.waouh_avatar_mission_metrics(uuid) from public,anon,authenticated;
grant execute on function public.waouh_avatar_mission_metrics(uuid) to service_role;
