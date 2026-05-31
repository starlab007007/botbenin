
-- Table des "deals" (livraisons médiées) WAOUH
CREATE TABLE public.waouh_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID,
  article_id UUID,
  buyer_user_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  courier_user_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_assignment',
  eta_minutes INTEGER,
  pickup_address TEXT,
  dropoff_address TEXT,
  notes TEXT,
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.waouh_deals TO authenticated;
GRANT ALL ON public.waouh_deals TO service_role;

ALTER TABLE public.waouh_deals ENABLE ROW LEVEL SECURITY;

-- Acheteur ou vendeur peut voir son deal (via auth_user_id lié dans waouh_users)
CREATE POLICY "Buyer or seller can view own deal"
ON public.waouh_deals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.waouh_users u
    WHERE u.id IN (waouh_deals.buyer_user_id, waouh_deals.seller_user_id, COALESCE(waouh_deals.courier_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
      AND u.auth_user_id = auth.uid()
  )
);

-- Admin ops (rôle 'admin') voit tout
CREATE POLICY "Admins can view all deals"
ON public.waouh_deals FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all deals"
ON public.waouh_deals FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_waouh_deals_status ON public.waouh_deals(status);
CREATE INDEX idx_waouh_deals_buyer ON public.waouh_deals(buyer_user_id);
CREATE INDEX idx_waouh_deals_seller ON public.waouh_deals(seller_user_id);
CREATE INDEX idx_waouh_deals_courier ON public.waouh_deals(courier_user_id);

CREATE TRIGGER trg_waouh_deals_updated_at
BEFORE UPDATE ON public.waouh_deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
