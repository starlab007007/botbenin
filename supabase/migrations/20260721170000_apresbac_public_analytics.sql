-- AprèsBac IA public-link analytics (privacy-safe metadata only)
-- No raw IP address, message content, student notes, or full user-agent is stored.

CREATE TABLE IF NOT EXISTS public.apresbac_public_sessions (
  session_id text PRIMARY KEY CHECK (char_length(session_id) BETWEEN 8 AND 128),
  visitor_hash text NOT NULL CHECK (char_length(visitor_hash) BETWEEN 16 AND 128),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  bac_series text,
  channel text NOT NULL DEFAULT 'public-web',
  device_type text,
  browser_family text,
  os_family text,
  locale text,
  timezone text,
  referrer_host text,
  campaign_source text,
  campaign_medium text,
  campaign_name text,
  first_path text NOT NULL DEFAULT '/apresbacia',
  release text
);

CREATE TABLE IF NOT EXISTS public.apresbac_public_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.apresbac_public_sessions(session_id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'session_start', 'session_end', 'page_view', 'heartbeat',
    'user_message', 'assistant_message', 'chat_error', 'chat_reset',
    'ocr_start', 'ocr_success', 'ocr_failure', 'notes_validated'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  bac_series text,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms BETWEEN 0 AND 900000),
  status_code integer CHECK (status_code IS NULL OR status_code BETWEEN 100 AND 599),
  request_chars integer CHECK (request_chars IS NULL OR request_chars BETWEEN 0 AND 500000),
  response_chars integer CHECK (response_chars IS NULL OR response_chars BETWEEN 0 AND 500000),
  estimated_input_tokens integer CHECK (estimated_input_tokens IS NULL OR estimated_input_tokens BETWEEN 0 AND 500000),
  estimated_output_tokens integer CHECK (estimated_output_tokens IS NULL OR estimated_output_tokens BETWEEN 0 AND 500000),
  estimated_cost_usd numeric(14,8) CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
  model text,
  error_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT apresbac_public_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_apresbac_public_sessions_started
  ON public.apresbac_public_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_apresbac_public_sessions_last_seen
  ON public.apresbac_public_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_apresbac_public_sessions_visitor
  ON public.apresbac_public_sessions(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_apresbac_public_sessions_series
  ON public.apresbac_public_sessions(bac_series);
CREATE INDEX IF NOT EXISTS idx_apresbac_public_events_created
  ON public.apresbac_public_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apresbac_public_events_session_created
  ON public.apresbac_public_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apresbac_public_events_type_created
  ON public.apresbac_public_events(event_type, created_at DESC);

ALTER TABLE public.apresbac_public_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apresbac_public_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "apresbac_public_sessions_admin_read" ON public.apresbac_public_sessions;
CREATE POLICY "apresbac_public_sessions_admin_read"
  ON public.apresbac_public_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "apresbac_public_events_admin_read" ON public.apresbac_public_events;
CREATE POLICY "apresbac_public_events_admin_read"
  ON public.apresbac_public_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.apresbac_public_sessions FROM anon;
REVOKE ALL ON public.apresbac_public_events FROM anon;
GRANT SELECT ON public.apresbac_public_sessions TO authenticated;
GRANT SELECT ON public.apresbac_public_events TO authenticated;

CREATE OR REPLACE VIEW public.v_apresbac_public_kpis
WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.apresbac_public_sessions) AS sessions_total,
  (SELECT count(*) FROM public.apresbac_public_sessions WHERE started_at >= date_trunc('day', now())) AS sessions_today,
  (SELECT count(*) FROM public.apresbac_public_sessions WHERE started_at >= now() - interval '7 days') AS sessions_7d,
  (SELECT count(*) FROM public.apresbac_public_sessions WHERE started_at >= now() - interval '30 days') AS sessions_30d,
  (SELECT count(DISTINCT visitor_hash) FROM public.apresbac_public_sessions) AS unique_visitors,
  (SELECT count(*) FROM public.apresbac_public_sessions WHERE last_seen_at >= now() - interval '15 minutes') AS active_15m,
  (SELECT count(*) FROM public.apresbac_public_events WHERE event_type = 'page_view') AS page_views,
  (SELECT count(*) FROM public.apresbac_public_events WHERE event_type = 'user_message') AS messages_user,
  (SELECT count(*) FROM public.apresbac_public_events WHERE event_type = 'assistant_message') AS messages_assistant,
  (SELECT count(*) FROM public.apresbac_public_events WHERE event_type = 'chat_error') AS chat_errors,
  (SELECT count(*) FROM public.apresbac_public_events WHERE event_type = 'ocr_start') AS ocr_attempts,
  (SELECT count(*) FROM public.apresbac_public_events WHERE event_type = 'ocr_success') AS ocr_success,
  (SELECT count(*) FROM public.apresbac_public_events WHERE event_type = 'ocr_failure') AS ocr_failed,
  (SELECT count(*) FROM public.apresbac_public_events WHERE event_type = 'notes_validated') AS notes_validated,
  COALESCE((SELECT round(avg(duration_ms)) FROM public.apresbac_public_events WHERE event_type = 'assistant_message' AND duration_ms IS NOT NULL), 0) AS avg_response_ms,
  COALESCE((SELECT round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)) FROM public.apresbac_public_events WHERE event_type = 'assistant_message' AND duration_ms IS NOT NULL), 0) AS p95_response_ms,
  COALESCE((SELECT sum(estimated_input_tokens) FROM public.apresbac_public_events), 0) AS estimated_input_tokens,
  COALESCE((SELECT sum(estimated_output_tokens) FROM public.apresbac_public_events), 0) AS estimated_output_tokens,
  COALESCE((SELECT round(sum(estimated_cost_usd), 4) FROM public.apresbac_public_events), 0) AS estimated_cost_usd,
  COALESCE(
    (SELECT round(count(*) FILTER (WHERE event_type = 'user_message')::numeric /
      NULLIF((SELECT count(*) FROM public.apresbac_public_sessions), 0), 2)
     FROM public.apresbac_public_events),
    0
  ) AS avg_user_messages_per_session;

CREATE OR REPLACE VIEW public.v_apresbac_public_daily
WITH (security_invoker = true) AS
SELECT
  day::date AS day,
  count(DISTINCT session_id) AS sessions,
  count(*) FILTER (WHERE event_type = 'page_view') AS page_views,
  count(*) FILTER (WHERE event_type = 'user_message') AS messages_user,
  count(*) FILTER (WHERE event_type = 'assistant_message') AS messages_assistant,
  count(*) FILTER (WHERE event_type = 'chat_error') AS errors,
  count(*) FILTER (WHERE event_type = 'ocr_success') AS ocr_success,
  count(*) FILTER (WHERE event_type = 'notes_validated') AS notes_validated,
  COALESCE(round(avg(duration_ms) FILTER (WHERE event_type = 'assistant_message')), 0) AS avg_response_ms,
  COALESCE(round(sum(estimated_cost_usd), 4), 0) AS estimated_cost_usd
FROM (
  SELECT date_trunc('day', created_at) AS day, *
  FROM public.apresbac_public_events
  WHERE created_at >= now() - interval '30 days'
) e
GROUP BY day
ORDER BY day;

CREATE OR REPLACE VIEW public.v_apresbac_public_series
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(bac_series, ''), 'Non renseignée') AS name,
  count(*) AS value
FROM public.apresbac_public_sessions
GROUP BY COALESCE(NULLIF(bac_series, ''), 'Non renseignée')
ORDER BY value DESC;

CREATE OR REPLACE VIEW public.v_apresbac_public_recent_sessions
WITH (security_invoker = true) AS
SELECT
  s.session_id,
  s.started_at,
  s.last_seen_at,
  s.ended_at,
  s.bac_series,
  s.device_type,
  s.browser_family,
  s.os_family,
  s.locale,
  s.referrer_host,
  s.release,
  count(e.id) FILTER (WHERE e.event_type = 'page_view') AS page_views,
  count(e.id) FILTER (WHERE e.event_type = 'user_message') AS messages_user,
  count(e.id) FILTER (WHERE e.event_type = 'assistant_message') AS messages_assistant,
  count(e.id) FILTER (WHERE e.event_type = 'chat_error') AS errors,
  COALESCE(round(avg(e.duration_ms) FILTER (WHERE e.event_type = 'assistant_message')), 0) AS avg_response_ms,
  COALESCE(round(sum(e.estimated_cost_usd), 4), 0) AS estimated_cost_usd
FROM public.apresbac_public_sessions s
LEFT JOIN public.apresbac_public_events e ON e.session_id = s.session_id
GROUP BY s.session_id
ORDER BY s.last_seen_at DESC;

GRANT SELECT ON public.v_apresbac_public_kpis TO authenticated;
GRANT SELECT ON public.v_apresbac_public_daily TO authenticated;
GRANT SELECT ON public.v_apresbac_public_series TO authenticated;
GRANT SELECT ON public.v_apresbac_public_recent_sessions TO authenticated;

COMMENT ON TABLE public.apresbac_public_sessions IS
  'Anonymous usage sessions for https://bot.bj/apresbacia; no raw IP, notes, or message content.';
COMMENT ON TABLE public.apresbac_public_events IS
  'Privacy-safe usage events and approximate AI cost metadata for the public AprèsBac IA link.';
