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
  -- Contact directory failures are isolated from incoming replies,
  -- transactions or WAOUH sessions for everyone.
  IF NOT EXISTS (
    SELECT 1 FROM public.waouh_waha_egress_audit
    WHERE id=p_audit_id AND scope='contact_sync'
  ) THEN
    UPDATE public.waouh_waha_egress_policy SET
      paused_until=now()+interval '10 minutes',
      pause_reason='WAHA upstream error',updated_at=now()
    WHERE id=true;
  END IF;
 END IF;
END $function$;
-- Only release a circuit whose triggering request was an isolated directory failure.
update public.waouh_waha_egress_policy p
set paused_until=null,pause_reason=null,updated_at=now()
where p.id=true and p.enabled and p.pause_reason='WAHA upstream error' and p.paused_until>now()
 and exists (
  select 1 from public.waouh_waha_egress_audit a
  where a.scope='contact_sync' and a.http_status between 500 and 599
    and a.created_at between p.updated_at-interval '25 seconds' and p.updated_at
    and not exists (
      select 1 from public.waouh_waha_egress_audit more_recent
      where more_recent.id>a.id and more_recent.created_at<=p.updated_at
        and (more_recent.http_status in(401,403,429) or more_recent.http_status between 500 and 599)
    )
 );
