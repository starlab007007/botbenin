-- Protect every Deal Room confirmation, including invitations and direct RPC callers.
create or replace function public.waouh_check_room_agreement_limits()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  limits record;
  base numeric;
  fees numeric;
begin
  if new.status <> 'proposed' or
    not ((new.owner_accepted_at is not null and new.owner_accepted_at is distinct from old.owner_accepted_at) or
         (new.provider_accepted_at is not null and new.provider_accepted_at is distinct from old.provider_accepted_at)) then
    return new;
  end if;

  select m.budget_max, m.criteria ? 'workflow:sale' as is_sale, c.extra_cost,
    nullif(r.mandate->>'price_floor', '')::numeric as price_floor,
    nullif(r.mandate->>'budget_max', '')::numeric as mandate_budget
  into limits
  from public.waouh_deal_room_links r
  join public.waouh_convergence_components c on c.id = r.id
  join public.waouh_convergence_missions m on m.id = c.mission_id
  where r.id = new.component_id;
  if not found then return new; end if;

  base := (new.terms->>'amount')::numeric;
  fees := greatest(0, limits.extra_cost, nullif(new.terms->>'delivery_fee', '')::numeric);
  if not limits.is_sale and base + fees > least(limits.budget_max, limits.mandate_budget) then
    raise exception 'budget_exceeded' using errcode = '22023';
  end if;
  if limits.is_sale and base < limits.price_floor then
    raise exception 'price_floor_not_met' using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists waouh_room_agreement_limits on public.waouh_convergence_agreements;
create trigger waouh_room_agreement_limits
before update of owner_accepted_at, provider_accepted_at on public.waouh_convergence_agreements
for each row execute function public.waouh_check_room_agreement_limits();

-- The existing autonomous worker emits a versioned decision key.
create or replace function public.waouh_link_room_decision()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  room_id text := new.payload->>'deal_room_id';
  revision text := split_part(new.dedupe_key, ':', 3);
  destination text;
begin
  if room_id ~ '^[0-9a-f-]{36}$' and revision ~ '^[1-9][0-9]*$'
    and new.dedupe_key = 'bot-decision:' || room_id || ':' || revision then
    destination := '/app/deal-room?room_id=' || room_id || '&decision_version=' || revision;
    new.payload := new.payload || jsonb_build_object('url', destination, 'target_route', destination);
  end if;
  return new;
end $$;

drop trigger if exists waouh_room_decision_link on public.waouh_notifications;
create trigger waouh_room_decision_link
before insert on public.waouh_notifications
for each row when (new.dedupe_key like 'bot-decision:%')
execute function public.waouh_link_room_decision();

create or replace function public.waouh_room_followup(p_actor uuid)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object('rooms', coalesce(jsonb_agg(to_jsonb(room) order by room.created_at desc), '[]'::jsonb))
  from (
    select r.id as deal_room_id, c.title, r.control_mode, r.created_at,
      a.version as decision_version,
      event.event_type as latest_event,
      case
        when r.blocked_reason is not null then 'blocked'
        when a.status in ('accepted', 'completed', 'rejected') then a.status
        when a.status = 'proposed' then
          case when (case when r.owner_id = p_actor then a.owner_accepted_at else a.provider_accepted_at end) is not null
            then 'awaiting_other' else 'awaiting_you' end
        when c.kind = 'announcement' and evidence.application_outcome is not null then 'application_answered'
        when c.kind = 'announcement' and evidence.application_submitted_at is not null then 'application_submitted'
        when c.kind = 'announcement' and evidence.application_prepared_at is not null then 'application_prepared'
        when c.provider_id is null then 'awaiting_contact'
        when r.control_mode = 'bot' then 'bot'
        when r.control_mode = 'paused' then 'paused'
        else 'manual'
      end as next_status
    from public.waouh_deal_room_links r
    join public.waouh_convergence_components c on c.id = r.id
    left join public.waouh_convergence_agreements a on a.component_id = r.id
    left join public.waouh_business_evidence evidence on evidence.component_id = r.id and evidence.version = coalesce(a.version, 0)
    left join lateral (
      select e.event_type from public.waouh_room_events e
      where e.room_id = r.id order by e.id desc limit 1
    ) event on true
    where r.owner_id = p_actor or c.provider_id = p_actor
    order by r.created_at desc
    limit 100
  ) room;
$$;

revoke all on function public.waouh_room_followup(uuid) from public, anon, authenticated;
grant execute on function public.waouh_room_followup(uuid) to service_role;
