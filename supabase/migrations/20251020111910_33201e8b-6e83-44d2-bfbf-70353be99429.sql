-- 1. Supprimer toutes les politiques RLS existantes sur video_frames
DROP POLICY IF EXISTS "Users can view their own frames" ON video_frames;
DROP POLICY IF EXISTS "Users can view their own video frames" ON video_frames;
DROP POLICY IF EXISTS "Users can insert their own frames" ON video_frames;
DROP POLICY IF EXISTS "Users can insert their own video frames" ON video_frames;
DROP POLICY IF EXISTS "Users can update their own frames" ON video_frames;
DROP POLICY IF EXISTS "Users can update their own video frames" ON video_frames;
DROP POLICY IF EXISTS "Users can delete their own frames" ON video_frames;
DROP POLICY IF EXISTS "Users can delete their own video frames" ON video_frames;

-- 2. Mettre à jour les lignes existantes avec user_id NULL
-- Utiliser le premier bot_owner disponible comme fallback
UPDATE video_frames 
SET user_id = (SELECT user_id FROM bot_owners LIMIT 1)
WHERE user_id IS NULL;

-- 3. Rendre user_id NOT NULL
ALTER TABLE video_frames 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Créer les nouvelles politiques RLS (une seule version de chaque)
CREATE POLICY "authenticated_users_select_own_frames"
ON video_frames FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_insert_own_frames"
ON video_frames FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_update_own_frames"
ON video_frames FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_delete_own_frames"
ON video_frames FOR DELETE
TO authenticated
USING (auth.uid() = user_id);