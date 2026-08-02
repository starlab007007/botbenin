-- Create storage bucket for knowledge base images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('knowledge_bases', 'knowledge_bases', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for knowledge base images
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge_bases' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge_bases');

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'knowledge_bases' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge_bases' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);;
