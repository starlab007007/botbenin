
ALTER TABLE public.waouh_articles
  ADD COLUMN IF NOT EXISTS source_channel text DEFAULT 'waouh_app',
  ADD COLUMN IF NOT EXISTS contact_whatsapp text,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.waouh_partners(id);

ALTER TABLE public.waouh_buyer_profiles
  ADD COLUMN IF NOT EXISTS source_channel text DEFAULT 'waouh_app',
  ADD COLUMN IF NOT EXISTS contact_whatsapp text,
  ADD COLUMN IF NOT EXISTS reference_photos text[] DEFAULT '{}';

ALTER TABLE public.waouh_notifications
  ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_status text;

CREATE INDEX IF NOT EXISTS idx_waouh_articles_contact_whatsapp ON public.waouh_articles(contact_whatsapp);
CREATE INDEX IF NOT EXISTS idx_waouh_buyer_profiles_contact_whatsapp ON public.waouh_buyer_profiles(contact_whatsapp);

-- Backfill source_channel from origin where possible
UPDATE public.waouh_articles
SET source_channel = CASE
  WHEN origin ILIKE '%whatsapp%' THEN 'whatsapp'
  WHEN origin ILIKE '%radar%' THEN 'radar_ia'
  WHEN origin ILIKE '%partner%' THEN 'partner'
  ELSE COALESCE(source_channel, 'waouh_app')
END
WHERE source_channel IS NULL OR source_channel = 'waouh_app';

UPDATE public.waouh_buyer_profiles
SET source_channel = CASE
  WHEN origin ILIKE '%whatsapp%' THEN 'whatsapp'
  WHEN origin ILIKE '%radar%' THEN 'radar_ia'
  ELSE COALESCE(source_channel, 'waouh_app')
END
WHERE source_channel IS NULL OR source_channel = 'waouh_app';
;
