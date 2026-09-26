-- WAOUH Avatar Journey -> Deal Graph synchronization.
-- Keeps "Mes démarches" truthful after the user enters the authoritative
-- negotiation / delivery / payment engines.

CREATE OR REPLACE FUNCTION public.waouh_sync_opportunity_from_negotiation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_state text;
  v_next text;
  v_message text;
BEGIN
  IF NEW.state IN ('proposed','countered') THEN
    v_state := 'negotiating';
    v_next := 'Répondre à la proposition dans le Deal Room';
    v_message := CASE WHEN NEW.state='countered'
      THEN 'Une contre-proposition est arrivée. Votre Avatar vous montre les choix utiles.'
      ELSE 'La négociation est ouverte. Votre Avatar suit la réponse jusqu’à l’accord.'
    END;
  ELSIF NEW.state='accepted' THEN
    v_state := 'agreed';
    v_next := 'Confirmer disponibilité et mode de paiement';
    v_message := 'Accord trouvé. WAOUH poursuit maintenant les confirmations et l’exécution du deal.';
  ELSIF NEW.state IN ('rejected','refused') THEN
    v_state := 'cancelled';
    v_next := 'Choisir une autre opportunité ou relancer la recherche';
    v_message := 'Cette négociation est terminée sans accord. Votre Avatar peut poursuivre avec une autre opportunité.';
  ELSE
    RETURN NEW;
  END IF;

  UPDATE public.waouh_opportunity_journeys j
  SET negotiation_id = NEW.id,
      thread_id = COALESCE(j.thread_id, NEW.thread_id),
      contactability_level = 'C5',
      state = v_state,
      next_action = v_next,
      avatar_message = v_message,
      completed_at = CASE WHEN v_state='cancelled' THEN COALESCE(j.completed_at,now()) ELSE j.completed_at END
  WHERE j.negotiation_id=NEW.id
     OR (NEW.thread_id IS NOT NULL AND j.thread_id=NEW.thread_id)
     OR (j.id::text = COALESCE(NEW.meta->>'journey_id',''));

  INSERT INTO public.waouh_opportunity_events(
    journey_id,owner_id,event_type,from_state,to_state,contactability_level,payload
  )
  SELECT j.id,j.owner_id,'negotiation_state_changed',NULL,v_state,'C5',
         jsonb_build_object('negotiation_id',NEW.id,'negotiation_state',NEW.state)
  FROM public.waouh_opportunity_journeys j
  WHERE j.negotiation_id=NEW.id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS waouh_opportunity_negotiation_sync ON public.waouh_negotiations;
CREATE TRIGGER waouh_opportunity_negotiation_sync
AFTER INSERT OR UPDATE OF state,thread_id,last_offer_price
ON public.waouh_negotiations
FOR EACH ROW EXECUTE FUNCTION public.waouh_sync_opportunity_from_negotiation();


CREATE OR REPLACE FUNCTION public.waouh_sync_opportunity_from_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_state text;
  v_next text;
  v_message text;
  v_done timestamptz;
BEGIN
  v_state := CASE
    WHEN NEW.status IN ('awaiting_confirmation','awaiting_payment') THEN 'agreed'
    WHEN NEW.status IN ('pending_assignment','assigned','picked_up','delivered') THEN 'executing'
    WHEN NEW.status='completed' THEN 'completed'
    WHEN NEW.status='cancelled' THEN 'cancelled'
    ELSE 'agreed'
  END;

  v_next := CASE NEW.status
    WHEN 'awaiting_confirmation' THEN 'Le vendeur confirme la disponibilité'
    WHEN 'awaiting_payment' THEN 'L’acheteur choisit le mode de paiement'
    WHEN 'pending_assignment' THEN 'WAOUH cherche et assigne un livreur'
    WHEN 'assigned' THEN 'Suivre l’arrivée du livreur'
    WHEN 'picked_up' THEN 'Suivre la livraison'
    WHEN 'delivered' THEN 'Confirmer le paiement / la réception'
    WHEN 'completed' THEN 'Transaction terminée'
    WHEN 'cancelled' THEN 'Relancer une nouvelle opportunité'
    ELSE 'Continuer le Deal Room'
  END;

  v_message := CASE NEW.status
    WHEN 'awaiting_confirmation' THEN 'Accord enregistré. Votre Avatar attend la confirmation de disponibilité.'
    WHEN 'awaiting_payment' THEN 'Disponibilité confirmée. Votre Avatar guide maintenant le choix de paiement.'
    WHEN 'pending_assignment' THEN 'Les conditions sont réunies. WAOUH recherche automatiquement un livreur.'
    WHEN 'assigned' THEN 'Livreur assigné. Votre Avatar suit l’exécution du deal.'
    WHEN 'picked_up' THEN 'Le colis a été collecté. Votre Avatar suit la livraison.'
    WHEN 'delivered' THEN 'Livraison effectuée. Il reste la confirmation de paiement pour terminer.'
    WHEN 'completed' THEN 'Accord exécuté et transaction terminée dans WAOUH.'
    WHEN 'cancelled' THEN 'Le deal a été annulé. Votre Avatar peut relancer la recherche sans perdre l’historique.'
    ELSE 'Le Deal Graph poursuit la transaction.'
  END;

  IF v_state IN ('completed','cancelled') THEN v_done := now(); ELSE v_done := NULL; END IF;

  UPDATE public.waouh_opportunity_journeys j
  SET deal_id=NEW.id,
      negotiation_id=COALESCE(j.negotiation_id,NEW.negotiation_id),
      thread_id=COALESCE(j.thread_id,NEW.thread_id),
      contactability_level='C5',
      state=v_state,
      next_action=v_next,
      avatar_message=v_message,
      completed_at=CASE WHEN v_done IS NOT NULL THEN COALESCE(j.completed_at,v_done) ELSE j.completed_at END
  WHERE j.deal_id=NEW.id
     OR (NEW.negotiation_id IS NOT NULL AND j.negotiation_id=NEW.negotiation_id)
     OR (NEW.thread_id IS NOT NULL AND j.thread_id=NEW.thread_id);

  INSERT INTO public.waouh_opportunity_events(
    journey_id,owner_id,event_type,from_state,to_state,contactability_level,payload
  )
  SELECT j.id,j.owner_id,'deal_state_changed',NULL,v_state,'C5',
         jsonb_build_object(
           'deal_id',NEW.id,'deal_status',NEW.status,
           'courier_user_id',NEW.courier_user_id,
           'payment_status',NEW.payment_status
         )
  FROM public.waouh_opportunity_journeys j
  WHERE j.deal_id=NEW.id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS waouh_opportunity_deal_sync ON public.waouh_deals;
CREATE TRIGGER waouh_opportunity_deal_sync
AFTER INSERT OR UPDATE OF status,negotiation_id,thread_id,courier_user_id,payment_status
ON public.waouh_deals
FOR EACH ROW EXECUTE FUNCTION public.waouh_sync_opportunity_from_deal();
