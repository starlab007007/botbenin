-- Corriger la limite de bots pour tous les utilisateurs existants
UPDATE public.bot_owners 
SET max_bots = 10, updated_at = NOW()
WHERE max_bots < 10;

-- Modifier le trigger de création automatique de bot_owner pour utiliser 10 bots
CREATE OR REPLACE FUNCTION public.handle_new_bot_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
  VALUES (NEW.id, 'free', 10);
  RETURN NEW;
END;
$function$;

-- S'assurer que le trigger est correctement configuré
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_bot_owner();