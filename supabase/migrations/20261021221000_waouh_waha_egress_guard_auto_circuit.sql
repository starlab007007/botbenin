-- WAOUH WAHA egress guard; mirrors the production database migration.
CREATE TABLE IF NOT EXISTS public.waouh_waha_egress_policy (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 enabled boolean NOT NULL DEFAULT false,
 allow_status boolean NOT NULL DEFAULT true,
 allow_transactional boolean NOT NULL DEFAULT true,
 allow_inbound_reply boolean NOT NULL DEFAULT true,
 allow_contact_sync boolean NOT NULL DEFAULT false,
 allow_cold_outreach boolean NOT NULL DEFAULT false,
 allow_campaigns boolean NOT NULL DEFAULT false,
 allow_management boolean NOT NULL DEFAULT false,
 calls_per_minute integer NOT NULL DEFAULT 12 CHECK(calls_per_minute BETWEEN 1 AND 120),
 calls_per_day integer NOT NULL DEFAULT 600 CHECK(calls_per_day BETWEEN 1 AND 10000),
 paused_until timestamptz,
 pause_reason text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.waouh_waha_egress_policy(id,enabled) VALUES(true,false) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.waouh_waha_egress_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now(),
 scope text NOT NULL,
 result text NOT NULL DEFAULT 'reserved',
 http_status integer,
 reason text
);
CREATE INDEX IF NOT EXISTS waouh_waha_egress_audit_time_idx ON public.waouh_waha_egress_audit(created_at DESC);
ALTER TABLE public.waouh_waha_egress_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_waha_egress_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.waouh_waha_egress_policy, public.waouh_waha_egress_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.waouh_waha_egress_policy TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.waouh_waha_egress_audit TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.waouh_waha_egress_audit_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.waouh_waha_report(p_audit_id bigint, p_status integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 UPDATE public.waouh_waha_egress_audit SET result='completed',http_status=p_status WHERE id=p_audit_id;
 IF p_status IN (401,403) THEN
  UPDATE public.waouh_waha_egress_policy SET
   paused_until=now()+interval '12 hours',pause_reason='WAHA authentication rejected',updated_at=now()
   WHERE id=true;
 ELSIF p_status=429 THEN
  UPDATE public.waouh_waha_egress_policy SET
   paused_until=now()+interval '1 hour',pause_reason='WAHA rate limited',updated_at=now()
   WHERE id=true;
 ELSIF p_status BETWEEN 500 AND 599 THEN
  UPDATE public.waouh_waha_egress_policy SET
   paused_until=now()+interval '10 minutes',pause_reason='WAHA upstream error',updated_at=now()
   WHERE id=true;
 END IF;
END $function$

CREATE OR REPLACE FUNCTION public.waouh_waha_take(p_scope text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 c public.waouh_waha_egress_policy%ROWTYPE;
 v_allowed boolean := false;
 v_per_min integer;
 v_per_day integer;
 v_id bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('waouh_waha_egress_v1'));
 SELECT * INTO c FROM public.waouh_waha_egress_policy WHERE id=true;
 IF NOT FOUND OR NOT c.enabled THEN RETURN jsonb_build_object('allowed',false,'reason','egress_disabled'); END IF;
 IF c.paused_until IS NOT NULL AND c.paused_until>now() THEN
   RETURN jsonb_build_object('allowed',false,'reason','circuit_open','until',c.paused_until);
 END IF;
 v_allowed := CASE p_scope
  WHEN 'status' THEN c.allow_status
  WHEN 'transactional' THEN c.allow_transactional
  WHEN 'inbound_reply' THEN c.allow_inbound_reply
  WHEN 'contact_sync' THEN c.allow_contact_sync
  WHEN 'cold_outreach' THEN c.allow_cold_outreach
  WHEN 'campaign' THEN c.allow_campaigns
  WHEN 'management' THEN c.allow_management
  ELSE false END;
 IF NOT v_allowed THEN RETURN jsonb_build_object('allowed',false,'reason','scope_disabled','scope',p_scope); END IF;
 SELECT count(*) INTO v_per_min FROM public.waouh_waha_egress_audit
 WHERE created_at >= now()-interval '1 minute' AND result='reserved';
 SELECT count(*) INTO v_per_day FROM public.waouh_waha_egress_audit
 WHERE created_at >= now()-interval '1 day' AND result='reserved';
 IF v_per_min >= c.calls_per_minute OR v_per_day >= c.calls_per_day THEN
   RETURN jsonb_build_object('allowed',false,'reason','rate_limited');
 END IF;
 INSERT INTO public.waouh_waha_egress_audit(scope) VALUES (p_scope) RETURNING id INTO v_id;
 RETURN jsonb_build_object('allowed',true,'audit_id',v_id);
END $function$

REVOKE ALL ON FUNCTION public.waouh_waha_take(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.waouh_waha_report(bigint,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_waha_take(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.waouh_waha_report(bigint,integer) TO service_role;
