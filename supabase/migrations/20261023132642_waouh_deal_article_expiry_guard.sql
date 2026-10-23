-- Prevent agreement creation after expiry even on a legacy or concurrent entry point.
CREATE OR REPLACE FUNCTION public.waouh_require_live_article_for_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE article_status text; article_expiry timestamptz;
BEGIN
  IF NEW.article_id IS NULL THEN RETURN NEW; END IF;
  SELECT status, expires_at INTO article_status, article_expiry
    FROM public.waouh_articles WHERE id = NEW.article_id FOR SHARE;
  IF article_status = 'expired' OR article_expiry <= clock_timestamp() THEN
    RAISE EXCEPTION 'article_expired' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.waouh_require_live_article_for_deal() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_require_live_article_for_deal() TO service_role;
DROP TRIGGER IF EXISTS waouh_deal_article_expiry_guard ON public.waouh_deals;
CREATE TRIGGER waouh_deal_article_expiry_guard BEFORE INSERT ON public.waouh_deals
FOR EACH ROW EXECUTE FUNCTION public.waouh_require_live_article_for_deal();
