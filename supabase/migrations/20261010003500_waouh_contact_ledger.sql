-- Registre de contacts : journal d'événements par action, 4 derniers chiffres
-- du numéro sur chaque démarche, et statistiques agrégées par utilisateur.
-- Aucun envoi : ces objets ne font que consigner et compter.

-- 1) 4 derniers chiffres (jamais le numéro complet) recopiés sur la démarche.
CREATE OR REPLACE FUNCTION public.waouh_journey_set_contact_last4()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v text;
BEGIN
  IF NEW.contact_last4 IS NULL OR NEW.contact_last4 = '' THEN
    v := COALESCE(
      NEW.masked_contact->'phones'->0->>'last4',
      NEW.contact_pack->'masked_contacts'->0->>'last4'
    );
    v := right(regexp_replace(COALESCE(v, ''), '\D', '', 'g'), 4);
    IF length(v) = 4 THEN NEW.contact_last4 := v; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS waouh_zz_journey_contact_last4 ON public.waouh_opportunity_journeys;
CREATE TRIGGER waouh_zz_journey_contact_last4
  BEFORE INSERT OR UPDATE ON public.waouh_opportunity_journeys
  FOR EACH ROW EXECUTE FUNCTION public.waouh_journey_set_contact_last4();

UPDATE public.waouh_opportunity_journeys SET contact_last4 = contact_last4 WHERE contact_last4 IS NULL;

-- 2) Journal : une ligne à chaque changement d'étape, d'action ou de canal.
CREATE OR REPLACE FUNCTION public.waouh_journey_log_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.waouh_opportunity_events (journey_id, owner_id, event_type, from_state, to_state, contactability_level, payload)
      VALUES (NEW.id, NEW.owner_id, 'opportunity_started', NULL, NEW.stage, NEW.contactability_level,
              jsonb_build_object('channel', NEW.contact_channel, 'last4', NEW.contact_last4, 'mandate_id', NEW.mandate_id));
    ELSIF NEW.stage IS DISTINCT FROM OLD.stage
       OR NEW.last_action IS DISTINCT FROM OLD.last_action
       OR NEW.contact_channel IS DISTINCT FROM OLD.contact_channel
       OR NEW.last_contact_at IS DISTINCT FROM OLD.last_contact_at
       OR NEW.last_response_at IS DISTINCT FROM OLD.last_response_at THEN
      INSERT INTO public.waouh_opportunity_events (journey_id, owner_id, event_type, from_state, to_state, contactability_level, payload)
      VALUES (NEW.id, NEW.owner_id,
              COALESCE(NULLIF(NEW.last_action, ''), 'stage_changed'),
              OLD.stage, NEW.stage, NEW.contactability_level,
              jsonb_build_object('channel', NEW.contact_channel, 'last4', NEW.contact_last4,
                                 'replied', NEW.last_response_at IS DISTINCT FROM OLD.last_response_at));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- le journal ne doit jamais bloquer une démarche
  END;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS waouh_zz_journey_log_event ON public.waouh_opportunity_journeys;
CREATE TRIGGER waouh_zz_journey_log_event
  AFTER INSERT OR UPDATE ON public.waouh_opportunity_journeys
  FOR EACH ROW EXECUTE FUNCTION public.waouh_journey_log_event();

CREATE INDEX IF NOT EXISTS waouh_opportunity_events_owner_created_idx
  ON public.waouh_opportunity_events (owner_id, created_at DESC);

-- 3) Statistiques exactes (au-delà des 50 dernières démarches), pour l'utilisateur connecté.
CREATE OR REPLACE FUNCTION public.waouh_contact_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'to_contact', count(*) FILTER (WHERE stage IN ('discovered','enriching','contact_ready')),
    'pending', count(*) FILTER (WHERE stage IN ('contacting','waiting_reply')),
    'replied', count(*) FILTER (WHERE stage IN ('negotiating','agreed','executing','completed')),
    'contacted', count(*) FILTER (WHERE stage IN ('contacting','waiting_reply','negotiating','agreed','executing','completed')),
    'with_number', count(*) FILTER (WHERE contact_last4 IS NOT NULL),
    'active_missions', (SELECT count(*) FROM public.waouh_avatar_mandates m WHERE m.owner_id = auth.uid() AND m.status = 'active'),
    'actions_7d', (SELECT count(*) FROM public.waouh_opportunity_events e WHERE e.owner_id = auth.uid() AND e.created_at > now() - interval '7 days')
  )
  FROM public.waouh_opportunity_journeys
  WHERE owner_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.waouh_contact_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.waouh_contact_stats() TO authenticated;
