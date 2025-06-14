
-- Ajouter un champ media_urls à la table scheduled_posts pour stocker jusqu'à 3 URLs d'images
ALTER TABLE public.scheduled_posts
ADD COLUMN media_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
