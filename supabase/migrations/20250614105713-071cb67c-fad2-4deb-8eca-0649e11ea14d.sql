
-- Vérifier et corriger l'état actuel de tous les bots
UPDATE public.bots
SET 
  is_active = true, 
  share_enabled = true,
  updated_at = NOW()
WHERE is_active IS DISTINCT FROM true OR share_enabled IS DISTINCT FROM true;

-- S'assurer que les contraintes par défaut sont bien définies
ALTER TABLE public.bots ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.bots ALTER COLUMN share_enabled SET DEFAULT true;

-- Recréer la fonction de trigger avec plus de robustesse
CREATE OR REPLACE FUNCTION public.ensure_bot_public_access()
RETURNS trigger AS $$
BEGIN
  -- Forcer l'accès public pour tous les nouveaux bots
  NEW.is_active := COALESCE(NEW.is_active, true);
  NEW.share_enabled := COALESCE(NEW.share_enabled, true);
  
  -- Générer automatiquement l'URL publique si elle n'existe pas
  IF NEW.public_chat_url IS NULL OR NEW.public_chat_url = '' THEN
    NEW.public_chat_url := CONCAT('https://bot.bj/bot/', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe et créer le nouveau
DROP TRIGGER IF EXISTS trg_set_bot_public_defaults ON public.bots;
DROP TRIGGER IF EXISTS trg_ensure_bot_public_access ON public.bots;

CREATE TRIGGER trg_ensure_bot_public_access
BEFORE INSERT OR UPDATE ON public.bots
FOR EACH ROW
EXECUTE FUNCTION public.ensure_bot_public_access();

-- Mettre à jour tous les bots existants qui n'ont pas d'URL publique
UPDATE public.bots 
SET public_chat_url = CONCAT('https://bot.bj/bot/', id)
WHERE public_chat_url IS NULL OR public_chat_url = '';

-- Créer une fonction pour vérifier l'accès public qui ne dépend que de l'existence du bot
CREATE OR REPLACE FUNCTION public.check_bot_public_access(bot_uuid uuid)
RETURNS TABLE(
  accessible boolean,
  bot_data jsonb,
  error_message text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as accessible,
    to_jsonb(b.*) as bot_data,
    NULL::text as error_message
  FROM public.bots b
  WHERE b.id = bot_uuid;
  
  -- Si aucun bot trouvé, retourner non accessible
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      false as accessible,
      NULL::jsonb as bot_data,
      'Bot non trouvé' as error_message;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Afficher un résumé de l'état actuel
SELECT 
  COUNT(*) as total_bots,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_bots,
  COUNT(CASE WHEN share_enabled = true THEN 1 END) as public_bots,
  COUNT(CASE WHEN is_active = true AND share_enabled = true THEN 1 END) as fully_accessible_bots,
  COUNT(CASE WHEN public_chat_url IS NOT NULL AND public_chat_url != '' THEN 1 END) as bots_with_public_url
FROM public.bots;
