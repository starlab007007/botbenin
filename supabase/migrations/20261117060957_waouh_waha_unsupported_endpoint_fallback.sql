CREATE OR REPLACE FUNCTION public.waouh_waha_report(p_audit_id bigint, p_status integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  request_scope text;
  pause_duration interval;
  reason text;
BEGIN
  UPDATE public.waouh_waha_egress_audit
  SET result = 'completed', http_status = p_status
  WHERE id = p_audit_id AND result = 'reserved'
  RETURNING scope INTO request_scope;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_status IN (401, 403) THEN
    pause_duration := interval '12 hours';
    reason := 'WAHA authentication rejected';
  ELSIF p_status = 429 THEN
    pause_duration := interval '1 hour';
    reason := 'WAHA rate limited';
  ELSIF p_status BETWEEN 500 AND 599 AND p_status <> 501 AND request_scope <> 'contact_sync' THEN
    -- HTTP 501 reports an unsupported endpoint. The sender can still fall back to text.
    pause_duration := interval '10 minutes';
    reason := 'WAHA upstream error';
  ELSE
    RETURN;
  END IF;

  UPDATE public.waouh_waha_egress_policy
  SET paused_until = now() + pause_duration, pause_reason = reason, updated_at = now()
  WHERE id = true AND (paused_until IS NULL OR paused_until < now() + pause_duration);
END
$function$;
