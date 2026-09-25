-- WAOUH Deal Graph E2E
-- Non-destructive hardening of reservation, delivery, settlement and commission lifecycle.

ALTER TABLE public.waouh_deals
  ADD COLUMN IF NOT EXISTS seller_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_payment_selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'waouh_delivery',
  ADD COLUMN IF NOT EXISTS commission_rate numeric,
  ADD COLUMN IF NOT EXISTS commission_amount numeric,
  ADD COLUMN IF NOT EXISTS commission_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS settlement_completed_at timestamptz;

ALTER TABLE public.waouh_transactions
  ADD COLUMN IF NOT EXISTS commission_rate numeric,
  ADD COLUMN IF NOT EXISTS commission_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

UPDATE public.waouh_transactions
SET commission_rate = CASE
  WHEN amount IS NOT NULL AND amount > 0 AND commission IS NOT NULL
    THEN commission / amount
  ELSE 0.05
END
WHERE commission_rate IS NULL;

ALTER TABLE public.waouh_transactions
  ALTER COLUMN commission_rate SET DEFAULT 0.05;

UPDATE public.waouh_deals d
SET
  commission_rate = COALESCE(d.commission_rate, t.commission_rate, 0.05),
  commission_amount = COALESCE(d.commission_amount, t.commission, round(d.amount * COALESCE(t.commission_rate, 0.05)))
FROM LATERAL (
  SELECT wt.commission_rate, wt.commission
  FROM public.waouh_transactions wt
  WHERE (d.thread_id IS NOT NULL AND wt.thread_id = d.thread_id)
     OR (wt.article_id = d.article_id AND wt.buyer_id = d.buyer_user_id AND wt.seller_id = d.seller_user_id)
  ORDER BY wt.created_at DESC
  LIMIT 1
) t
WHERE d.commission_rate IS NULL OR d.commission_amount IS NULL;

UPDATE public.waouh_deals
SET
  commission_rate = COALESCE(commission_rate, 0.05),
  commission_amount = COALESCE(commission_amount, round(amount * COALESCE(commission_rate, 0.05)))
WHERE commission_rate IS NULL OR commission_amount IS NULL;

ALTER TABLE public.waouh_deals
  ALTER COLUMN commission_rate SET DEFAULT 0.05;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'waouh_deals_commission_rate_range'
  ) THEN
    ALTER TABLE public.waouh_deals
      ADD CONSTRAINT waouh_deals_commission_rate_range
      CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 1));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'waouh_transactions_commission_rate_range'
  ) THEN
    ALTER TABLE public.waouh_transactions
      ADD CONSTRAINT waouh_transactions_commission_rate_range
      CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 1));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS waouh_deals_article_status_idx
  ON public.waouh_deals(article_id, status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.waouh_guard_new_deal_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_article_status text;
BEGIN
  IF NEW.article_id IS NULL OR NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT status
    INTO v_article_status
    FROM public.waouh_articles
   WHERE id = NEW.article_id
   FOR UPDATE;

  IF v_article_status = 'sold' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'article_sold';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.waouh_deals d
     WHERE d.article_id = NEW.article_id
       AND d.status NOT IN ('cancelled', 'completed')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'article_reserved';
  END IF;

  UPDATE public.waouh_articles
     SET status = 'reserved',
         updated_at = now()
   WHERE id = NEW.article_id
     AND status <> 'sold';

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_waouh_guard_new_deal_reservation ON public.waouh_deals;
CREATE TRIGGER trg_waouh_guard_new_deal_reservation
BEFORE INSERT ON public.waouh_deals
FOR EACH ROW
EXECUTE FUNCTION public.waouh_guard_new_deal_reservation();

CREATE OR REPLACE FUNCTION public.waouh_sync_article_after_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.article_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    UPDATE public.waouh_articles
       SET status = 'sold',
           updated_at = now()
     WHERE id = NEW.article_id;
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.waouh_deals d
       WHERE d.article_id = NEW.article_id
         AND d.id <> NEW.id
         AND d.status NOT IN ('cancelled', 'completed')
    ) THEN
      UPDATE public.waouh_articles
         SET status = 'active',
             updated_at = now()
       WHERE id = NEW.article_id
         AND status = 'reserved';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_waouh_sync_article_after_deal ON public.waouh_deals;
CREATE TRIGGER trg_waouh_sync_article_after_deal
AFTER UPDATE OF status ON public.waouh_deals
FOR EACH ROW
EXECUTE FUNCTION public.waouh_sync_article_after_deal();
