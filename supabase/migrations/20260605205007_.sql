-- Auto-notify buyer profiles when a new partner/radar item enters the unified catalog
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_buyers_on_catalog_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_should_notify boolean := false;
BEGIN
  -- Only consider partner and radar sources (chat goes through waouh_articles)
  IF NEW.source NOT IN ('partner', 'radar') THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_active, false) IS NOT TRUE THEN RETURN NEW; END IF;
  IF COALESCE(NEW.type, 'offer') <> 'offer' THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    v_should_notify := true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Notify when item transitions to active OR when its searchable fields change
    IF (OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active = true)
       OR OLD.titre IS DISTINCT FROM NEW.titre
       OR OLD.prix_min IS DISTINCT FROM NEW.prix_min
       OR OLD.prix_max IS DISTINCT FROM NEW.prix_max THEN
      v_should_notify := true;
    END IF;
  END IF;

  IF NOT v_should_notify THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-notify-buyers',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8"}'::jsonb,
    body := jsonb_build_object('catalog_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the catalog write because of a notification failure
  RAISE WARNING 'notify_buyers_on_catalog_item failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_buyers_on_catalog_item ON public.waouh_unified_catalog;
CREATE TRIGGER trg_notify_buyers_on_catalog_item
AFTER INSERT OR UPDATE ON public.waouh_unified_catalog
FOR EACH ROW
EXECUTE FUNCTION public.notify_buyers_on_catalog_item();;
