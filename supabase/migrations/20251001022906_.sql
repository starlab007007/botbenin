-- Corriger la fonction handle_new_user pour gérer les doublons
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insérer le bot_owner seulement s'il n'existe pas déjà
  INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
  VALUES (NEW.id, 'free', 5)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;;
