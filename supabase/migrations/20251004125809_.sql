-- Table pour les campagnes de qualification
CREATE TABLE IF NOT EXISTS public.qualification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  bot_name TEXT NOT NULL,
  bot_link TEXT NOT NULL,
  message TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  target_emails TEXT[] NOT NULL DEFAULT '{}',
  target_phones TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  launched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_responses INTEGER NOT NULL DEFAULT 0,
  total_qualified INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(3,1) DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Table pour les résultats de qualification
CREATE TABLE IF NOT EXISTS public.qualification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.qualification_campaigns(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'partial', 'no-response', 'error')),
  score NUMERIC(3,1),
  responses JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.qualification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qualification_campaigns
CREATE POLICY "Users can view their own qualification campaigns"
  ON public.qualification_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own qualification campaigns"
  ON public.qualification_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own qualification campaigns"
  ON public.qualification_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own qualification campaigns"
  ON public.qualification_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for qualification_results
CREATE POLICY "Users can view results of their campaigns"
  ON public.qualification_results FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.qualification_campaigns 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create results for their campaigns"
  ON public.qualification_results FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.qualification_campaigns 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update results of their campaigns"
  ON public.qualification_results FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM public.qualification_campaigns 
      WHERE user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qualification_campaigns_user_id ON public.qualification_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_qualification_campaigns_status ON public.qualification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_qualification_results_campaign_id ON public.qualification_results(campaign_id);
CREATE INDEX IF NOT EXISTS idx_qualification_results_prospect_id ON public.qualification_results(prospect_id);
CREATE INDEX IF NOT EXISTS idx_qualification_results_status ON public.qualification_results(status);;
