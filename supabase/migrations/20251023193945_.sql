-- =====================================================
-- FIX: Correction des foreign keys pour l'inscription
-- =====================================================

-- 1. Corriger user_roles pour pointer vers auth.users
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Corriger bot_owners pour pointer vers auth.users
ALTER TABLE public.bot_owners DROP CONSTRAINT IF EXISTS bot_owners_user_id_fkey;
ALTER TABLE public.bot_owners 
ADD CONSTRAINT bot_owners_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Supprimer la table public.users si elle existe
DROP TABLE IF EXISTS public.users CASCADE;

-- 4. Fonction unifiée d'inscription
CREATE OR REPLACE FUNCTION public.handle_complete_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_id uuid;
  whatsapp_perm_id uuid;
BEGIN
  -- Créer le bot_owner
  INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
  VALUES (NEW.id, 'free', 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- Assigner le rôle 'user'
  SELECT id INTO user_role_id
  FROM public.roles
  WHERE name = 'user'
  LIMIT 1;

  IF user_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, user_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Accorder permission WhatsApp si elle existe
  SELECT id INTO whatsapp_perm_id
  FROM public.permissions
  WHERE name = 'whatsapp.use'
  LIMIT 1;

  IF whatsapp_perm_id IS NOT NULL THEN
    INSERT INTO public.user_permissions (user_id, permission_id)
    VALUES (NEW.id, whatsapp_perm_id)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Nettoyer les anciens triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_grant_whatsapp ON auth.users;

-- 6. Créer le trigger unifié
CREATE TRIGGER on_auth_user_complete_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_complete_user_signup();;
