CREATE OR REPLACE FUNCTION public.waouh_notify_expiring_mandates()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH due AS (
    UPDATE public.waouh_avatar_mandates m
       SET metadata = coalesce(m.metadata,'{}'::jsonb) || jsonb_build_object('expiry_warned_at', now())
     WHERE m.status = 'active' AND m.expires_at > now() AND m.expires_at <= now() + interval '2 hours'
       AND NOT (coalesce(m.metadata,'{}'::jsonb) ? 'expiry_warned_at')
    RETURNING m.id, m.owner_id, m.goal
  )
  INSERT INTO public.notifications(user_id,title,content,type,read,action_url,metadata)
  SELECT owner_id, 'Votre mission se termine bientôt',
         'Bot arrête « '||left(coalesce(goal,'votre mission'),80)||' » dans moins de 2 h. Prolongez-la pour qu''il continue.',
         'mandate_expiring', false, '/app/missions?mandate_id='||id, jsonb_build_object('mandate_id',id)
  FROM due;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.waouh_notify_expiring_mandates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_notify_expiring_mandates() TO service_role;
SELECT cron.schedule('waouh-mandate-expiry-warning','7 * * * *','select public.waouh_notify_expiring_mandates()');