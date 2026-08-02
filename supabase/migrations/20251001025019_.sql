-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Créer une fonction plus robuste qui ne bloque jamais l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Essayer de créer le bot_owner, mais ne jamais échouer
  BEGIN
    INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
    VALUES (NEW.id, 'free', 5)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Logger l'erreur mais ne pas bloquer l'inscription
    RAISE WARNING 'Error creating bot_owner for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Toujours retourner NEW pour que l'inscription continue
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Vérifier que la contrainte unique existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bot_owners_user_id_key'
  ) THEN
    ALTER TABLE public.bot_owners 
    ADD CONSTRAINT bot_owners_user_id_key UNIQUE (user_id);
  END IF;
END $$;;
