-- Ajouter les colonnes manquantes à video_frames si elles n'existent pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'video_frames' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE video_frames ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'video_frames' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE video_frames ADD COLUMN storage_path text;
  END IF;
END $$;

-- Créer l'index sur user_id si il n'existe pas
CREATE INDEX IF NOT EXISTS idx_video_frames_user_id ON video_frames(user_id);

-- Supprimer les anciennes politiques RLS trop permissives
DROP POLICY IF EXISTS "Anyone can view video frames" ON video_frames;
DROP POLICY IF EXISTS "Authenticated users can insert video frames" ON video_frames;
DROP POLICY IF EXISTS "Authenticated users can update video frames" ON video_frames;
DROP POLICY IF EXISTS "Authenticated users can delete video frames" ON video_frames;

-- Créer les nouvelles politiques RLS basées sur user_id
CREATE POLICY "Users can view their own video frames"
ON video_frames FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video frames"
ON video_frames FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video frames"
ON video_frames FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video frames"
ON video_frames FOR DELETE
USING (auth.uid() = user_id);