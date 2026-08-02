
-- Table des assets médias (images, vidéos, carrousels, stories)
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  owner_id UUID NOT NULL, -- référence à bot_owners
  type TEXT NOT NULL CHECK (type IN ('image','video','carousel','story')),
  original_url TEXT NOT NULL,
  storage_path TEXT, -- chemin dans Supabase Storage
  platform_optimized_versions JSONB DEFAULT '[]'::jsonb, -- ex: {platform, url, width, height}
  ai_generated BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des variations de messages générés (par IA ou manuellement)
CREATE TABLE public.content_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  media_asset_id UUID, -- optionnel, si variation liée à un asset
  platform TEXT,
  content TEXT NOT NULL,
  hashtags JSONB DEFAULT '[]'::jsonb,
  predicted_performance NUMERIC,
  a_b_test_variant TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour la planification et le résultat des posts
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  variation_id UUID, -- FK vers la variation de message utilisé
  media_asset_id UUID, -- FK optionnelle : le média utilisé
  owner_id UUID NOT NULL,
  platform TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  analytics JSONB DEFAULT '{}'::jsonb, -- stats par plateforme
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des prédictions de performance
CREATE TABLE public.performance_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  variation_id UUID,
  scheduled_post_id UUID,
  owner_id UUID NOT NULL,
  predicted_ctr NUMERIC,
  predicted_reach INTEGER,
  predicted_engagement NUMERIC,
  prediction_details JSONB DEFAULT '{}'::jsonb, -- pour IA/explications
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices & FOREIGN KEYS (relations)
ALTER TABLE public.media_assets ADD CONSTRAINT fk_media_campaign FOREIGN KEY (campaign_id) REFERENCES public.social_sharing_campaigns(id);
ALTER TABLE public.content_variations ADD CONSTRAINT fk_variation_campaign FOREIGN KEY (campaign_id) REFERENCES public.social_sharing_campaigns(id);
ALTER TABLE public.content_variations ADD CONSTRAINT fk_variation_media FOREIGN KEY (media_asset_id) REFERENCES public.media_assets(id);
ALTER TABLE public.scheduled_posts ADD CONSTRAINT fk_post_campaign FOREIGN KEY (campaign_id) REFERENCES public.social_sharing_campaigns(id);
ALTER TABLE public.scheduled_posts ADD CONSTRAINT fk_post_variation FOREIGN KEY (variation_id) REFERENCES public.content_variations(id);
ALTER TABLE public.scheduled_posts ADD CONSTRAINT fk_post_media FOREIGN KEY (media_asset_id) REFERENCES public.media_assets(id);
ALTER TABLE public.performance_predictions ADD CONSTRAINT fk_pred_campaign FOREIGN KEY (campaign_id) REFERENCES public.social_sharing_campaigns(id);
ALTER TABLE public.performance_predictions ADD CONSTRAINT fk_pred_variation FOREIGN KEY (variation_id) REFERENCES public.content_variations(id);
ALTER TABLE public.performance_predictions ADD CONSTRAINT fk_pred_post FOREIGN KEY (scheduled_post_id) REFERENCES public.scheduled_posts(id);

-- RLS de sécurité : accès limité par owner_id ou au moins par campaign
-- (à définir précisément en fonction de l’usage, ci-dessous un exemple très restrictif à personnaliser après validation)
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY "Accès assets propriétaire" ON public.media_assets
  USING (auth.uid() = owner_id);

ALTER TABLE public.content_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_variations FORCE ROW LEVEL SECURITY;
CREATE POLICY "Accès variations propriétaire" ON public.content_variations
  USING ((SELECT owner_id FROM public.social_sharing_campaigns WHERE id = campaign_id) = auth.uid());

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts FORCE ROW LEVEL SECURITY;
CREATE POLICY "Accès posts propriétaire" ON public.scheduled_posts
  USING (auth.uid() = owner_id);

ALTER TABLE public.performance_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_predictions FORCE ROW LEVEL SECURITY;
CREATE POLICY "Accès prédictions propriétaire" ON public.performance_predictions
  USING (auth.uid() = owner_id);

;
