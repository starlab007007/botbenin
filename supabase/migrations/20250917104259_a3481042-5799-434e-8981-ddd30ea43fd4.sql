-- Ajouter les colonnes nécessaires pour les agents IA personnalisés
ALTER TABLE public.bots 
ADD COLUMN elevenlabs_agent_id TEXT,
ADD COLUMN widget_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN is_personal_agent BOOLEAN DEFAULT false;

-- Index pour optimiser les requêtes
CREATE INDEX idx_bots_elevenlabs_agent_id ON public.bots(elevenlabs_agent_id) WHERE elevenlabs_agent_id IS NOT NULL;
CREATE INDEX idx_bots_personal_agent ON public.bots(is_personal_agent, owner_id) WHERE is_personal_agent = true;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN public.bots.elevenlabs_agent_id IS 'ID de l''agent ElevenLabs pour les widgets personnalisés';
COMMENT ON COLUMN public.bots.widget_config IS 'Configuration JSON du widget ElevenLabs (textes, variant, etc.)';
COMMENT ON COLUMN public.bots.is_personal_agent IS 'Indique si ce bot est un agent IA personnel créé par l''utilisateur';