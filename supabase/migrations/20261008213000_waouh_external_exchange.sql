-- Transaction-scoped guest access. Tokens are capabilities, stored only as SHA-256 hashes.
create table if not exists public.waouh_external_invites (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.waouh_opportunity_journeys(id) on delete cascade,
  token_hash text not null unique check(length(token_hash)=64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists waouh_external_invites_journey_idx on public.waouh_external_invites(journey_id);
alter table public.waouh_external_invites enable row level security;
revoke all on public.waouh_external_invites from anon, authenticated;
grant all on public.waouh_external_invites to service_role;

create table if not exists public.waouh_external_agreements (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.waouh_opportunity_journeys(id) on delete cascade,
  terms jsonb not null,
  proposed_by text not null check(proposed_by in ('owner','counterparty')),
  owner_accepted_at timestamptz,
  counterparty_accepted_at timestamptz,
  shipped_at timestamptz,
  received_at timestamptz,
  payment_reported_at timestamptz,
  payment_received_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists waouh_external_agreements_current_uq on public.waouh_external_agreements(journey_id) where superseded_at is null;
alter table public.waouh_external_agreements enable row level security;
revoke all on public.waouh_external_agreements from anon, authenticated;
grant all on public.waouh_external_agreements to service_role;

-- The journey lock serializes offers, acceptance and completion. Only the service handler
-- can call this function after validating the owner or a live, transaction-scoped token.
create or replace function public.waouh_external_exchange_mutate(
  p_journey_id uuid, p_role text, p_operation text, p_request_id uuid,
  p_text text default '', p_terms jsonb default '{}', p_agreement_id uuid default null,
  p_invite_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare j public.waouh_opportunity_journeys; a public.waouh_external_agreements;
  buyer_role text; seller_role text; existing uuid; now_at timestamptz := now();
begin
  if p_role not in ('owner','counterparty') then raise exception 'invalid_role'; end if;
  select * into j from public.waouh_opportunity_journeys where id=p_journey_id for update;
  if not found then raise exception 'journey_not_found'; end if;
  if p_role='counterparty' and not exists(select 1 from public.waouh_external_invites where id=p_invite_id and journey_id=j.id and revoked_at is null and expires_at>now_at) then raise exception 'invite_unavailable'; end if;
  select id into existing from public.waouh_conversation_bus_events where event_type='nexus.external.message' and external_ref='exchange:'||j.id::text||':'||p_role||':'||p_request_id::text;
  if existing is not null then return jsonb_build_object('reused',true); end if;
  if j.stage in ('completed','cancelled') then raise exception 'journey_closed'; end if;
  if (select count(*) from public.waouh_conversation_bus_events where journey_id=j.id and event_type='nexus.external.message' and payload->>'role'=p_role and created_at>now_at-interval '1 minute')>=12 then raise exception 'exchange_rate_limited'; end if;
  buyer_role := case when j.mode='sell' then 'counterparty' else 'owner' end;
  seller_role := case when buyer_role='owner' then 'counterparty' else 'owner' end;
  select * into a from public.waouh_external_agreements where journey_id=j.id and superseded_at is null for update;
  if p_operation='propose' then
    if j.stage in ('agreed','executing') or a.owner_accepted_at is not null and a.counterparty_accepted_at is not null then raise exception 'agreement_already_confirmed'; end if;
    if jsonb_typeof(p_terms)!='object' or coalesce((p_terms->>'amount')::numeric,0)<=0 or coalesce((p_terms->>'quantity')::numeric,0)<=0 or length(coalesce(p_terms->>'delivery','')) not between 1 and 300 or length(coalesce(p_terms->>'payment','')) not between 1 and 200 then raise exception 'invalid_terms'; end if;
    update public.waouh_external_agreements set superseded_at=now_at where journey_id=j.id and superseded_at is null;
    insert into public.waouh_external_agreements(journey_id,terms,proposed_by,owner_accepted_at,counterparty_accepted_at)
      values(j.id,p_terms,p_role,case when p_role='owner' then now_at end,case when p_role='counterparty' then now_at end) returning * into a;
    update public.waouh_opportunity_journeys set stage='negotiating',next_best_action='NEGOTIATE',last_action='external_offer_proposed',next_action='Confirmer les conditions proposées',updated_at=now_at where id=j.id;
  elsif p_operation in ('accept','shipment','receipt','payment','payment_received') then
    if a.id is null or a.id is distinct from p_agreement_id then raise exception 'agreement_changed'; end if;
    if p_operation='accept' then
      update public.waouh_external_agreements set owner_accepted_at=case when p_role='owner' then coalesce(owner_accepted_at,now_at) else owner_accepted_at end,
        counterparty_accepted_at=case when p_role='counterparty' then coalesce(counterparty_accepted_at,now_at) else counterparty_accepted_at end where id=a.id returning * into a;
      if a.owner_accepted_at is not null and a.counterparty_accepted_at is not null then
        update public.waouh_opportunity_journeys set stage='agreed',next_best_action='EXECUTE',contactability_level='C5',last_action='external_agreement_confirmed',next_action='Préparer la livraison',last_message='Les deux parties ont confirmé les mêmes conditions.',metadata=coalesce(metadata,'{}')||jsonb_build_object('external_agreement_id',a.id),updated_at=now_at where id=j.id;
      end if;
    else
      if a.owner_accepted_at is null or a.counterparty_accepted_at is null then raise exception 'agreement_not_confirmed'; end if;
      if (p_operation in ('shipment','payment_received') and p_role!=seller_role) or (p_operation in ('receipt','payment') and p_role!=buyer_role) then raise exception 'participant_role_required'; end if;
      if p_operation='payment_received' and a.payment_reported_at is null then raise exception 'payment_not_reported'; end if;
      update public.waouh_external_agreements set
        shipped_at=case when p_operation='shipment' then coalesce(shipped_at,now_at) else shipped_at end,
        received_at=case when p_operation='receipt' then coalesce(received_at,now_at) else received_at end,
        payment_reported_at=case when p_operation='payment' then coalesce(payment_reported_at,now_at) else payment_reported_at end,
        payment_received_at=case when p_operation='payment_received' then coalesce(payment_received_at,now_at) else payment_received_at end where id=a.id returning * into a;
      update public.waouh_opportunity_journeys set stage=case when a.received_at is not null and a.payment_received_at is not null then 'completed' else 'executing' end,
        completed_at=case when a.received_at is not null and a.payment_received_at is not null then now_at else null end,
        next_best_action=case when a.received_at is not null and a.payment_received_at is not null then 'COMPLETE' else 'EXECUTE' end,last_action='external_'||p_operation, next_action=case when a.received_at is null then 'Confirmer la réception' when a.payment_received_at is null then 'Confirmer le paiement reçu' else 'Transaction terminée' end,updated_at=now_at where id=j.id;
    end if;
  elsif p_operation='stop' then
    update public.waouh_opportunity_journeys set stage='cancelled',next_best_action='COMPLETE',completed_at=now_at,last_action='contact_opted_out',next_action='Échange arrêté',updated_at=now_at where id=j.id;
    update public.waouh_external_invites set revoked_at=now_at where journey_id=j.id and revoked_at is null;
  elsif p_operation!='message' then raise exception 'operation_not_allowed';
  end if;
  if p_role='counterparty' and p_operation!='stop' then
    update public.waouh_opportunity_journeys set last_response_at=now_at,last_activity_at=now_at,updated_at=now_at,contactability_level=case when contactability_level='C5' then 'C5' else 'C4' end,
      next_action=case when p_operation='message' and stage not in ('agreed','executing','completed') then 'Répondre à votre interlocuteur' else next_action end where id=j.id;
  end if;
  if p_operation='message' and length(trim(p_text)) not between 1 and 2000 then raise exception 'invalid_message'; end if;
  insert into public.waouh_conversation_bus_events(owner_id,journey_id,fabric_id,mandate_id,thread_id,article_id,channel,direction,event_type,external_ref,payload)
    values(j.owner_id,j.id,j.fabric_id,j.mandate_id,j.thread_id,j.article_id,'guest',case when p_role='owner' then 'out' else 'in' end,'nexus.external.message','exchange:'||j.id::text||':'||p_role||':'||p_request_id::text,
      jsonb_build_object('role',p_role,'text',left(p_text,2000),'operation',p_operation,'agreement_id',a.id,'terms',case when p_operation='propose' then p_terms else '{}' end));
  if p_operation!='message' then
    update public.waouh_opportunity_journeys set timeline=coalesce(timeline,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('at',now_at,'stage',stage,'action','external_'||p_operation,'message',case p_operation when 'propose' then 'Conditions proposées' when 'accept' then 'Conditions confirmées par un participant' when 'shipment' then 'Expédition déclarée par le vendeur' when 'receipt' then 'Réception confirmée par l’acheteur' when 'payment' then 'Paiement déclaré par l’acheteur' when 'payment_received' then 'Paiement reçu confirmé par le vendeur' else 'Échange arrêté' end)) where id=j.id;
  end if;
  return jsonb_build_object('agreement',to_jsonb(a));
end $$;
revoke all on function public.waouh_external_exchange_mutate(uuid,text,text,uuid,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.waouh_external_exchange_mutate(uuid,text,text,uuid,text,jsonb,uuid,uuid) to service_role;

create index if not exists waouh_external_provider_message_idx on public.waouh_outbound_queue((payload->>'provider_message_id')) where template='nexus_discovery_outreach';
create or replace function public.waouh_external_ack(p_provider_message_id text,p_status text)
returns boolean language plpgsql security definer set search_path=public as $$
declare q public.waouh_outbound_queue; j public.waouh_opportunity_journeys; old_status text;
begin
  if p_status not in ('sent','delivered','read','failed') then return false; end if;
  select * into q from public.waouh_outbound_queue where template='nexus_discovery_outreach' and payload->>'provider_message_id'=p_provider_message_id for update;
  if not found then return false; end if;
  select * into j from public.waouh_opportunity_journeys where id=(q.payload->>'journey_id')::uuid;
  if not found then return false; end if;
  select payload->>'delivery_status' into old_status from public.waouh_conversation_bus_events where event_type='nexus.external.delivery' and external_ref=q.id::text;
  if old_status='read' or old_status='delivered' and p_status!='read' then return true; end if;
  perform public.waouh_append_conversation_bus_event(p_owner_id=>j.owner_id,p_event_type=>'nexus.external.delivery',p_channel=>'whatsapp',p_direction=>'system',p_journey_id=>j.id,p_fabric_id=>j.fabric_id,p_external_ref=>q.id::text,p_payload=>jsonb_build_object('queue_id',q.id,'delivery_status',p_status));
  return true;
end $$;
revoke all on function public.waouh_external_ack(text,text) from public,anon,authenticated;
grant execute on function public.waouh_external_ack(text,text) to service_role;
