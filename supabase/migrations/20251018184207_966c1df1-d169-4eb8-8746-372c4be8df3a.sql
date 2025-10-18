-- PHASE 1: Tables de base pour Visual Creator

-- Table principale pour toutes les créations visuelles
CREATE TABLE IF NOT EXISTS public.visual_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'flyer', 'product_photo', 'combined_image', '3d_model', 'video')),
  title TEXT,
  prompt TEXT NOT NULL,
  style TEXT,
  format TEXT,
  image_url TEXT,
  storage_path TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_visual_creations_user_id ON public.visual_creations(user_id);
CREATE INDEX IF NOT EXISTS idx_visual_creations_type ON public.visual_creations(type);
CREATE INDEX IF NOT EXISTS idx_visual_creations_created_at ON public.visual_creations(created_at DESC);

-- Politiques RLS
ALTER TABLE public.visual_creations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own creations"
  ON public.visual_creations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own creations"
  ON public.visual_creations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creations"
  ON public.visual_creations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creations"
  ON public.visual_creations FOR DELETE
  USING (auth.uid() = user_id);

-- Table pour organiser les créations en galeries/collections
CREATE TABLE IF NOT EXISTS public.user_media_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('products', 'flyers', 'social', 'videos', '3d', 'general')),
  media_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les galeries
CREATE INDEX IF NOT EXISTS idx_user_media_gallery_user_id ON public.user_media_gallery(user_id);

-- Politiques RLS pour les galeries
ALTER TABLE public.user_media_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own galleries"
  ON public.user_media_gallery FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_visual_creations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_visual_creations_timestamp
BEFORE UPDATE ON public.visual_creations
FOR EACH ROW
EXECUTE FUNCTION public.update_visual_creations_updated_at();

CREATE TRIGGER update_user_media_gallery_timestamp
BEFORE UPDATE ON public.user_media_gallery
FOR EACH ROW
EXECUTE FUNCTION public.update_visual_creations_updated_at();