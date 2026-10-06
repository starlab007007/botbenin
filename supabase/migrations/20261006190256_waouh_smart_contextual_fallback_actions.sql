-- WAOUH Smart Event Envelope — contextual fallback actions.
-- Verified production definitions after migration 20261006190256.
-- Explicit producer actions remain authoritative; legacy open_context events
-- receive safe domain-aware actions.

CREATE OR REPLACE FUNCTION public.waouh_smart_contextualize_payload(p_payload jsonb, p_intent text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_smart jsonb := case
    when jsonb_typeof(coalesce(p_payload, '{}'::jsonb)->'smart')='object'
      then coalesce(p_payload, '{}'::jsonb)->'smart'
    else '{}'::jsonb
  end;
  v_actions jsonb := case
    when jsonb_typeof(v_smart->'actions')='array' then v_smart->'actions'
    else '[]'::jsonb
  end;
  v_intent text := lower(regexp_replace(coalesce(nullif(trim(p_intent),''), v_smart->>'intent', 'message'), '[-[:space:]]+', '_', 'g'));
  v_domain text := coalesce(nullif(v_smart->>'domain',''),'chat');
  v_route text := coalesce(nullif(v_smart->>'route',''), nullif(v_payload->>'target_route',''), '/app/chat/waouh');
  v_neg text := coalesce(nullif(v_payload->>'negotiation_id',''), nullif(v_smart#>>'{entities,negotiation_id}',''));
  v_deal text := coalesce(nullif(v_payload->>'deal_id',''), nullif(v_smart#>>'{entities,deal_id}',''));
  v_role text := lower(coalesce(nullif(v_payload->>'recipient',''), nullif(v_payload->>'role',''), nullif(v_smart->>'recipient_role',''), ''));
  v_method text := lower(coalesce(nullif(v_payload->>'payment_method',''), nullif(v_payload->>'method',''), ''));
  v_new_actions jsonb := '[]'::jsonb;
  v_label text;
begin
  -- Explicit, multi-action or producer-authored payloads are authoritative.
  if jsonb_array_length(v_actions) <> 1
     or coalesce(v_actions->0->>'id','') <> 'open_context' then
    return v_payload;
  end if;

  if v_domain='commerce'
     and v_neg is not null
     and v_intent ~ '(new_buyer|offer_received|negotiation_open|negotiation_counter|counter)' then
    v_new_actions := jsonb_build_array(
      jsonb_build_object('id','open_context','label','Répondre à l''offre','kind','navigate','route',v_route,'priority',1,'requires_auth',true,'requires_confirmation',false,'payload',jsonb_build_object('route',v_route)),
      jsonb_build_object('id','accepter:'||v_neg,'label','Accepter','kind','commerce','route',v_route,'priority',2,'requires_auth',true,'requires_confirmation',true,'payload',jsonb_build_object('action_id','accepter:'||v_neg)),
      jsonb_build_object('id','contre-proposition:'||v_neg,'label','Contre-proposer','kind','commerce','route',v_route,'priority',3,'requires_auth',true,'requires_confirmation',false,'payload',jsonb_build_object('action_id','contre-proposition:'||v_neg)),
      jsonb_build_object('id','refuser:'||v_neg,'label','Refuser','kind','commerce','route',v_route,'priority',4,'requires_auth',true,'requires_confirmation',true,'payload',jsonb_build_object('action_id','refuser:'||v_neg))
    );
  elsif v_domain='commerce'
     and v_deal is not null
     and v_intent ~ '(deal_accepted|payment_preference_required|pay_mode|payment_request)' then
    if v_role='seller' then
      v_new_actions := jsonb_build_array(
        jsonb_build_object('id','open_context','label','Continuer le deal','kind','navigate','route',v_route,'priority',1,'requires_auth',true,'requires_confirmation',false,'payload',jsonb_build_object('route',v_route)),
        jsonb_build_object('id','confirmer-disponibilite:'||v_deal,'label','Confirmer la disponibilité','kind','commerce','route',v_route,'priority',2,'requires_auth',true,'requires_confirmation',true,'payload',jsonb_build_object('action_id','confirmer-disponibilite:'||v_deal))
      );
    else
      v_new_actions := jsonb_build_array(
        jsonb_build_object('id','open_context','label','Continuer le deal','kind','navigate','route',v_route,'priority',1,'requires_auth',true,'requires_confirmation',false,'payload',jsonb_build_object('route',v_route)),
        jsonb_build_object('id','payer-mobile:'||v_deal,'label','Mobile Money','kind','commerce','route',v_route,'priority',2,'requires_auth',true,'requires_confirmation',true,'payload',jsonb_build_object('action_id','payer-mobile:'||v_deal)),
        jsonb_build_object('id','paiement-livraison:'||v_deal,'label','Paiement à la livraison','kind','commerce','route',v_route,'priority',3,'requires_auth',true,'requires_confirmation',true,'payload',jsonb_build_object('action_id','paiement-livraison:'||v_deal))
      );
    end if;
  elsif v_domain='commerce'
     and v_deal is not null
     and v_intent ~ '(delivered|payment_confirm)' then
    v_new_actions := jsonb_build_array(
      jsonb_build_object('id','open_context','label','Finaliser le deal','kind','navigate','route',v_route,'priority',1,'requires_auth',true,'requires_confirmation',false,'payload',jsonb_build_object('route',v_route)),
      jsonb_build_object(
        'id','confirmer-paiement-' || case when v_method like '%mobile%' then 'mobile' else 'cash' end || ':' || v_deal,
        'label','Confirmer le paiement','kind','commerce','route',v_route,'priority',2,
        'requires_auth',true,'requires_confirmation',true,
        'payload',jsonb_build_object('action_id','confirmer-paiement-' || case when v_method like '%mobile%' then 'mobile' else 'cash' end || ':' || v_deal)
      )
    );
  else
    v_label := case v_domain
      when 'whatsapp' then 'Répondre sur WhatsApp'
      when 'diffusion' then 'Suivre la diffusion'
      when 'partner' then 'Gérer l''espace partenaire'
      when 'stock' then case when v_intent ~ '(low_stock|out_of_stock|reorder)' then 'Réapprovisionner' else 'Voir le stock' end
      when 'missions' then 'Continuer la mission'
      when 'ai' then 'Continuer avec mon IA'
      when 'profile' then 'Vérifier mon profil'
      when 'notifications' then 'Voir le détail'
      when 'commerce' then 'Ouvrir la discussion'
      else 'Ouvrir'
    end;
    v_new_actions := jsonb_build_array(
      jsonb_build_object(
        'id','open_context','label',v_label,'kind','navigate','route',v_route,
        'priority',1,'requires_auth',true,'requires_confirmation',false,
        'payload',jsonb_build_object('route',v_route)
      )
    );
  end if;

  v_smart := v_smart || jsonb_build_object(
    'actions', v_new_actions,
    'next_best_action', 'open_context',
    'prediction',
      coalesce(v_smart->'prediction','{}'::jsonb) ||
      jsonb_build_object(
        'confidence', case when jsonb_array_length(v_new_actions)>1 then 0.88 else 0.72 end,
        'reason', case when jsonb_array_length(v_new_actions)>1 then 'workflow_context' else 'context_navigation' end
      )
  );

  return v_payload || jsonb_build_object(
    'smart', v_smart,
    'next_best_action', 'open_context'
  );
end;
$

CREATE OR REPLACE FUNCTION public.waouh_smart_enrich_message_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $
begin
  new.meta := public.waouh_smart_contextualize_payload(
    public.waouh_smart_enrich_payload(
      new.meta,
      coalesce(new.meta->>'intent', new.meta->>'notification_type', 'message'),
      new.thread_id,
      new.id,
      new.text,
      new.article_id
    ),
    coalesce(new.meta->>'intent', new.meta->>'notification_type', 'message')
  );
  return new;
end;
$

CREATE OR REPLACE FUNCTION public.waouh_smart_enrich_notification_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $
begin
  new.payload := public.waouh_smart_contextualize_payload(
    public.waouh_smart_enrich_payload(
      new.payload,
      coalesce(new.notification_type, new.payload->>'intent', 'notification'),
      new.thread_id,
      new.id,
      new.payload->>'text',
      new.article_id
    ),
    coalesce(new.notification_type, new.payload->>'intent', 'notification')
  );
  return new;
end;
$

CREATE OR REPLACE FUNCTION public.waouh_smart_enrich_outbound_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $
begin
  new.payload := public.waouh_smart_contextualize_payload(
    public.waouh_smart_enrich_payload(
      new.payload,
      coalesce(new.event_type, new.template, new.payload->>'intent', 'outbound'),
      nullif(new.payload->>'thread_id','')::uuid,
      new.id,
      new.payload->>'text',
      nullif(new.payload->>'article_id','')::uuid
    ),
    coalesce(new.event_type, new.template, new.payload->>'intent', 'outbound')
  );
  return new;
exception when invalid_text_representation then
  new.payload := public.waouh_smart_contextualize_payload(
    public.waouh_smart_enrich_payload(
      new.payload,
      coalesce(new.event_type, new.template, new.payload->>'intent', 'outbound'),
      null,
      new.id,
      new.payload->>'text',
      null
    ),
    coalesce(new.event_type, new.template, new.payload->>'intent', 'outbound')
  );
  return new;
end;
$
