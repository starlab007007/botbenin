-- Vérifier et créer/corriger la table prospect_databases si nécessaire
CREATE TABLE IF NOT EXISTS public.prospect_databases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- S'assurer que RLS est activé
ALTER TABLE public.prospect_databases ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
DROP POLICY IF EXISTS "Users can manage their own prospect databases" ON public.prospect_databases;
CREATE POLICY "Users can manage their own prospect databases" 
ON public.prospect_databases 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_prospect_databases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_prospect_databases_updated_at ON public.prospect_databases;
CREATE TRIGGER update_prospect_databases_updated_at
    BEFORE UPDATE ON public.prospect_databases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_prospect_databases_updated_at();

-- Vérifier et créer/corriger la table prospects si nécessaire
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  database_id UUID NOT NULL REFERENCES public.prospect_databases(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- S'assurer que RLS est activé
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour prospects
DROP POLICY IF EXISTS "Users can manage their own prospects" ON public.prospects;
CREATE POLICY "Users can manage their own prospects" 
ON public.prospects 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger pour updated_at sur prospects
DROP TRIGGER IF EXISTS update_prospects_updated_at ON public.prospects;
CREATE TRIGGER update_prospects_updated_at
    BEFORE UPDATE ON public.prospects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();;
