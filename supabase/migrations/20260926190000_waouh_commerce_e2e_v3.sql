-- WAOUH Commerce E2E V3 — atomic negotiation -> deal graph, event ledger and safe link repair.
-- Non-destructive. Existing historical rows are kept; exact canonical links are backfilled when unambiguous.

CREATE TABLE IF NOT EXISTS public.waouh_commerce_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  thread_id uuid,
  article_id uuid,
  negotiation_id uuid,
  deal_id uuid,
  transaction_id uuid,
  actor_user_id uuid,
  actor_role text,
  previous_state text,
  next_state text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waouh_commerce_events_neg_idx
  ON public.waouh_commerce_events(negotiation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_commerce_events_deal_idx
  ON public.waouh_commerce_events(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_commerce_events_thread_idx
  ON public.waouh_commerce_events(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_commerce_events_corr_idx
  ON public.waouh_commerce_events(correlation_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.waouh_record_commerce_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_thread_id uuid DEFAULT NULL,
  p_article_id uuid DEFAULT NULL,
  p_negotiation_id uuid DEFAULT NULL,
  p_deal_id uuid DEFAULT NULL,
  p_transaction_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_previous_state text DEFAULT NULL,
  p_next_state text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.waouh_commerce_events(
    correlation_id,event_type,entity_type,entity_id,thread_id,article_id,
    negotiation_id,deal_id,transaction_id,actor_user_id,actor_role,
    previous_state,next_state,payload
  ) VALUES (
    p_correlation_id,p_event_type,p_entity_type,p_entity_id,p_thread_id,p_article_id,
    p_negotiation_id,p_deal_id,p_transaction_id,p_actor_user_id,p_actor_role,
    p_previous_state,p_next_state,COALESCE(p_payload,'{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.waouh_accept_negotiation_atomic(
  p_negotiation_id uuid,
  p_thread_id uuid,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_commission_rate numeric DEFAULT 0.05,
  p_correlation_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_neg public.waouh_negotiations%ROWTYPE;
  v_thread public.waouh_chat_threads%ROWTYPE;
  v_article public.waouh_articles%ROWTYPE;
  v_deal public.waouh_deals%ROWTYPE;
  v_tx public.waouh_transactions%ROWTYPE;
  v_amount numeric;
  v_rate numeric;
  v_now timestamptz := now();
BEGIN
  IF p_negotiation_id IS NULL OR p_thread_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_and_thread_required';
  END IF;

  SELECT * INTO v_neg
  FROM public.waouh_negotiations
  WHERE id = p_negotiation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_not_found';
  END IF;

  SELECT * INTO v_thread
  FROM public.waouh_chat_threads
  WHERE id = p_thread_id
    AND thread_type = 'product_meet'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='thread_not_found';
  END IF;

  IF v_thread.article_id IS DISTINCT FROM v_neg.article_id
     OR v_thread.buyer_user_id IS DISTINCT FROM v_neg.buyer_user_id
     OR v_thread.seller_user_id IS DISTINCT FROM v_neg.seller_user_id THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_thread_mismatch';
  END IF;

  IF v_neg.buyer_user_id IS NULL OR v_neg.seller_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_participants_required';
  END IF;

  IF v_neg.state NOT IN ('proposed','countered','accepted') THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='negotiation_not_acceptible';
  END IF;

  SELECT * INTO v_article
  FROM public.waouh_articles
  WHERE id = v_neg.article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='article_not_found';
  END IF;

  SELECT * INTO v_deal
  FROM public.waouh_deals
  WHERE negotiation_id = v_neg.id
    AND status <> 'cancelled'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_deal.id IS NOT NULL THEN
    SELECT * INTO v_tx
    FROM public.waouh_transactions
    WHERE (v_deal.thread_id IS NOT NULL AND thread_id = v_deal.thread_id)
       OR (article_id = v_deal.article_id AND buyer_id = v_deal.buyer_user_id AND seller_id = v_deal.seller_user_id)
    ORDER BY created_at DESC
    LIMIT 1;

    UPDATE public.waouh_negotiations
      SET state='accepted',
          thread_id=COALESCE(thread_id,p_thread_id),
          transaction_id=COALESCE(transaction_id,v_tx.id),
          closed_at=COALESCE(closed_at,v_now),
          last_actor=COALESCE(p_actor_role,last_actor),
          updated_at=v_now
    WHERE id=v_neg.id;

    UPDATE public.waouh_chat_threads
      SET negotiation_id=v_neg.id,
          deal_id=v_deal.id,
          transaction_id=COALESCE(v_tx.id,transaction_id),
          status='accepted',
          updated_at=v_now
    WHERE id=p_thread_id;

    RETURN jsonb_build_object(
      'ok',true,'idempotent',true,'negotiation_id',v_neg.id,'deal_id',v_deal.id,
      'transaction_id',v_tx.id,'thread_id',p_thread_id,'article_id',v_neg.article_id,
      'amount',v_deal.amount,'workflow_state',v_deal.status
    );
  END IF;

  IF v_article.status = 'sold' THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='article_sold';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.waouh_deals d
    WHERE d.article_id = v_neg.article_id
      AND d.status NOT IN ('cancelled','completed')
  ) THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='article_reserved';
  END IF;

  v_amount := COALESCE(v_neg.last_offer_price, v_article.price, 0);
  v_rate := GREATEST(0, LEAST(1, COALESCE(p_commission_rate,0.05)));

  INSERT INTO public.waouh_deals(
    thread_id,negotiation_id,article_id,buyer_user_id,seller_user_id,
    amount,status,commission_rate,commission_amount,commission_status,
    pickup_address,dropoff_address
  ) VALUES (
    p_thread_id,v_neg.id,v_neg.article_id,v_neg.buyer_user_id,v_neg.seller_user_id,
    v_amount,'awaiting_confirmation',v_rate,round(v_amount*v_rate),'pending',
    NULL,NULL
  )
  RETURNING * INTO v_deal;

  SELECT * INTO v_tx
  FROM public.waouh_transactions
  WHERE thread_id = p_thread_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_tx.id IS NULL THEN
    INSERT INTO public.waouh_transactions(
      thread_id,article_id,seller_id,buyer_id,amount,currency,commission,
      payment_method,escrow_status,negotiated_price,status,
      commission_rate,commission_status
    ) VALUES (
      p_thread_id,v_neg.article_id,v_neg.seller_user_id,v_neg.buyer_user_id,
      v_amount,'XOF',round(v_amount*v_rate),'pending','pending',v_amount,'initiated',
      v_rate,'pending'
    )
    RETURNING * INTO v_tx;
  END IF;

  UPDATE public.waouh_negotiations
    SET state='accepted',
        thread_id=p_thread_id,
        transaction_id=v_tx.id,
        last_actor=COALESCE(p_actor_role,last_actor),
        closed_at=v_now,
        updated_at=v_now
  WHERE id=v_neg.id;

  UPDATE public.waouh_articles
    SET status='reserved',updated_at=v_now
  WHERE id=v_neg.article_id
    AND status <> 'sold';

  UPDATE public.waouh_chat_threads
    SET negotiation_id=v_neg.id,
        deal_id=v_deal.id,
        transaction_id=v_tx.id,
        status='accepted',
        updated_at=v_now
  WHERE id=p_thread_id;

  PERFORM public.waouh_record_commerce_event(
    'negotiation_accepted','negotiation',v_neg.id,p_thread_id,v_neg.article_id,
    v_neg.id,v_deal.id,v_tx.id,p_actor_user_id,p_actor_role,v_neg.state,'accepted',
    p_correlation_id,
    jsonb_build_object('amount',v_amount,'commission_rate',v_rate)
  );

  PERFORM public.waouh_record_commerce_event(
    'deal_created','deal',v_deal.id,p_thread_id,v_neg.article_id,
    v_neg.id,v_deal.id,v_tx.id,p_actor_user_id,p_actor_role,NULL,'awaiting_confirmation',
    p_correlation_id,
    jsonb_build_object('amount',v_amount)
  );

  RETURN jsonb_build_object(
    'ok',true,'idempotent',false,'negotiation_id',v_neg.id,'deal_id',v_deal.id,
    'transaction_id',v_tx.id,'thread_id',p_thread_id,'article_id',v_neg.article_id,
    'amount',v_amount,'workflow_state','awaiting_confirmation'
  );
END;
$$;

-- Safe canonical backfill: only attach a negotiation to a product_meet thread when
-- the exact article + buyer + seller relation resolves to exactly one active thread.
WITH candidates AS (
  SELECT n.id AS negotiation_id, min(t.id) AS thread_id
  FROM public.waouh_negotiations n
  JOIN public.waouh_chat_threads t
    ON t.thread_type='product_meet'
   AND t.article_id=n.article_id
   AND t.buyer_user_id=n.buyer_user_id
   AND t.seller_user_id=n.seller_user_id
   AND t.status NOT IN ('cancelled','concluded')
  WHERE n.thread_id IS NULL
    AND n.buyer_user_id IS NOT NULL
    AND n.seller_user_id IS NOT NULL
  GROUP BY n.id
  HAVING count(*) = 1
)
UPDATE public.waouh_negotiations n
SET thread_id=c.thread_id, updated_at=now()
FROM candidates c
WHERE n.id=c.negotiation_id
  AND n.thread_id IS NULL;

-- Mirror unambiguous links into the authoritative Chat Meet.
UPDATE public.waouh_chat_threads t
SET negotiation_id=n.id, updated_at=now()
FROM public.waouh_negotiations n
WHERE n.thread_id=t.id
  AND t.thread_type='product_meet'
  AND t.negotiation_id IS NULL;

-- Backfill a deal thread from its negotiation where safe.
UPDATE public.waouh_deals d
SET thread_id=n.thread_id, updated_at=now()
FROM public.waouh_negotiations n
WHERE d.negotiation_id=n.id
  AND d.thread_id IS NULL
  AND n.thread_id IS NOT NULL;

-- Mirror existing deal/transaction ids onto their canonical thread.
UPDATE public.waouh_chat_threads t
SET deal_id=d.id, updated_at=now()
FROM public.waouh_deals d
WHERE d.thread_id=t.id
  AND t.deal_id IS NULL
  AND d.status <> 'cancelled';

UPDATE public.waouh_chat_threads t
SET transaction_id=x.id, updated_at=now()
FROM LATERAL (
  SELECT wt.id
  FROM public.waouh_transactions wt
  WHERE wt.thread_id=t.id
  ORDER BY wt.created_at DESC
  LIMIT 1
) x
WHERE t.thread_type='product_meet'
  AND t.transaction_id IS NULL;
