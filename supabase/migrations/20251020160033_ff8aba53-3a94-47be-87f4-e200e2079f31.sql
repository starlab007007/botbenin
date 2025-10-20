-- Correction de la policy RLS pour permettre la sauvegarde des prospects
-- Problème: La policy exige user_has_permission() ce qui bloque les fonctions SECURITY DEFINER
-- Solution: Simplifier pour permettre l'insertion avec seulement user_id = auth.uid()

-- ============================================================================
-- Corriger la policy INSERT sur prospects
-- ============================================================================

DROP POLICY IF EXISTS "prospects_insert_own" ON public.prospects;

-- Nouvelle policy simplifiée qui fonctionne avec les fonctions SECURITY DEFINER
CREATE POLICY "prospects_insert_own" ON public.prospects
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    -- Suppression de AND user_has_permission() qui bloquait les insertions
    -- depuis la fonction transfer_local_businesses_to_prospects
  );

-- ============================================================================
-- Corriger aussi la policy INSERT sur local_businesses pour cohérence
-- ============================================================================

DROP POLICY IF EXISTS "local_businesses_insert_own" ON public.local_businesses;

CREATE POLICY "local_businesses_insert_own" ON public.local_businesses
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================================
-- Vérification: S'assurer que tous les users ont le rôle par défaut
-- ============================================================================

-- Fonction pour assigner automatiquement le rôle 'user' aux nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si l'utilisateur n'a pas déjà un rôle
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id
  ) THEN
    -- Assigner le rôle 'user' par défaut
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT NEW.id, r.id
    FROM public.roles r
    WHERE r.name = 'user'
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger si il n'existe pas déjà
DROP TRIGGER IF EXISTS assign_default_role_on_user_insert ON public.users;

CREATE TRIGGER assign_default_role_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_user_role();

-- Assigner le rôle 'user' à tous les utilisateurs existants qui n'en ont pas
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.users u
CROSS JOIN public.roles r
WHERE r.name = 'user'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
  )
ON CONFLICT DO NOTHING;