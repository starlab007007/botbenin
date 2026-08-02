
-- Corriger la contrainte NOT NULL sur bot_user_id dans enhanced_chat_sessions
-- pour permettre les sessions anonymes sans bot_user_id
ALTER TABLE public.enhanced_chat_sessions 
ALTER COLUMN bot_user_id DROP NOT NULL;

-- Ajouter un commentaire pour clarifier que bot_user_id peut être NULL pour les sessions anonymes
COMMENT ON COLUMN public.enhanced_chat_sessions.bot_user_id IS 'ID du bot user - peut être NULL pour les sessions anonymes en cours de création';
;
