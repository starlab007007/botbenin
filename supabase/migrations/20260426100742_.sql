-- 1. Rendre user_id nullable
ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;

-- 2. Ajouter les champs guest
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS guest_email          text,
  ADD COLUMN IF NOT EXISTS guest_full_name      text,
  ADD COLUMN IF NOT EXISTS guest_phone          text,
  ADD COLUMN IF NOT EXISTS guest_token_hash     text,
  ADD COLUMN IF NOT EXISTS guest_token_expires  timestamptz;

-- Unique sur le hash du token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_guest_token_hash_key'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_guest_token_hash_key UNIQUE (guest_token_hash);
  END IF;
END $$;

-- Colonne calculée
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS is_guest_ticket boolean GENERATED ALWAYS AS (user_id IS NULL) STORED;

-- 3. Contrainte d'intégrité
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_owner_chk'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_owner_chk
      CHECK (
        (user_id IS NOT NULL)
        OR (guest_email IS NOT NULL AND guest_token_hash IS NOT NULL)
      );
  END IF;
END $$;

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_support_tickets_guest_token
  ON public.support_tickets(guest_token_hash)
  WHERE guest_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_guest_email
  ON public.support_tickets(lower(guest_email))
  WHERE guest_email IS NOT NULL;

-- 5. Table de rate-limit publique (interne)
CREATE TABLE IF NOT EXISTS public.support_public_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  email_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_created
  ON public.support_public_rate_limit(ip_hash, created_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_email_created
  ON public.support_public_rate_limit(email_hash, created_at)
  WHERE email_hash IS NOT NULL;

ALTER TABLE public.support_public_rate_limit ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul service_role accède

-- 6. Fonction de réclamation des tickets guest par un compte
CREATE OR REPLACE FUNCTION public.claim_guest_tickets(_email text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
  _user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(email) INTO _user_email FROM auth.users WHERE id = auth.uid();
  IF _user_email IS NULL OR _user_email <> lower(_email) THEN
    RETURN 0;
  END IF;

  UPDATE public.support_tickets
     SET user_id = auth.uid(),
         guest_token_hash = NULL,
         guest_token_expires = NULL
   WHERE lower(guest_email) = lower(_email)
     AND user_id IS NULL;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END
$$;

GRANT EXECUTE ON FUNCTION public.claim_guest_tickets(text) TO authenticated;;
