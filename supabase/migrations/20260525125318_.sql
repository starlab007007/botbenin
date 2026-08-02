ALTER TABLE public.waouh_negotiations
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_shared_at TIMESTAMPTZ;;
