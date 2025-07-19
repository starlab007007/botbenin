-- Supprimer le trigger problématique qui cause l'erreur de clé étrangère
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.create_complete_user_profile();

-- La création des profils se fera côté application, pas par trigger
-- Cela évite les problèmes de timing et de contraintes de clé étrangère