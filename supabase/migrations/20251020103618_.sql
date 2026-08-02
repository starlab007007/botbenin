-- Créer le bucket video-assets s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-assets',
  'video-assets',
  true,  -- Public pour que les URLs soient accessibles
  52428800,  -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Créer les politiques pour le bucket video-assets
CREATE POLICY "Users can upload their own video assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'video-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own video assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'video-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own video assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'video-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own video assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'video-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view video assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-assets');;
