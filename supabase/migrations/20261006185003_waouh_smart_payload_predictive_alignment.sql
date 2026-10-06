-- WAOUH Smart Event Envelope — predictive alignment
-- Aligns the DB safety-net with the Edge smart payload contract.
-- Existing producer smart extensions are preserved; canonical routing/action
-- fields are normalized consistently for Web, Flutter and WhatsApp.

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
as $function$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_existing jsonb := case
    when jsonb_typeof(coalesce(p_payload, '{}'::jsonb)->'smart') = 'object'
      then coalesce(p_payload, '{}'::jsonb)->'smart'
    else '{}'::jsonb
  end;
  v_intent text := lower(regexp_replace(coalesce(nullif(trim(p_intent), ''), 'message'), '[-[:space:]]+', '_', 'g'));
  v_domain text := 'chat';
  v_route text := '/app/chat/waouh';
  v_priority text := 'normal';
  v_source_actions jsonb := '[]'::jsonb;
  v_actions jsonb := '[]'::jsonb;
  v_item jsonb;
  v_id text;
  v_label text;
  v_kind text;
  v_item_route text;
  v_idx integer := 0;
  v_has_actions boolean := false;
  v_next text := 'open_context';
  v_preferred text;
  v_corr text;
  v_smart jsonb;
  v_prediction_reason text := 'context_navigation';
  v_prediction_confidence numeric := 0.72;
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

  if v_existing->>'schema' = 'waouh.smart.v1'
     and v_existing->>'domain' in ('chat','commerce','missions','ai','whatsapp','diffusion','partner','stock','profile','notifications') then
    v_domain := v_existing->>'domain';
  end if;

  if coalesce(v_payload->>'target_route','') like '/app/%'
     and coalesce(v_payload->>'target_route','') not like '//%'
     and position(chr(92) in coalesce(v_payload->>'target_route','')) = 0 then
    v_route := v_payload->>'target_route';
  elsif coalesce(v_existing->>'route','') like '/app/%'
     and coalesce(v_existing->>'route','') not like '//%'
     and position(chr(92) in coalesce(v_existing->>'route','')) = 0 then
    v_route := v_existing->>'route';
  else
    v_route := case v_domain
      when 'commerce' then '/app/chat/waouh'
      when 'chat' then '/app/chat/waouh'
      when 'missions' then '/app/missions'
      when 'ai' then '/app/ia'
      when 'whatsapp' then '/app/whatsapp'
      when 'diffusion' then '/app/diffusion'
      when 'partner' then '/app/partner'
      when 'stock' then '/app/stock'
      when 'profile' then '/app/profile'
      when 'notifications' then '/app/notifications'
      else '/app/chat/waouh'
    end;
  end if;

  if v_intent ~ '(payment_request|confirm_payment|security|blocked|failed|urgent)' then
    v_priority := 'urgent';
  elsif v_intent ~ '(new_buyer|offer_received|approval|low_stock|out_of_stock|deal_created|deal_accepted|delivery)' then
    v_priority := 'high';
  elsif v_intent ~ '(ack|completed|paid|closed|dismiss)' then
    v_priority := 'low';
  end if;

  if jsonb_typeof(v_existing->'actions') = 'array'
     and jsonb_array_length(v_existing->'actions') > 0 then
    v_source_actions := v_existing->'actions';
  elsif jsonb_typeof(v_payload->'actions') = 'array'
     and jsonb_array_length(v_payload->'actions') > 0 then
    v_source_actions := v_payload->'actions';
  end if;

  for v_item in select value from jsonb_array_elements(v_source_actions)
  loop
    exit when v_idx >= 5;
    if jsonb_typeof(v_item) <> 'object' then continue; end if;
    v_id := left(trim(coalesce(v_item->>'id', v_item->>'action', v_item->>'key', '')), 120);
    v_label := left(trim(coalesce(v_item->>'label', v_item->>'title', v_item->>'text', '')), 60);
    if v_id = '' or v_label = '' then continue; end if;

    v_kind := nullif(lower(trim(coalesce(v_item->>'kind',''))), '');
    if v_kind not in ('navigate','reply','commerce','approve','contact','retry','dismiss') then
      v_kind := case
        when lower(v_id) ~ '(accept|accepter|reject|refuser|offer|offre|pay|paiement|confirm|annuler|cancel|je-veux|open_deal|transmit)' then 'commerce'
        when lower(v_id) ~ '(approve|valider)' then 'approve'
        when lower(v_id) ~ '(contact|whatsapp|call|appel)' then 'contact'
        when lower(v_id) ~ '(retry|reessayer|réessayer)' then 'retry'
        when lower(v_id) ~ '(reply|repondre|répondre|question)' then 'reply'
        when lower(v_id) ~ '(dismiss|fermer|ignorer)' then 'dismiss'
        else 'navigate'
      end;
    end if;

    v_item_route := coalesce(v_item->>'route', v_item->>'url', '');
    if v_item_route not like '/app/%'
       or v_item_route like '//%'
       or position(chr(92) in v_item_route) > 0 then
      v_item_route := v_route;
    end if;

    v_idx := v_idx + 1;
    v_actions := v_actions || jsonb_build_array(
      v_item || jsonb_build_object(
        'id', v_id,
        'label', v_label,
        'kind', v_kind,
        'route', v_item_route,
        'priority', coalesce(nullif(v_item->>'priority','')::integer, v_idx),
        'requires_auth', true,
        'requires_confirmation',
          coalesce((v_item->>'requires_confirmation')::boolean, false)
          or lower(v_id) ~ '(accept|accepter|pay|payer|paiement|confirm_payment|annuler|cancel|refuser|reject)'
      )
    );
  end loop;

  v_has_actions := jsonb_array_length(v_actions) > 0;
  if not v_has_actions then
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
      'requires_auth', true,
      'requires_confirmation', false
    ));
  end if;

  v_preferred := nullif(trim(coalesce(
    v_payload->>'next_best_action',
    v_payload#>>'{suggest,best_action}',
    v_existing->>'next_best_action',
    ''
  )), '');

  if v_preferred is not null and exists (
    select 1
    from jsonb_array_elements(v_actions) a
    where a->>'id' = v_preferred
  ) then
    v_next := v_preferred;
    v_prediction_reason := 'workflow_prediction';
    v_prediction_confidence := 0.99;
  else
    v_next := coalesce(v_actions->0->>'id', 'open_context');
    if v_has_actions then
      v_prediction_reason := 'server_action_priority';
      v_prediction_confidence := 0.96;
    end if;
  end if;

  v_corr := coalesce(
    nullif(v_payload->>'correlation_id',''),
    nullif(v_existing->>'correlation_id',''),
    nullif(v_payload->>'trace_id',''),
    case when p_event_id is not null then 'evt:' || p_event_id::text else null end
  );

  v_smart := v_existing || jsonb_build_object(
    'schema', 'waouh.smart.v1',
    'domain', v_domain,
    'intent', v_intent,
    'priority', v_priority,
    'title', nullif(coalesce(v_payload->>'title', v_existing->>'title'),''),
    'detail', nullif(coalesce(v_payload->>'detail', v_existing->>'detail'),''),
    'text', nullif(coalesce(p_text, v_payload->>'text', v_existing->>'text'),''),
    'stage', nullif(coalesce(v_payload->>'stage', v_payload->>'workflow_state', v_existing->>'stage'),''),
    'route', v_route,
    'thread_id', coalesce(p_thread_id::text, nullif(v_payload->>'thread_id',''), nullif(v_existing->>'thread_id','')),
    'correlation_id', v_corr,
    'entities', coalesce(v_existing->'entities','{}'::jsonb) || jsonb_build_object(
      'article_id', coalesce(p_article_id::text, nullif(v_payload->>'article_id',''), v_existing#>>'{entities,article_id}'),
      'negotiation_id', coalesce(nullif(v_payload->>'negotiation_id',''), v_existing#>>'{entities,negotiation_id}'),
      'deal_id', coalesce(nullif(v_payload->>'deal_id',''), v_existing#>>'{entities,deal_id}'),
      'transaction_id', coalesce(nullif(v_payload->>'transaction_id',''), v_existing#>>'{entities,transaction_id}'),
      'mission_id', coalesce(nullif(v_payload->>'mission_id',''), v_existing#>>'{entities,mission_id}'),
      'partner_id', coalesce(nullif(v_payload->>'partner_id',''), v_existing#>>'{entities,partner_id}'),
      'stock_item_id', coalesce(nullif(v_payload->>'stock_item_id',''), v_existing#>>'{entities,stock_item_id}')
    ),
    'recipient_role', nullif(coalesce(v_payload->>'recipient', v_payload->>'role', v_existing->>'recipient_role'),''),
    'actions', v_actions,
    'next_best_action', v_next,
    'prediction', coalesce(v_existing->'prediction','{}'::jsonb) || jsonb_build_object(
      'confidence', v_prediction_confidence,
      'reason', v_prediction_reason,
      'next_follow_up_at', coalesce(v_payload->>'next_follow_up_at', v_payload#>>'{suggest,next_follow_up_at}', v_existing#>>'{prediction,next_follow_up_at}'),
      'expires_at', coalesce(v_payload->>'expires_at', v_payload#>>'{suggest,expires_at}', v_existing#>>'{prediction,expires_at}')
    ),
    'display', coalesce(v_existing->'display','{}'::jsonb) || jsonb_build_object(
      'variant', case when v_domain='commerce' then 'journey_card' when v_domain='missions' then 'assistant_card' else 'smart_card' end,
      'compact', false
    )
  );

  return v_payload || jsonb_build_object(
    'correlation_id', coalesce(nullif(v_payload->>'correlation_id',''), v_corr),
    'target_route', coalesce(nullif(v_payload->>'target_route',''), v_route),
    'next_best_action', v_next,
    'smart', v_smart
  );
end;
$function$;
