ALTER TABLE public.waouh_radar_signals
  ADD COLUMN IF NOT EXISTS converted_negotiation_id uuid REFERENCES public.waouh_negotiations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_waouh_radar_signals_converted_neg
  ON public.waouh_radar_signals (converted_negotiation_id)
  WHERE converted_negotiation_id IS NOT NULL;