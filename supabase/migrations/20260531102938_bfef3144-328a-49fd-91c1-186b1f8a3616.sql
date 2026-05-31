
-- Annuaire des livreurs WAOUH
CREATE TABLE public.waouh_couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  city TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_couriers TO authenticated;
GRANT ALL ON public.waouh_couriers TO service_role;

ALTER TABLE public.waouh_couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage couriers"
ON public.waouh_couriers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_waouh_couriers_updated_at
BEFORE UPDATE ON public.waouh_couriers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extensions de waouh_deals pour le suivi de paiement et l'ETA
ALTER TABLE public.waouh_deals
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eta_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS courier_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_waouh_deals_payment_status ON public.waouh_deals(payment_status);
