
-- Vérifier l'état actuel du bot
SELECT id, name, share_enabled, is_active, created_at, updated_at
FROM public.bots 
WHERE id = '67e9ff9c-f225-4ebd-bb22-b942390eeb07';

-- Corriger les champs pour rendre le bot accessible publiquement
UPDATE public.bots 
SET 
  share_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE id = '67e9ff9c-f225-4ebd-bb22-b942390eeb07';

-- Vérifier que la correction a bien été appliquée
SELECT id, name, share_enabled, is_active, created_at, updated_at
FROM public.bots 
WHERE id = '67e9ff9c-f225-4ebd-bb22-b942390eeb07';
