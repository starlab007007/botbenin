-- Add new columns to generated_videos for audio and export features
ALTER TABLE generated_videos 
  ADD COLUMN IF NOT EXISTS description_text TEXT;

ALTER TABLE generated_videos 
  ADD COLUMN IF NOT EXISTS description_audio_url TEXT;

ALTER TABLE generated_videos 
  ADD COLUMN IF NOT EXISTS audio_voice_id TEXT DEFAULT 'EXAVITQu4vr4xnSDxMaL';

ALTER TABLE generated_videos 
  ADD COLUMN IF NOT EXISTS export_format TEXT DEFAULT 'mp4';

ALTER TABLE generated_videos 
  ADD COLUMN IF NOT EXISTS export_resolution TEXT DEFAULT '1080p';

ALTER TABLE generated_videos 
  ADD COLUMN IF NOT EXISTS optimized_for_platform TEXT DEFAULT 'tiktok';

ALTER TABLE generated_videos 
  ADD COLUMN IF NOT EXISTS share_urls JSONB DEFAULT '{}'::jsonb;

-- Create video_descriptions table for multiple script variations
CREATE TABLE IF NOT EXISTS video_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES generated_videos(id) ON DELETE CASCADE,
  script_text TEXT NOT NULL,
  script_length TEXT CHECK (script_length IN ('short', 'medium', 'long')),
  audio_url TEXT,
  audio_duration NUMERIC,
  voice_id TEXT DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_descriptions_video_id ON video_descriptions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_descriptions_active ON video_descriptions(video_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_generated_videos_with_audio ON generated_videos(id) WHERE description_audio_url IS NOT NULL;

-- Enable RLS on video_descriptions
ALTER TABLE video_descriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_descriptions
CREATE POLICY "Users can view their video descriptions"
  ON video_descriptions FOR SELECT
  USING (
    video_id IN (
      SELECT gv.id FROM generated_videos gv
      WHERE gv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their video descriptions"
  ON video_descriptions FOR INSERT
  WITH CHECK (
    video_id IN (
      SELECT gv.id FROM generated_videos gv
      WHERE gv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their video descriptions"
  ON video_descriptions FOR UPDATE
  USING (
    video_id IN (
      SELECT gv.id FROM generated_videos gv
      WHERE gv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their video descriptions"
  ON video_descriptions FOR DELETE
  USING (
    video_id IN (
      SELECT gv.id FROM generated_videos gv
      WHERE gv.user_id = auth.uid()
    )
  );;
