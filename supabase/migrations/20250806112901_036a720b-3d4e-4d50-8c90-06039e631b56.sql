-- Créer les politiques RLS pour social_sharing_campaigns

-- Permettre aux utilisateurs de voir leurs propres campagnes
CREATE POLICY "Users can view their own campaigns" 
ON public.social_sharing_campaigns 
FOR SELECT 
USING (auth.uid() = owner_id);

-- Permettre aux utilisateurs de créer leurs propres campagnes
CREATE POLICY "Users can create their own campaigns" 
ON public.social_sharing_campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Permettre aux utilisateurs de modifier leurs propres campagnes
CREATE POLICY "Users can update their own campaigns" 
ON public.social_sharing_campaigns 
FOR UPDATE 
USING (auth.uid() = owner_id);

-- Permettre aux utilisateurs de supprimer leurs propres campagnes
CREATE POLICY "Users can delete their own campaigns" 
ON public.social_sharing_campaigns 
FOR DELETE 
USING (auth.uid() = owner_id);