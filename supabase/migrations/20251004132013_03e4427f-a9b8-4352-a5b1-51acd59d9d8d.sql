-- Table pour suivre les envois de qualification individuels
CREATE TABLE IF NOT EXISTS public.qualification_campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.qualification_campaigns(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'phone', 'whatsapp')),
  contact_value TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'delivered')),
  error_message TEXT,
  message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour rechercher rapidement les envois par campagne
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_id ON public.qualification_campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON public.qualification_campaign_sends(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_contact ON public.qualification_campaign_sends(contact_value);

-- RLS policies
ALTER TABLE public.qualification_campaign_sends ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les envois de leurs propres campagnes
CREATE POLICY "Users can view their campaign sends"
  ON public.qualification_campaign_sends
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.qualification_campaigns
      WHERE user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent mettre à jour les envois de leurs campagnes
CREATE POLICY "Users can update their campaign sends"
  ON public.qualification_campaign_sends
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM public.qualification_campaigns
      WHERE user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent insérer des envois pour leurs campagnes
CREATE POLICY "Users can insert campaign sends"
  ON public.qualification_campaign_sends
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.qualification_campaigns
      WHERE user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent supprimer les envois de leurs campagnes
CREATE POLICY "Users can delete their campaign sends"
  ON public.qualification_campaign_sends
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM public.qualification_campaigns
      WHERE user_id = auth.uid()
    )
  );