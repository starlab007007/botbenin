-- Correction définitive de l'erreur d'inscription bot_owners_user_id_unique
-- Suppression des triggers conflictuels et mise en place d'une solution propre

-- 1. Supprimer tous les triggers conflictuels sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_bot_owner ON auth.users;
DROP TRIGGER IF EXISTS auto_create_bot_owner ON auth.users;

-- 2. Supprimer les anciennes fonctions problématiques
DROP FUNCTION IF EXISTS public.handle_new_bot_owner();
DROP FUNCTION IF EXISTS public.ensure_bot_owner();

-- 3. Nettoyer les entrées dupliquées dans bot_owners (garder la plus ancienne)
WITH duplicate_owners AS (
  SELECT user_id, MIN(created_at) as earliest_created
  FROM public.bot_owners
  WHERE user_id IS NOT NULL
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
DELETE FROM public.bot_owners bo
WHERE bo.user_id IN (SELECT user_id FROM duplicate_owners)
AND bo.created_at > (
  SELECT earliest_created 
  FROM duplicate_owners d 
  WHERE d.user_id = bo.user_id
);

-- 4. Supprimer les entrées avec user_id NULL
DELETE FROM public.bot_owners WHERE user_id IS NULL;

-- 5. Créer le trigger correct utilisant notre fonction sécurisée
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_complete_user_profile();