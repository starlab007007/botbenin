ALTER TABLE public.waouh_diffusion_approvals
  ADD COLUMN IF NOT EXISTS audience_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS excluded_phones     TEXT[]  NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_wda_recipients_gin
  ON public.waouh_diffusion_approvals USING gin (audience_recipients);