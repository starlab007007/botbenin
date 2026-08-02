-- Table pour stocker les vidéos finales assemblées
CREATE TABLE IF NOT EXISTS public.final_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merged_audio_url TEXT,
  merged_audio_duration NUMERIC,
  final_video_url TEXT,
  final_video_size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.final_videos ENABLE ROW LEVEL SECURITY;

-- Users can manage their own final videos
CREATE POLICY "Users can manage their own final videos"
  ON public.final_videos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);;
