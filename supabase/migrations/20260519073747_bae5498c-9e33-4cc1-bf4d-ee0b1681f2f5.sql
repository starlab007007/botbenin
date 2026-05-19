CREATE TABLE IF NOT EXISTS public.waouh_processed_events (
  event_id TEXT PRIMARY KEY,
  source   TEXT NOT NULL DEFAULT 'waha',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.waouh_processed_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access waouh_processed_events"
  ON public.waouh_processed_events FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS waouh_processed_events_created_idx
  ON public.waouh_processed_events (created_at DESC);