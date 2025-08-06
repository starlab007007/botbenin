-- Créer les tables manquantes pour les prospects
-- Table prospect_databases pour organiser les prospects
CREATE TABLE IF NOT EXISTS public.prospect_databases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Table prospects pour stocker les données des prospects
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  database_id UUID NOT NULL REFERENCES public.prospect_databases(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table local_businesses pour stocker les résultats de recherche locale
CREATE TABLE IF NOT EXISTS public.local_businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_session_id TEXT,
  name TEXT NOT NULL,
  company_name TEXT,
  category TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  rating NUMERIC,
  review_count INTEGER,
  hours TEXT,
  price_range TEXT,
  distance TEXT,
  coordinates JSONB,
  job_title TEXT,
  linkedin_url TEXT,
  industry TEXT,
  company_size TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.prospect_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_businesses ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour prospect_databases
CREATE POLICY "Users can manage their own prospect databases" 
ON public.prospect_databases 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour prospects
CREATE POLICY "Users can manage their own prospects" 
ON public.prospects 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour local_businesses
CREATE POLICY "Users can manage their own local businesses" 
ON public.local_businesses 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at sur prospect_databases
CREATE TRIGGER update_prospect_databases_updated_at
  BEFORE UPDATE ON public.prospect_databases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prospect_databases_updated_at();

-- Trigger pour mettre à jour updated_at sur prospects
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_prospect_databases_user_id ON public.prospect_databases(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_user_id ON public.prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_database_id ON public.prospects(database_id);
CREATE INDEX IF NOT EXISTS idx_local_businesses_user_id ON public.local_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_local_businesses_session ON public.local_businesses(search_session_id);