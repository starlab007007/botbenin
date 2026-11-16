-- Recover incomplete invitations without replaying a queued or failed first message.
create index if not exists waouh_outbound_room_first_contact
  on public.waouh_outbound_queue (dedupe_key, created_at desc)
  where template = 'deal_room_guest_outreach' and dedupe_key is not null;

create or replace function public.waouh_room_contact_candidates(p_limit integer default 30)
returns table (room_id uuid)
language sql
stable
set search_path = public, pg_temp
as $$
  select l.id
  from public.waouh_deal_room_links l
  join public.waouh_convergence_components c on c.id = l.id
  join public.waouh_convergence_missions m on m.id = c.mission_id
  left join public.waouh_room_guests g on g.room_id = l.id
  where l.active and l.blocked_reason is null and m.status not in ('completed', 'cancelled')
    and ((l.control_mode = 'bot' and l.expires_at > now()) or c.provider_id = public.waouh_room_guest_actor())
    and (c.provider_id is null or c.provider_id = public.waouh_room_guest_actor())
    and (g.room_id is null or (g.status <> 'stopped' and g.token_expires_at > now()))
    and not exists (
      select 1 from public.waouh_outbound_queue q
      where q.template = 'deal_room_guest_outreach' and q.dedupe_key = 'dr-first:' || l.id
    )
    and (
      g.phone_encrypted is not null
      or (c.source_ref like 'catalog:%' and l.control_mode = 'bot' and l.expires_at > now())
      or exists (
        select 1 from public.waouh_external_commerce_signals s
        join public.waouh_entity_contacts ec on ec.entity_id = s.entity_id
        where 'external:' || s.id = c.source_ref
          and s.status = 'active' and (s.expires_at is null or s.expires_at > now())
          and ec.channel in ('whatsapp', 'phone') and ec.value_encrypted is not null
          and ec.consent_state is distinct from 'revoked'
          and (
            ec.is_public_business or ec.consent_state in ('public_business', 'initiated', 'opt_in', 'partner_contract')
            or (l.control_mode = 'bot' and l.expires_at > now() and ec.is_whatsapp_reachable
              and ec.verification_status = 'reachable' and ec.contactability_level ~ '^C[1-5]$')
          )
      )
    )
  order by (g.phone_encrypted is not null) desc, l.created_at, l.id
  limit least(100, greatest(1, coalesce(p_limit, 30)));
$$;

create or replace function public.waouh_room_record_outreach_ack(p_provider_message_id text, p_status text)
returns void
language sql
set search_path = public, pg_temp
as $$
  update public.waouh_outbound_queue
  set payload = jsonb_set(payload, '{room_delivery_status}', to_jsonb(p_status))
  where template = 'deal_room_guest_outreach'
    and p_status in ('failed', 'sent', 'delivered', 'read')
    and payload->>'provider_message_id' = p_provider_message_id
    and case coalesce(payload->>'room_delivery_status', '')
      when 'read' then false
      when 'delivered' then p_status = 'read'
      when 'failed' then p_status in ('delivered', 'read')
      else true
    end;
$$;

revoke all on function public.waouh_room_contact_candidates(integer) from public, anon, authenticated;
revoke all on function public.waouh_room_record_outreach_ack(text, text) from public, anon, authenticated;
grant execute on function public.waouh_room_contact_candidates(integer) to service_role;
grant execute on function public.waouh_room_record_outreach_ack(text, text) to service_role;
