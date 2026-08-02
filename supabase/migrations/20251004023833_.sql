-- Ajouter les colonnes manquantes à la table prospect_databases
ALTER TABLE public.prospect_databases 
ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'Standard',
ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS total_records INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;;
