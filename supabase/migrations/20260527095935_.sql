
-- =========================================
-- WhatsApp Diffusion v2 — Phase A foundations
-- =========================================

-- Contacts
CREATE TABLE public.wa_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_e164 text NOT NULL,
  phone_8 text,
  phone_10 text,
  display_name text,
  tags text[] NOT NULL DEFAULT '{}',
  is_whatsapp boolean,
  opt_out boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual',
  last_validated_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone_e164)
);
CREATE INDEX idx_wa_contacts_user ON public.wa_contacts(user_id);
CREATE INDEX idx_wa_contacts_phone8 ON public.wa_contacts(user_id, phone_8);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_contacts TO authenticated;
GRANT ALL ON public.wa_contacts TO service_role;
ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts select" ON public.wa_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own contacts insert" ON public.wa_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own contacts update" ON public.wa_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own contacts delete" ON public.wa_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lists
CREATE TABLE public.wa_contact_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#25D366',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_contact_lists TO authenticated;
GRANT ALL ON public.wa_contact_lists TO service_role;
ALTER TABLE public.wa_contact_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lists all" ON public.wa_contact_lists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.wa_contact_list_members (
  list_id uuid NOT NULL REFERENCES public.wa_contact_lists(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_contact_list_members TO authenticated;
GRANT ALL ON public.wa_contact_list_members TO service_role;
ALTER TABLE public.wa_contact_list_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "list members select" ON public.wa_contact_list_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wa_contact_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));
CREATE POLICY "list members insert" ON public.wa_contact_list_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.wa_contact_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));
CREATE POLICY "list members delete" ON public.wa_contact_list_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wa_contact_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));

-- Campaigns
CREATE TABLE public.wa_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  body text NOT NULL DEFAULT '',
  media_url text,
  media_mime text,
  session_id uuid,
  list_ids uuid[] NOT NULL DEFAULT '{}',
  extra_contact_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  throttle_per_hour int NOT NULL DEFAULT 30,
  min_delay_s int NOT NULL DEFAULT 25,
  max_delay_s int NOT NULL DEFAULT 75,
  active_hours_start time NOT NULL DEFAULT '08:00',
  active_hours_end time NOT NULL DEFAULT '20:00',
  timezone text NOT NULL DEFAULT 'Africa/Porto-Novo',
  ai_variation boolean NOT NULL DEFAULT true,
  ai_prompt text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_campaigns_user ON public.wa_campaigns(user_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_campaigns TO authenticated;
GRANT ALL ON public.wa_campaigns TO service_role;
ALTER TABLE public.wa_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own campaigns all" ON public.wa_campaigns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.wa_campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.wa_campaigns(id) ON DELETE CASCADE,
  variant_index int NOT NULL DEFAULT 0,
  body text NOT NULL,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_campaign_messages TO authenticated;
GRANT ALL ON public.wa_campaign_messages TO service_role;
ALTER TABLE public.wa_campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants own" ON public.wa_campaign_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wa_campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wa_campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));

-- Send jobs
CREATE TABLE public.wa_send_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.wa_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contact_id uuid REFERENCES public.wa_contacts(id) ON DELETE SET NULL,
  to_phone text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued',
  attempt int NOT NULL DEFAULT 0,
  last_error text,
  waha_message_id text,
  rendered_body text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_jobs_due ON public.wa_send_jobs(status, scheduled_at);
CREATE INDEX idx_wa_jobs_campaign ON public.wa_send_jobs(campaign_id, status);
CREATE INDEX idx_wa_jobs_user ON public.wa_send_jobs(user_id);
GRANT SELECT ON public.wa_send_jobs TO authenticated;
GRANT ALL ON public.wa_send_jobs TO service_role;
ALTER TABLE public.wa_send_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jobs select" ON public.wa_send_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Rate buckets (worker only)
CREATE TABLE public.wa_rate_buckets (
  session_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, window_start)
);
GRANT ALL ON public.wa_rate_buckets TO service_role;
ALTER TABLE public.wa_rate_buckets ENABLE ROW LEVEL SECURITY;

-- Events log
CREATE TABLE public.wa_campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.wa_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_events_campaign ON public.wa_campaign_events(campaign_id, created_at DESC);
GRANT SELECT ON public.wa_campaign_events TO authenticated;
GRANT ALL ON public.wa_campaign_events TO service_role;
ALTER TABLE public.wa_campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events own select" ON public.wa_campaign_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.wa_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_wa_contacts_upd BEFORE UPDATE ON public.wa_contacts FOR EACH ROW EXECUTE FUNCTION public.wa_set_updated_at();
CREATE TRIGGER trg_wa_lists_upd BEFORE UPDATE ON public.wa_contact_lists FOR EACH ROW EXECUTE FUNCTION public.wa_set_updated_at();
CREATE TRIGGER trg_wa_campaigns_upd BEFORE UPDATE ON public.wa_campaigns FOR EACH ROW EXECUTE FUNCTION public.wa_set_updated_at();
CREATE TRIGGER trg_wa_jobs_upd BEFORE UPDATE ON public.wa_send_jobs FOR EACH ROW EXECUTE FUNCTION public.wa_set_updated_at();

-- Storage bucket for campaign media (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('wa-campaign-media','wa-campaign-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "wa media read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'wa-campaign-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "wa media insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wa-campaign-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "wa media delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'wa-campaign-media' AND auth.uid()::text = (storage.foldername(name))[1]);
;
