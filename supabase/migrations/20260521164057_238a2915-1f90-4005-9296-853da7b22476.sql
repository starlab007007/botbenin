
-- Add short code to partner businesses
ALTER TABLE public.waouh_partner_businesses
  ADD COLUMN IF NOT EXISTS code_court TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.gen_waouh_business_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_try INT := 0;
BEGIN
  IF NEW.code_court IS NOT NULL AND length(NEW.code_court) > 0 THEN
    RETURN NEW;
  END IF;
  LOOP
    v_try := v_try + 1;
    v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    IF NOT EXISTS (SELECT 1 FROM public.waouh_partner_businesses WHERE code_court = v_code) THEN
      NEW.code_court := v_code;
      RETURN NEW;
    END IF;
    IF v_try > 50 THEN
      NEW.code_court := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS trg_gen_waouh_business_code ON public.waouh_partner_businesses;
CREATE TRIGGER trg_gen_waouh_business_code
  BEFORE INSERT ON public.waouh_partner_businesses
  FOR EACH ROW EXECUTE FUNCTION public.gen_waouh_business_code();

-- Backfill existing rows
UPDATE public.waouh_partner_businesses
SET code_court = upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6))
WHERE code_court IS NULL;
