
-- Extension des tables existantes pour les nouvelles fonctionnalités
-- Ajouter des colonnes pour les nouvelles features à la table social_sharing_campaigns
ALTER TABLE public.social_sharing_campaigns 
ADD COLUMN IF NOT EXISTS media_library JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS automation_rules JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS audience_segments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS scheduling_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS performance_goals JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS compliance_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS brand_guidelines JSONB DEFAULT '{}'::jsonb;

-- Table pour les templates de campagne
CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_image TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les assets générés par IA
CREATE TABLE IF NOT EXISTS public.ai_generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID,
  asset_type TEXT CHECK (asset_type IN ('text', 'image', 'hashtags', 'variation')),
  prompt_used TEXT,
  generated_content JSONB NOT NULL,
  quality_score NUMERIC,
  approved BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les prédictions de performance
CREATE TABLE IF NOT EXISTS public.campaign_performance_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID,
  platform TEXT NOT NULL,
  predicted_reach INTEGER,
  predicted_engagement NUMERIC,
  predicted_clicks INTEGER,
  predicted_conversions INTEGER,
  confidence_score NUMERIC,
  prediction_factors JSONB DEFAULT '{}'::jsonb,
  actual_results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les audiences et segmentation
CREATE TABLE IF NOT EXISTS public.audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  segment_criteria JSONB NOT NULL,
  estimated_size INTEGER,
  platforms JSONB DEFAULT '[]'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les workflows d'automation
CREATE TABLE IF NOT EXISTS public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  last_executed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ajouter les contraintes de clés étrangères
ALTER TABLE public.ai_generated_assets 
ADD CONSTRAINT fk_ai_assets_campaign 
FOREIGN KEY (campaign_id) REFERENCES public.social_sharing_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_performance_predictions 
ADD CONSTRAINT fk_predictions_campaign 
FOREIGN KEY (campaign_id) REFERENCES public.social_sharing_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.automation_workflows 
ADD CONSTRAINT fk_workflows_campaign 
FOREIGN KEY (campaign_id) REFERENCES public.social_sharing_campaigns(id) ON DELETE CASCADE;

-- RLS Policies pour les nouvelles tables
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates access policy" ON public.campaign_templates
  USING (auth.uid() = owner_id OR is_public = true);

ALTER TABLE public.ai_generated_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI assets access policy" ON public.ai_generated_assets
  USING ((SELECT owner_id FROM public.social_sharing_campaigns WHERE id = campaign_id) = auth.uid());

ALTER TABLE public.campaign_performance_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Predictions access policy" ON public.campaign_performance_predictions
  USING ((SELECT owner_id FROM public.social_sharing_campaigns WHERE id = campaign_id) = auth.uid());

ALTER TABLE public.audience_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audience segments access policy" ON public.audience_segments
  USING (auth.uid() = owner_id);

ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Automation workflows access policy" ON public.automation_workflows
  USING (auth.uid() = owner_id);
