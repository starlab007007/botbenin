-- Create video_frames table to store generated frames
CREATE TABLE IF NOT EXISTS video_frames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id TEXT NOT NULL,
  frame_type TEXT NOT NULL CHECK (frame_type IN ('hero', 'demo', 'result', 'cta')),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(video_id, frame_type, user_id)
);

-- Create generated_videos table to store final videos
CREATE TABLE IF NOT EXISTS generated_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_url TEXT,
  duration DECIMAL DEFAULT 10.0,
  format TEXT DEFAULT 'mp4',
  size_bytes BIGINT,
  template_id TEXT NOT NULL,
  music_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_video_frames_video_id ON video_frames(video_id);
CREATE INDEX idx_video_frames_user_id ON video_frames(user_id);
CREATE INDEX idx_generated_videos_video_id ON generated_videos(video_id);
CREATE INDEX idx_generated_videos_user_id ON generated_videos(user_id);

-- Enable RLS
ALTER TABLE video_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_frames
CREATE POLICY "Users can view their own frames"
  ON video_frames FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own frames"
  ON video_frames FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own frames"
  ON video_frames FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own frames"
  ON video_frames FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for generated_videos
CREATE POLICY "Users can view their own videos"
  ON generated_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
  ON generated_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON generated_videos FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for video assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-assets', 'video-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their video assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'video-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view video assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-assets');

CREATE POLICY "Users can update their video assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'video-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their video assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'video-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);;
