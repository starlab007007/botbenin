-- Public storage bucket for WAOUH media (photos sent via WhatsApp / Web chat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('waouh-media', 'waouh-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read for waouh-media
DROP POLICY IF EXISTS "WAOUH media public read" ON storage.objects;
CREATE POLICY "WAOUH media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'waouh-media');

-- Service role / authenticated uploads
DROP POLICY IF EXISTS "WAOUH media insert" ON storage.objects;
CREATE POLICY "WAOUH media insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'waouh-media');