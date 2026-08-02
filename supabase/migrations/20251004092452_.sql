-- Supprimer les anciennes politiques RLS sur social_sharing_campaigns
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON public.social_sharing_campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.social_sharing_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns" ON public.social_sharing_campaigns;
DROP POLICY IF EXISTS "Users can update their campaigns" ON public.social_sharing_campaigns;
DROP POLICY IF EXISTS "Users can delete their campaigns" ON public.social_sharing_campaigns;

-- Créer des politiques RLS correctes pour social_sharing_campaigns
-- qui vérifient que l'utilisateur possède le bot_owner via la table bot_owners

-- Politique SELECT : Les utilisateurs peuvent voir leurs propres campagnes
CREATE POLICY "Users can view their campaigns via bot_owner"
ON public.social_sharing_campaigns
FOR SELECT
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM public.bot_owners 
    WHERE user_id = auth.uid()
  )
);

-- Politique INSERT : Les utilisateurs peuvent créer des campagnes pour leurs bot_owners
CREATE POLICY "Users can create campaigns via bot_owner"
ON public.social_sharing_campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id IN (
    SELECT id FROM public.bot_owners 
    WHERE user_id = auth.uid()
  )
  AND bot_id IN (
    SELECT b.id FROM public.bots b
    JOIN public.bot_owners bo ON b.owner_id = bo.id
    WHERE bo.user_id = auth.uid()
  )
);

-- Politique UPDATE : Les utilisateurs peuvent modifier leurs propres campagnes
CREATE POLICY "Users can update their campaigns via bot_owner"
ON public.social_sharing_campaigns
FOR UPDATE
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM public.bot_owners 
    WHERE user_id = auth.uid()
  )
);

-- Politique DELETE : Les utilisateurs peuvent supprimer leurs propres campagnes
CREATE POLICY "Users can delete their campaigns via bot_owner"
ON public.social_sharing_campaigns
FOR DELETE
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM public.bot_owners 
    WHERE user_id = auth.uid()
  )
);;
