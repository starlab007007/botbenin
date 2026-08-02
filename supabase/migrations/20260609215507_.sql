CREATE UNIQUE INDEX IF NOT EXISTS waouh_deals_unique_per_negotiation
  ON public.waouh_deals (negotiation_id)
  WHERE status <> 'cancelled';;
