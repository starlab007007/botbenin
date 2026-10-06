-- WAOUH Smart Event Envelope
-- Canonical metadata/action envelope for messages, notifications and outbound queue.
-- Additive only: preserves legacy payload fields and business state.

create or replace function public.waouh_smart_enrich_payload(
  p_payload jsonb,
  p_intent text,
  p_thread_id uuid,
  p_event_id uuid,
  p_text text,
  p_article_id uuid
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_intent text := lower(regexp_replace(coalesce(nullif(trim(p_intent), ''), 'message'), '[-[:space:]]+', '_', 'g'));
  v_domain text := 'chat';
  v_route text := '/app/chat/waouh';
  v_priority text := 'normal';
  v_actions jsonb := '[]'::jsonb;
  v_has_actions boolean := false;
  v_next text := 'open_context';
  v_corr text;
  v_smart jsonb;
begin
  if v_intent ~ '(stock|inventory|reorder|rupture|low_stock|out_of_stock)' then
    v_domain := 'stock'; v_route := '/app/stock';
  elsif v_intent ~ '(partner|payout|business|catalog)' then
    v_domain := 'partner'; v_route := '/app/partner';
  elsif v_intent ~ '(diffusion|campaign|broadcast|audience)' then
    v_domain := 'diffusion'; v_route := '/app/diffusion';
  elsif v_intent ~ '(whatsapp|waha|wa_)' then
    v_domain := 'whatsapp'; v_route := '/app/whatsapp';
  elsif v_intent ~ '(mission|watch|approval|avatar|agent|briefing|nudge)' then
    v_domain := 'missions'; v_route := '/app/missions';
  elsif v_intent ~ '(^|_)(ia|ai|bot)($|_)' then
    v_domain := 'ai'; v_route := '/app/ia';
  elsif v_intent ~ '(profile|identity|account)' then
    v_domain := 'profile'; v_route := '/app/profile';
  elsif v_intent ~ '(notif)' then
    v_domain := 'notifications'; v_route := '/app/notifications';
  elsif v_intent ~ '(deal|negoti|offer|buyer|seller|interest|payment|deliver|courier|article|sale)' then
    v_domain := 'commerce'; v_route := '/app/chat/waouh';
  end if;

  if v_intent ~ '(payment_request|confirm_payment|security|blocked|failed|urgent)' then
    v_priority := 'urgent';
  elsif v_intent ~ '(new_buyer|offer_received|approval|low_stock|out_of_stock|deal_created|deal_accepted|delivery)' then
    v_priority := 'high';
  elsif v_intent ~ '(ack|completed|paid|closed|dismiss)' then
    v_priority := 'low';
  end if;

  v_has_actions := jsonb_typeof(v_payload->'actions') = 'array';
  if v_has_actions then
    v_has_actions := jsonb_array_length(v_payload->'actions') > 0;
  end if;

  if v_has_actions then
    v_actions := v_payload->'actions';
    v_next := coalesce(v_actions->0->>'id', 'open_context');
  else
    v_actions := jsonb_build_array(jsonb_build_object(
      'id', 'open_context',
      'label',
        case v_domain
          when 'commerce' then 'Ouvrir la discussion'
          when 'missions' then 'Voir la mission'
          when 'ai' then 'Ouvrir mon IA'
          when 'whatsapp' then 'Ouvrir WhatsApp'
          when 'diffusion' then 'Voir la diffusion'
          when 'partner' then 'Voir l''espace partenaire'
          when 'stock' then 'Voir le stock'
          when 'profile' then 'Voir mon profil'
          when 'notifications' then 'Voir les notifications'
          else 'Ouvrir'
        end,
      'kind', 'navigate',
      'route', v_route,
      'priority', 1,
      'requires_auth', v_domain <> 'chat',
      'requires_confirmation', false
    ));
  end if;

  v_corr := coalesce(
    nullif(v_payload->>'correlation_id',''),
    nullif(v_payload->>'trace_id',''),
    case when p_event_id is not null then 'evt:' || p_event_id::text else null end
  );

  v_smart := jsonb_build_object(
    'schema', 'waouh.smart.v1',
    'domain', v_domain,
    'intent', v_intent,
    'priority', v_priority,
    'title', nullif(v_payload->>'title',''),
    'detail', nullif(v_payload->>'detail',''),
    'text', nullif(coalesce(p_text, v_payload->>'text'),''),
    'stage', nullif(coalesce(v_payload->>'stage', v_payload->>'workflow_state'),''),
    'route', v_route,
    'thread_id', coalesce(p_thread_id::text, nullif(v_payload->>'thread_id','')),
    'correlation_id', v_corr,
    'entities', jsonb_build_object(
      'article_id', coalesce(p_article_id::text, nullif(v_payload->>'article_id','')),
      'negotiation_id', nullif(v_payload->>'negotiation_id',''),
      'deal_id', nullif(v_payload->>'deal_id',''),
      'transaction_id', nullif(v_payload->>'transaction_id',''),
      'mission_id', nullif(v_payload->>'mission_id',''),
      'partner_id', nullif(v_payload->>'partner_id',''),
      'stock_item_id', nullif(v_payload->>'stock_item_id','')
    ),
    'recipient_role', nullif(coalesce(v_payload->>'recipient', v_payload->>'role'),''),
    'actions', v_actions,
    'next_best_action', v_next,
    'prediction', jsonb_build_object(
      'confidence', case when v_has_actions then 0.96 else 0.72 end,
      'reason', case when v_has_actions then 'server_action_priority' else 'context_navigation' end,
      'next_follow_up_at', coalesce(v_payload->>'next_follow_up_at', v_payload#>>'{suggest,next_follow_up_at}'),
      'expires_at', coalesce(v_payload->>'expires_at', v_payload#>>'{suggest,expires_at}')
    ),
    'display', jsonb_build_object(
      'variant', case when v_domain='commerce' then 'journey_card' when v_domain='missions' then 'assistant_card' else 'smart_card' end,
      'compact', false
    )
  );

  v_smart := v_smart || coalesce(v_payload->'smart', '{}'::jsonb);

  return v_payload
    || jsonb_build_object(
      'correlation_id', coalesce(nullif(v_payload->>'correlation_id',''), v_corr),
      'target_route', coalesce(nullif(v_payload->>'target_route',''), v_route),
      'next_best_action', coalesce(nullif(v_payload->>'next_best_action',''), v_next),
      'smart', v_smart
    );
end;
$$;

create or replace function public.waouh_smart_enrich_message_row()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.meta := public.waouh_smart_enrich_payload(
    new.meta,
    coalesce(new.meta->>'intent', new.meta->>'notification_type', 'message'),
    new.thread_id,
    new.id,
    new.text,
    new.article_id
  );
  return new;
end;
$$;

create or replace function public.waouh_smart_enrich_notification_row()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.payload := public.waouh_smart_enrich_payload(
    new.payload,
    coalesce(new.notification_type, new.payload->>'intent', 'notification'),
    new.thread_id,
    new.id,
    new.payload->>'text',
    new.article_id
  );
  return new;
end;
$$;

create or replace function public.waouh_smart_enrich_outbound_row()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.payload := public.waouh_smart_enrich_payload(
    new.payload,
    coalesce(new.event_type, new.template, new.payload->>'intent', 'outbound'),
    nullif(new.payload->>'thread_id','')::uuid,
    new.id,
    new.payload->>'text',
    nullif(new.payload->>'article_id','')::uuid
  );
  return new;
exception when invalid_text_representation then
  new.payload := public.waouh_smart_enrich_payload(
    new.payload,
    coalesce(new.event_type, new.template, new.payload->>'intent', 'outbound'),
    null,
    new.id,
    new.payload->>'text',
    null
  );
  return new;
end;
$$;

drop trigger if exists trg_waouh_smart_messages on public.waouh_messages;
create trigger trg_waouh_smart_messages
before insert on public.waouh_messages
for each row execute function public.waouh_smart_enrich_message_row();

drop trigger if exists trg_waouh_smart_notifications on public.waouh_notifications;
create trigger trg_waouh_smart_notifications
before insert on public.waouh_notifications
for each row execute function public.waouh_smart_enrich_notification_row();

drop trigger if exists trg_waouh_smart_outbound on public.waouh_outbound_queue;
create trigger trg_waouh_smart_outbound
before insert on public.waouh_outbound_queue
for each row execute function public.waouh_smart_enrich_outbound_row();
