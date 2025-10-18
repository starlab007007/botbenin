-- Créer table pour les pistes audio générées
CREATE TABLE IF NOT EXISTS public.video_audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL,
  frame_type TEXT CHECK (frame_type IN ('hero', 'demo', 'result', 'cta', 'summary')),
  audio_url TEXT NOT NULL,
  audio_duration NUMERIC(5,2) NOT NULL,
  audio_size_bytes BIGINT,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  text_content TEXT NOT NULL,
  language TEXT DEFAULT 'fr-FR',
  speed NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index pour recherche rapide
CREATE INDEX idx_video_audio_tracks_video_id ON public.video_audio_tracks(video_id);
CREATE INDEX idx_video_audio_tracks_user_id ON public.video_audio_tracks(user_id);

-- RLS Policies
ALTER TABLE public.video_audio_tracks ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres pistes audio
CREATE POLICY "Users can view own audio tracks"
  ON public.video_audio_tracks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer leurs pistes audio
CREATE POLICY "Users can create audio tracks"
  ON public.video_audio_tracks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs pistes audio
CREATE POLICY "Users can delete own audio tracks"
  ON public.video_audio_tracks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Créer bucket de stockage pour les audios si pas existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-audio-assets', 'video-audio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de stockage pour les audios
CREATE POLICY "Users can upload audio files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'video-audio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view audio files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'video-audio-assets');

CREATE POLICY "Users can update own audio files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'video-audio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own audio files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'video-audio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);