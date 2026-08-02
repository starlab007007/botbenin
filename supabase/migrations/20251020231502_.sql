-- ============================================================================
-- Création de la table knowledge_bases pour les bases de connaissances sectorielles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informations de base
  name TEXT NOT NULL,
  sector TEXT NOT NULL, -- "restaurant", "hotel", "real_estate", "ecommerce", "training", "university", "clinic"
  template_id TEXT NOT NULL,
  description TEXT,
  
  -- Données structurées par table
  data JSONB NOT NULL DEFAULT '{}',
  -- Structure: { "menu": [...], "commandes": [...], "chambres": [...] }
  
  -- Informations structurelles (FAQ, contact, horaires)
  structural_info JSONB NOT NULL DEFAULT '{}',
  -- Structure: { "horaires_semaine": "Lun-Ven: 11h-23h", "telephone": "+229 XX XX XX XX", ... }
  
  -- Statut et métadonnées
  is_active BOOLEAN DEFAULT true,
  completion_percentage INTEGER DEFAULT 0,
  last_trained_at TIMESTAMP WITH TIME ZONE,
  
  -- Association avec un bot (optionnel)
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Index pour améliorer les performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user_id ON public.knowledge_bases(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_sector ON public.knowledge_bases(sector);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_bot_id ON public.knowledge_bases(bot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_is_active ON public.knowledge_bases(is_active);

-- ============================================================================
-- Fonction pour mettre à jour automatiquement updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_knowledge_bases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_bases_updated_at
  BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_bases_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres bases de connaissances
CREATE POLICY "knowledge_bases_select_own" ON public.knowledge_bases
  FOR SELECT
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leurs propres bases de connaissances
CREATE POLICY "knowledge_bases_insert_own" ON public.knowledge_bases
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent modifier leurs propres bases de connaissances
CREATE POLICY "knowledge_bases_update_own" ON public.knowledge_bases
  FOR UPDATE
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent supprimer leurs propres bases de connaissances
CREATE POLICY "knowledge_bases_delete_own" ON public.knowledge_bases
  FOR DELETE
  USING (user_id = auth.uid());;
