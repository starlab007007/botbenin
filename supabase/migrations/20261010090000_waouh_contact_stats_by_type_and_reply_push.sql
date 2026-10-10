-- 1) Statistiques exactes par type (achat, vente, demande, négociation, recherche).
CREATE OR REPLACE FUNCTION public.waouh_contact_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'to_contact', count(*) FILTER (WHERE stage IN ('discovered','enriching','contact_ready')),
    'pending', count(*) FILTER (WHERE stage IN ('contacting','waiting_reply')),
    'replied', count(*) FILTER (WHERE stage IN ('negotiating','agreed','executing','completed')),
    'contacted', count(*) FILTER (WHERE stage IN ('contacting','waiting_reply','negotiating','agreed','executing','completed')),
    'with_number', count(*) FILTER (WHERE contact_last4 IS NOT NULL),
    'purchases', count(*) FILTER (WHERE mode = 'buy'),
    'sales', count(*) FILTER (WHERE mode = 'sell'),
    'requests', count(*) FILTER (WHERE mode = 'ask'),
    'negotiations', count(*) FILTER (WHERE stage IN ('negotiating','agreed')),
    'searches', (SELECT count(*) FROM public.waouh_avatar_mandates m WHERE m.owner_id = auth.uid() AND m.status = 'active'),
    'active_missions', (SELECT count(*) FROM public.waouh_avatar_mandates m WHERE m.owner_id = auth.uid() AND m.status = 'active'),
    'actions_7d', (SELECT count(*) FROM public.waouh_opportunity_events e WHERE e.owner_id = auth.uid() AND e.created_at > now() - interval '7 days')
  )
  FROM public.waouh_opportunity_journeys
  WHERE owner_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.waouh_contact_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.waouh_contact_stats() TO authenticated;

-- 2) Notification (et push) quand un contact répond : la ligne est reprise par la tâche push existante.
CREATE OR REPLACE FUNCTION public.waouh_journey_reply_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid; v_title text;
BEGIN
  BEGIN
    IF NEW.stage = 'negotiating'
       AND (OLD.stage IS DISTINCT FROM 'negotiating' OR NEW.last_response_at IS DISTINCT FROM OLD.last_response_at) THEN
      SELECT id INTO v_user FROM public.waouh_users WHERE auth_user_id = NEW.owner_id LIMIT 1;
      IF v_user IS NOT NULL THEN
        v_title := left(COALESCE(NULLIF(NEW.subject, ''), 'votre démarche'), 60);
        INSERT INTO public.waouh_notifications (user_id, notification_type, channel, dedupe_key, payload)
        VALUES (v_user, 'contact_reply', 'app',
                'contact_reply:' || NEW.id || ':' || COALESCE(to_char(NEW.last_response_at, 'YYYYMMDDHH24MISS'), 'x'),
                jsonb_build_object('smart', jsonb_build_object(
                  'title', 'Un contact a répondu',
                  'detail', v_title || ' · Bot prépare la négociation',
                  'route', '/app/missions?view=suivi'),
                  'journey_id', NEW.id, 'thread_id', NEW.thread_id, 'mode', NEW.mode,
                  'subject', v_title, 'reply_enabled', true));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- une notification ne doit jamais bloquer une démarche
  END;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS waouh_zz_journey_reply_notify ON public.waouh_opportunity_journeys;
CREATE TRIGGER waouh_zz_journey_reply_notify
  AFTER UPDATE ON public.waouh_opportunity_journeys
  FOR EACH ROW EXECUTE FUNCTION public.waouh_journey_reply_notify();
