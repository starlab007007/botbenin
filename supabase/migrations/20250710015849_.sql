-- CORRECTION DÉFINITIVE DES PROBLÈMES DE SAUVEGARDE DE BOTS (Version 3 - Corrigée)

-- 1. Corriger les politiques RLS problématiques qui causent les erreurs "op ANY/ALL (array)"
-- Supprimer l'ancienne politique désactivée qui peut causer des conflits
DROP POLICY IF EXISTS "Owners can manage their bots_DISABLED" ON public.bots;

-- 2. Créer une fonction pour auto-créer le bot_owner si nécessaire
CREATE OR REPLACE FUNCTION public.ensure_bot_owner()
RETURNS TRIGGER AS $$
DECLARE
    owner_record RECORD;
BEGIN
    -- Vérifier si l'utilisateur a déjà un enregistrement bot_owner
    SELECT * INTO owner_record FROM public.bot_owners WHERE user_id = auth.uid();
    
    IF owner_record IS NULL THEN
        -- Créer automatiquement un bot_owner pour l'utilisateur
        INSERT INTO public.bot_owners (user_id, max_bots, subscription_plan)
        VALUES (auth.uid(), 10, 'free');
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer un trigger pour auto-créer bot_owner lors de l'authentification
DROP TRIGGER IF EXISTS auto_create_bot_owner ON auth.users;
CREATE TRIGGER auto_create_bot_owner
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_bot_owner();

-- 4. Assurer que la contrainte UNIQUE existe pour éviter les doublons
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bot_owners_user_id_unique'
    ) THEN
        ALTER TABLE public.bot_owners 
        ADD CONSTRAINT bot_owners_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- 5. Assurer que tous les utilisateurs existants ont un bot_owner (maintenant avec contrainte unique)
INSERT INTO public.bot_owners (user_id, max_bots, subscription_plan)
SELECT u.id, 10, 'free'
FROM auth.users u
LEFT JOIN public.bot_owners bo ON bo.user_id = u.id
WHERE bo.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 6. Optimiser les politiques RLS pour éviter les conflits
-- Simplifier la politique INSERT pour les bots
DROP POLICY IF EXISTS "Users can create bots" ON public.bots;
CREATE POLICY "Users can create bots" ON public.bots
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id IN (SELECT id FROM public.bot_owners WHERE user_id = auth.uid())
    );

-- 7. Mise à jour de tous les max_bots existants pour assurer la cohérence
UPDATE public.bot_owners SET max_bots = 10 WHERE max_bots != 10;

-- 8. Fonction utilitaire pour diagnostiquer les problèmes de bot
CREATE OR REPLACE FUNCTION public.debug_bot_creation(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
    user_id UUID,
    has_bot_owner BOOLEAN,
    bot_owner_id UUID,
    max_bots INTEGER,
    current_bot_count BIGINT,
    can_create_bot BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        user_uuid as user_id,
        (bo.id IS NOT NULL) as has_bot_owner,
        bo.id as bot_owner_id,
        COALESCE(bo.max_bots, 0) as max_bots,
        COALESCE(bot_count.count, 0) as current_bot_count,
        (COALESCE(bo.max_bots, 0) > COALESCE(bot_count.count, 0)) as can_create_bot
    FROM (SELECT user_uuid) u
    LEFT JOIN public.bot_owners bo ON bo.user_id = user_uuid
    LEFT JOIN (
        SELECT owner_id, COUNT(*) as count 
        FROM public.bots 
        GROUP BY owner_id
    ) bot_count ON bot_count.owner_id = bo.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
