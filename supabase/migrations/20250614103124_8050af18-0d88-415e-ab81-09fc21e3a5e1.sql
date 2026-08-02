
-- 1. Mettre à jour tous les bots existants
UPDATE public.bots
SET is_active = true, share_enabled = true
WHERE is_active IS DISTINCT FROM true OR share_enabled IS DISTINCT FROM true;

-- 2. Modifier les valeurs par défaut directement sur la table (tous les futurs bots)
ALTER TABLE public.bots ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.bots ALTER COLUMN share_enabled SET DEFAULT true;

-- 3. Créer une fonction de trigger pour forcer les valeurs à true à la création
CREATE OR REPLACE FUNCTION public.set_bot_public_defaults()
RETURNS trigger AS $$
BEGIN
  NEW.is_active := true;
  NEW.share_enabled := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Créer le trigger qui utilise cette fonction
DROP TRIGGER IF EXISTS trg_set_bot_public_defaults ON public.bots;
CREATE TRIGGER trg_set_bot_public_defaults
BEFORE INSERT ON public.bots
FOR EACH ROW
EXECUTE FUNCTION public.set_bot_public_defaults();
;
