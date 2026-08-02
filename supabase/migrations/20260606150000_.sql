CREATE TABLE IF NOT EXISTS public.waouh_trace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid,
  article_id uuid,
  negotiation_id uuid,
  transaction_id uuid,
  deal_id uuid,
  actor_user_id uuid,
  recipient_user_id uuid,
  role text,
  stage text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  intent text,
  dedup_key text,
  payload jsonb DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.waouh_trace_events TO authenticated;
GRANT ALL ON public.waouh_trace_events TO service_role;

ALTER TABLE public.waouh_trace_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read trace events"
  ON public.waouh_trace_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages trace events"
  ON public.waouh_trace_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS waouh_trace_events_trace_idx ON public.waouh_trace_events(trace_id);
CREATE INDEX IF NOT EXISTS waouh_trace_events_article_idx ON public.waouh_trace_events(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_trace_events_negotiation_idx ON public.waouh_trace_events(negotiation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_trace_events_transaction_idx ON public.waouh_trace_events(transaction_id);
CREATE INDEX IF NOT EXISTS waouh_trace_events_created_idx ON public.waouh_trace_events(created_at DESC);
CREATE INDEX IF NOT EXISTS waouh_trace_events_stage_status_idx ON public.waouh_trace_events(stage, status);;
