-- Créer la table video_frames pour stocker les frames générées
CREATE TABLE IF NOT EXISTS video_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  frame_type text NOT NULL CHECK (frame_type IN ('hero', 'demo', 'result', 'cta')),
  image_url text NOT NULL,
  prompt text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(video_id, frame_type)
);

-- Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_video_frames_video_id ON video_frames(video_id);
CREATE INDEX IF NOT EXISTS idx_video_frames_created_at ON video_frames(created_at DESC);

-- RLS
ALTER TABLE video_frames ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (pour afficher dans l'app)
CREATE POLICY "Anyone can view video frames"
ON video_frames FOR SELECT
USING (true);

-- Les utilisateurs authentifiés peuvent créer
CREATE POLICY "Authenticated users can insert video frames"
ON video_frames FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Les utilisateurs authentifiés peuvent mettre à jour
CREATE POLICY "Authenticated users can update video frames"
ON video_frames FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Les utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Authenticated users can delete video frames"
ON video_frames FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_video_frames_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la mise à jour automatique
DROP TRIGGER IF EXISTS update_video_frames_updated_at_trigger ON video_frames;
CREATE TRIGGER update_video_frames_updated_at_trigger
BEFORE UPDATE ON video_frames
FOR EACH ROW
EXECUTE FUNCTION update_video_frames_updated_at();