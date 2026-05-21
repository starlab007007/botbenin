-- Robust unique partner code generation using a sequence (avoids race conditions / duplicate key errors)
CREATE SEQUENCE IF NOT EXISTS public.waouh_partner_code_seq;

-- Initialize sequence above current max
DO $$
DECLARE max_n INT;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code_partenaire,'\D','','g'),'')::int),0)
    INTO max_n FROM public.waouh_partners;
  PERFORM setval('public.waouh_partner_code_seq', GREATEST(max_n, 1));
END $$;

CREATE OR REPLACE FUNCTION public.gen_waouh_partner_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE
  next_n INT;
  candidate TEXT;
  tries INT := 0;
BEGIN
  IF NEW.code_partenaire IS NULL OR NEW.code_partenaire = '' THEN
    LOOP
      next_n := nextval('public.waouh_partner_code_seq');
      candidate := 'WP-' || LPAD(next_n::text, 5, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.waouh_partners WHERE code_partenaire = candidate);
      tries := tries + 1;
      IF tries > 50 THEN
        candidate := 'WP-' || LPAD(next_n::text, 5, '0') || '-' || substr(md5(random()::text), 1, 4);
        EXIT;
      END IF;
    END LOOP;
    NEW.code_partenaire := candidate;
  END IF;
  RETURN NEW;
END;$$;