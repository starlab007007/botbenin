CREATE OR REPLACE FUNCTION public.waouh_check_article_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE recent_count INTEGER;
BEGIN
  -- Skip rate limit for system-promoted articles (partner/radar catalog promotions where seller_id is null)
  IF NEW.seller_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Skip for non-user origins
  IF NEW.origin IN ('partner','radar_ia') OR NEW.source_channel IN ('partner','radar_ia') THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO recent_count FROM public.waouh_articles
    WHERE seller_id = NEW.seller_id AND created_at > now() - interval '24 hours';
  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 annonces par 24h atteinte';
  END IF;
  RETURN NEW;
END;
$function$;;
