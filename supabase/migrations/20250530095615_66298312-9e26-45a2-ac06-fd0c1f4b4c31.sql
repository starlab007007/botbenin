
-- Ajouter des colonnes manquantes pour les bots
ALTER TABLE bots ADD COLUMN IF NOT EXISTS chat_title TEXT DEFAULT 'Assistant IA';
ALTER TABLE bots ADD COLUMN IF NOT EXISTS chat_context TEXT DEFAULT 'general';
ALTER TABLE bots ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT true;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS public_chat_url TEXT;

-- Créer une fonction pour générer l'URL publique du chat
CREATE OR REPLACE FUNCTION generate_public_chat_url(bot_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN CONCAT('https://ia.bot.bj/chat/', bot_id);
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour les bots existants avec une URL publique
UPDATE bots 
SET public_chat_url = generate_public_chat_url(id) 
WHERE public_chat_url IS NULL;

-- Ajouter des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_chat_messages_bot_id ON chat_messages(bot_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_bot_users_bot_id ON bot_users(bot_id);

-- Créer une vue pour les statistiques des bots
CREATE OR REPLACE VIEW bot_stats AS
SELECT 
  b.id as bot_id,
  b.name as bot_name,
  b.owner_id,
  COUNT(DISTINCT bu.id) as total_users,
  COUNT(cm.id) as total_messages,
  COUNT(DISTINCT CASE WHEN bu.last_active >= CURRENT_DATE THEN bu.id END) as active_today,
  MAX(cm.created_at) as last_message_at
FROM bots b
LEFT JOIN bot_users bu ON b.id = bu.bot_id
LEFT JOIN chat_messages cm ON b.id = cm.bot_id
GROUP BY b.id, b.name, b.owner_id;

-- Fonction pour créer un utilisateur bot automatiquement
CREATE OR REPLACE FUNCTION create_bot_user_if_not_exists(
  p_bot_id UUID,
  p_session_id TEXT,
  p_user_name TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Chercher un utilisateur existant
  SELECT id INTO user_id
  FROM bot_users
  WHERE bot_id = p_bot_id AND session_id = p_session_id;
  
  -- Si pas trouvé, créer un nouvel utilisateur
  IF user_id IS NULL THEN
    INSERT INTO bot_users (bot_id, session_id, user_name, user_email, last_active)
    VALUES (p_bot_id, p_session_id, p_user_name, p_user_email, NOW())
    RETURNING id INTO user_id;
  ELSE
    -- Mettre à jour l'activité
    UPDATE bot_users 
    SET last_active = NOW(),
        user_name = COALESCE(p_user_name, user_name),
        user_email = COALESCE(p_user_email, user_email)
    WHERE id = user_id;
  END IF;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
