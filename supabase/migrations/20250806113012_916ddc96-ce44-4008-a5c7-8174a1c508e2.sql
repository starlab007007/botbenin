-- Supprimer l'ancienne politique conflictuelle
DROP POLICY IF EXISTS "Owners can manage their social campaigns" ON public.social_sharing_campaigns;