
-- Mettre à jour la limite par défaut pour les nouveaux bot_owners (plan gratuit)
ALTER TABLE public.bot_owners ALTER COLUMN max_bots SET DEFAULT 5;

-- Mettre à jour tous les bot_owners existants avec le plan gratuit pour avoir 5 bots maximum
UPDATE public.bot_owners 
SET max_bots = 5 
WHERE subscription_plan = 'free' AND max_bots < 5;

-- Mettre à jour tous les bot_owners existants avec le plan pro pour avoir 15 bots maximum
UPDATE public.bot_owners 
SET max_bots = 15 
WHERE subscription_plan = 'pro' AND max_bots < 15;
