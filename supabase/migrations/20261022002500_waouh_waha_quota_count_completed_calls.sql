-- Count both in-flight and completed WAHA requests against global API quotas.
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
 WHERE created_at >= now()-interval '1 minute' AND result IN ('reserved','completed');
 SELECT count(*) INTO v_per_day FROM public.waouh_waha_egress_audit
 WHERE created_at >= now()-interval '1 day' AND result IN ('reserved','completed');
 IF v_per_min >= c.calls_per_minute OR v_per_day >= c.calls_per_day THEN
   RETURN jsonb_build_object('allowed',false,'reason','rate_limited');
 END IF;
 INSERT INTO public.waouh_waha_egress_audit(scope) VALUES (p_scope) RETURNING id INTO v_id;
 RETURN jsonb_build_object('allowed',true,'audit_id',v_id);
END $function$

