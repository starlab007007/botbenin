-- WAOUH Chat Meet V18
-- Isolation stricte d'une discussion par produit, acheteur, vendeur et cycle.
-- La conversation générale WAOUH reste inchangée.

CREATE TABLE IF NOT EXISTS public.waouh_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_key TEXT NOT NULL UNIQUE,
  active_key TEXT UNIQUE,
  thread_type TEXT NOT NULL DEFAULT 'product_meet'
    CHECK (thread_type IN ('product_meet', 'search')),
  article_id UUID REFERENCES public.waouh_articles(id) ON DELETE SET NULL,
  buyer_user_id UUID REFERENCES public.waouh_users(id) ON DELETE SET NULL,
  seller_user_id UUID REFERENCES public.waouh_users(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES public.waouh_users(id) ON DELETE SET NULL,
  search_request_id UUID,
  cycle_id UUID NOT NULL DEFAULT gen_random_uuid(),
  negotiation_id UUID,
  deal_id UUID,
  transaction_id UUID,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'negotiating', 'accepted', 'paid', 'concluded', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  CHECK (
    (thread_type = 'search' AND owner_user_id IS NOT NULL AND search_request_id IS NOT NULL)
    OR
    (thread_type = 'product_meet' AND article_id IS NOT NULL AND buyer_user_id IS NOT NULL AND seller_user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS waouh_chat_threads_article_idx
  ON public.waouh_chat_threads(article_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_chat_threads_buyer_idx
  ON public.waouh_chat_threads(buyer_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_chat_threads_seller_idx
  ON public.waouh_chat_threads(seller_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_chat_threads_owner_idx
  ON public.waouh_chat_threads(owner_user_id, updated_at DESC);

ALTER TABLE IF EXISTS public.waouh_messages
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.waouh_notifications
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.waouh_negotiations
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.waouh_deals
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.waouh_transactions
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.waouh_interests
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.waouh_radar_matches
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.waouh_radar_signals
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS waouh_messages_thread_created_idx
  ON public.waouh_messages(thread_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS waouh_messages_idempotency_uidx
  ON public.waouh_messages ((meta->>'idempotency_key'))
  WHERE COALESCE(meta->>'idempotency_key', '') <> '';
CREATE INDEX IF NOT EXISTS waouh_notifications_thread_sent_idx
  ON public.waouh_notifications(thread_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS waouh_negotiations_thread_idx
  ON public.waouh_negotiations(thread_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_deals_thread_idx
  ON public.waouh_deals(thread_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_transactions_thread_idx
  ON public.waouh_transactions(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_interests_thread_idx
  ON public.waouh_interests(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_radar_matches_thread_idx
  ON public.waouh_radar_matches(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_radar_signals_thread_idx
  ON public.waouh_radar_signals(thread_id, captured_at DESC);

-- Reconstitution non destructive des discussions commerciales déjà présentes.
WITH ranked_negotiations AS (
  SELECT n.*,
         row_number() OVER (
           PARTITION BY n.article_id, n.buyer_user_id, n.seller_user_id
           ORDER BY n.updated_at DESC NULLS LAST, n.id DESC
         ) AS relation_rank
    FROM public.waouh_negotiations n
   WHERE n.article_id IS NOT NULL
     AND n.buyer_user_id IS NOT NULL
     AND n.seller_user_id IS NOT NULL
)
INSERT INTO public.waouh_chat_threads (
  thread_key,
  active_key,
  thread_type,
  article_id,
  buyer_user_id,
  seller_user_id,
  cycle_id,
  negotiation_id,
  source,
  status,
  created_at,
  updated_at,
  closed_at
)
SELECT
  'legacy:negotiation:' || n.id::text,
  CASE
    WHEN n.relation_rank = 1 AND n.state IN ('proposed', 'countered', 'accepted')
      THEN 'product:' || n.article_id::text || ':buyer:' || n.buyer_user_id::text || ':seller:' || n.seller_user_id::text
    ELSE NULL
  END,
  'product_meet',
  n.article_id,
  n.buyer_user_id,
  n.seller_user_id,
  n.id,
  n.id,
  COALESCE(n.meta->>'source', 'legacy'),
  CASE
    WHEN n.state IN ('proposed', 'countered') THEN 'negotiating'
    WHEN n.state = 'accepted' THEN 'accepted'
    ELSE 'cancelled'
  END,
  COALESCE(n.created_at, now()),
  COALESCE(n.updated_at, n.created_at, now()),
  CASE WHEN n.state IN ('proposed', 'countered', 'accepted') THEN NULL ELSE COALESCE(n.closed_at, n.updated_at, now()) END
FROM ranked_negotiations n
ON CONFLICT DO NOTHING;

UPDATE public.waouh_negotiations n
   SET thread_id = t.id
  FROM public.waouh_chat_threads t
 WHERE n.thread_id IS NULL
   AND t.thread_key = 'legacy:negotiation:' || n.id::text;

UPDATE public.waouh_deals d
   SET thread_id = n.thread_id
  FROM public.waouh_negotiations n
 WHERE d.thread_id IS NULL
   AND d.negotiation_id = n.id
   AND n.thread_id IS NOT NULL;

UPDATE public.waouh_chat_threads t
   SET deal_id = d.id,
       status = CASE
         WHEN d.status = 'completed' THEN 'concluded'
         WHEN d.status = 'cancelled' THEN 'cancelled'
         WHEN d.status = 'paid' THEN 'paid'
         ELSE t.status
       END,
       active_key = CASE WHEN d.status IN ('completed', 'cancelled') THEN NULL ELSE t.active_key END,
       closed_at = CASE WHEN d.status IN ('completed', 'cancelled') THEN COALESCE(t.closed_at, now()) ELSE t.closed_at END
  FROM public.waouh_deals d
 WHERE d.thread_id = t.id;

-- Une transaction historique ne reçoit un fil que si le triplet
-- article/acheteur/vendeur ne correspond qu'à un seul fil. En présence de
-- plusieurs cycles, elle reste volontairement non affectée plutôt que d'être
-- mélangée avec une autre négociation.
WITH unique_deal_threads AS (
  SELECT d.article_id,
         d.buyer_user_id,
         d.seller_user_id,
         min(d.thread_id::text)::uuid AS thread_id
    FROM public.waouh_deals d
   WHERE d.thread_id IS NOT NULL
   GROUP BY d.article_id, d.buyer_user_id, d.seller_user_id
  HAVING count(DISTINCT d.thread_id) = 1
)
UPDATE public.waouh_transactions tx
   SET thread_id = d.thread_id
  FROM unique_deal_threads d
 WHERE tx.thread_id IS NULL
   AND tx.article_id = d.article_id
   AND tx.buyer_id = d.buyer_user_id
   AND tx.seller_id = d.seller_user_id;

WITH ranked_transactions AS (
  SELECT tx.id,
         tx.thread_id,
         row_number() OVER (
           PARTITION BY tx.thread_id
           ORDER BY tx.created_at DESC NULLS LAST, tx.id DESC
         ) AS transaction_rank
    FROM public.waouh_transactions tx
   WHERE tx.thread_id IS NOT NULL
)
UPDATE public.waouh_chat_threads t
   SET transaction_id = tx.id
  FROM ranked_transactions tx
 WHERE tx.thread_id = t.id
   AND tx.transaction_rank = 1
   AND t.transaction_id IS NULL;

UPDATE public.waouh_notifications n
   SET thread_id = t.id
  FROM public.waouh_chat_threads t
 WHERE n.thread_id IS NULL
   AND (
     n.payload->>'thread_id' = t.id::text
     OR n.payload->>'negotiation_id' = t.negotiation_id::text
     OR n.payload->>'neg_id' = t.negotiation_id::text
     OR n.payload->>'deal_id' = t.deal_id::text
   );

UPDATE public.waouh_messages m
   SET thread_id = t.id
  FROM public.waouh_chat_threads t
 WHERE m.thread_id IS NULL
   AND (
     m.meta->>'thread_id' = t.id::text
     OR m.meta->>'negotiation_id' = t.negotiation_id::text
     OR m.meta->>'neg_id' = t.negotiation_id::text
     OR m.meta->>'deal_id' = t.deal_id::text
   );

UPDATE public.waouh_messages
   SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('thread_id', thread_id)
 WHERE thread_id IS NOT NULL
   AND COALESCE(meta->>'thread_id', '') = '';

UPDATE public.waouh_notifications
   SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('thread_id', thread_id)
 WHERE thread_id IS NOT NULL
   AND COALESCE(payload->>'thread_id', '') = '';

CREATE OR REPLACE FUNCTION public.waouh_touch_chat_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE public.waouh_chat_threads
       SET last_message_at = NEW.created_at,
           updated_at = now()
     WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waouh_touch_chat_thread ON public.waouh_messages;
CREATE TRIGGER trg_waouh_touch_chat_thread
AFTER INSERT ON public.waouh_messages
FOR EACH ROW EXECUTE FUNCTION public.waouh_touch_chat_thread();

CREATE OR REPLACE FUNCTION public.waouh_close_chat_thread_if_final()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL AND NEW.status IN ('completed', 'cancelled') THEN
    UPDATE public.waouh_chat_threads
       SET status = CASE WHEN NEW.status = 'completed' THEN 'concluded' ELSE 'cancelled' END,
           active_key = NULL,
           closed_at = COALESCE(closed_at, now()),
           updated_at = now(),
           deal_id = NEW.id
     WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waouh_close_chat_thread_if_final ON public.waouh_deals;
CREATE TRIGGER trg_waouh_close_chat_thread_if_final
AFTER INSERT OR UPDATE OF status ON public.waouh_deals
FOR EACH ROW EXECUTE FUNCTION public.waouh_close_chat_thread_if_final();

ALTER TABLE public.waouh_chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat thread participants read" ON public.waouh_chat_threads;
CREATE POLICY "chat thread participants read"
ON public.waouh_chat_threads FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
      FROM public.waouh_users u
     WHERE u.auth_user_id = auth.uid()
       AND u.id IN (
         COALESCE(buyer_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
         COALESCE(seller_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
         COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
       )
  )
);

GRANT SELECT ON public.waouh_chat_threads TO authenticated;
GRANT ALL ON public.waouh_chat_threads TO service_role;

COMMENT ON TABLE public.waouh_chat_threads IS
  'WAOUH Chat Meet: une discussion isolée par recherche ou par produit+acheteur+vendeur+cycle.';
