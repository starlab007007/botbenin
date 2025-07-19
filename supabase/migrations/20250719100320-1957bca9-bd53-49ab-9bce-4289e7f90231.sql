-- Supprimer tous les triggers et fonctions problématiques
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_user_profile_created ON public.users CASCADE;
DROP FUNCTION IF EXISTS public.create_complete_user_profile() CASCADE;

-- S'assurer qu'il n'y a pas d'autres triggers sur auth.users qui créent des profils
DO $$
DECLARE
    trigger_name text;
BEGIN
    FOR trigger_name IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'auth.users'::regclass 
        AND tgname NOT LIKE 'RI_ConstraintTrigger%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON auth.users CASCADE';
    END LOOP;
END $$;