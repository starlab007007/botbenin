
-- Ajouter un champ preview_images à la table social_sharing_campaigns pour stocker jusqu'à 3 URLs d'images/vignettes associées à la campagne
ALTER TABLE public.social_sharing_campaigns
ADD COLUMN preview_images TEXT[] DEFAULT ARRAY[]::TEXT[];
;
