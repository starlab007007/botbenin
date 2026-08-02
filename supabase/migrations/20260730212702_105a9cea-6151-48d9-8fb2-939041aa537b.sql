ALTER TABLE public.waouh_trace_events ADD COLUMN IF NOT EXISTS correlation_id text;

CREATE INDEX IF NOT EXISTS waouh_trace_events_correlation_idx
  ON public.waouh_trace_events(correlation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS waouh_trace_events_corr_article_idx
  ON public.waouh_trace_events(article_id, correlation_id, created_at DESC);

GRANT INSERT ON public.waouh_trace_events TO authenticated;

DROP POLICY IF EXISTS "Users can insert their own UI trace events" ON public.waouh_trace_events;
CREATE POLICY "Users can insert their own UI trace events"
  ON public.waouh_trace_events FOR INSERT TO authenticated
  WITH CHECK (stage LIKE 'ui_%');;
