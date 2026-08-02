-- Add Shotstack support columns to generated_videos table
ALTER TABLE generated_videos 
ADD COLUMN IF NOT EXISTS use_shotstack BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shotstack_render_id TEXT,
ADD COLUMN IF NOT EXISTS rendered_video_url TEXT,
ADD COLUMN IF NOT EXISTS render_status TEXT DEFAULT 'pending' CHECK (render_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_videos_render_status ON generated_videos(render_status);
CREATE INDEX IF NOT EXISTS idx_generated_videos_shotstack_render_id ON generated_videos(shotstack_render_id);;
