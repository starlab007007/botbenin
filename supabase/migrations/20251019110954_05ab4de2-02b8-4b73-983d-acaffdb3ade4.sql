-- Créer le bucket media avec INSERT ... ON CONFLICT
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  52428800, -- 50MB limit
  ARRAY['video/webm', 'video/mp4', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['video/webm', 'video/mp4', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];