-- Keep noncritical contacts directory timeouts from pausing transactional WhatsApp traffic.
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
  -- A slow contact directory lookup must not disable incoming replies,
  -- transactions or WAOUH sessions for everyone.
  IF NOT (p_status = 599 AND EXISTS (
    SELECT 1 FROM public.waouh_waha_egress_audit
    WHERE id=p_audit_id AND scope='contact_sync'
  )) THEN
    UPDATE public.waouh_waha_egress_policy SET
      paused_until=now()+interval '10 minutes',
      pause_reason='WAHA upstream error',updated_at=now()
    WHERE id=true;
  END IF;
 END IF;
END $function$

