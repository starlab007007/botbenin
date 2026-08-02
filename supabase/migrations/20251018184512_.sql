-- Créer le bucket Storage pour les assets visuels
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visual-assets',
  'visual-assets',
  true,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Politiques de sécurité pour le bucket visual-assets
CREATE POLICY "Users can upload their own visual assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visual-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own visual assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visual-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own visual assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'visual-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own visual assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visual-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Public access pour les assets publiés
CREATE POLICY "Public can view published visual assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'visual-assets');;
