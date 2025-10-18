-- Ajouter les colonnes pour les textes promotionnels dans video_frames
ALTER TABLE video_frames
ADD COLUMN IF NOT EXISTS promotional_text TEXT,
ADD COLUMN IF NOT EXISTS promotional_text_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promotional_style TEXT DEFAULT 'epic',
ADD COLUMN IF NOT EXISTS promotional_text_word_count INTEGER,
ADD COLUMN IF NOT EXISTS promotional_text_char_count INTEGER;

-- Ajouter les colonnes pour le résumé promotionnel dans generated_videos
ALTER TABLE generated_videos
ADD COLUMN IF NOT EXISTS promotional_summary TEXT,
ADD COLUMN IF NOT EXISTS promotional_summary_generated_at TIMESTAMP WITH TIME ZONE;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_video_frames_promotional ON video_frames(promotional_text) WHERE promotional_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_videos_promotional ON generated_videos(promotional_summary) WHERE promotional_summary IS NOT NULL;