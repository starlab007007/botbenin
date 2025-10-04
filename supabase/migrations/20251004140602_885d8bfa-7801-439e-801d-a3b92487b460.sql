-- D'abord, supprimer les tables existantes pour repartir sur une base propre
DROP TABLE IF EXISTS public.qualification_campaign_sends CASCADE;
DROP TABLE IF EXISTS public.qualification_campaigns CASCADE;

-- Créer la table des campagnes de qualification
CREATE TABLE public.qualification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  qualification_type TEXT NOT NULL CHECK (qualification_type IN ('email', 'sms', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  bot_link TEXT,
  message_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_prospects INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Créer la table des envois de campagne
CREATE TABLE public.qualification_campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.qualification_campaigns(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'phone', 'whatsapp')),
  contact_value TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Activer RLS sur les deux tables
ALTER TABLE public.qualification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_campaign_sends ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour qualification_campaigns
CREATE POLICY "Users can manage their own campaigns"
  ON public.qualification_campaigns
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Politiques RLS pour qualification_campaign_sends
CREATE POLICY "Users can view their campaign sends"
  ON public.qualification_campaign_sends
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.qualification_campaigns
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert sends"
  ON public.qualification_campaign_sends
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update sends"
  ON public.qualification_campaign_sends
  FOR UPDATE
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX idx_qualification_campaigns_user ON public.qualification_campaigns(user_id);
CREATE INDEX idx_qualification_campaigns_status ON public.qualification_campaigns(status);
CREATE INDEX idx_campaign_sends_campaign ON public.qualification_campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_status ON public.qualification_campaign_sends(status);

-- Triggers pour updated_at (réutilise la fonction existante update_updated_at_column)
CREATE TRIGGER update_qualification_campaigns_updated_at
    BEFORE UPDATE ON public.qualification_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_sends_updated_at
    BEFORE UPDATE ON public.qualification_campaign_sends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();