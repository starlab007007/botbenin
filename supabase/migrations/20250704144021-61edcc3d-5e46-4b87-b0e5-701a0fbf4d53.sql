
-- Table pour les bases de données de prospects (complément pour la gestion des prospects)
CREATE TABLE IF NOT EXISTS public.prospect_databases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les prospects individuels (complément)
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  database_id UUID REFERENCES public.prospect_databases(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'new',
  score INTEGER DEFAULT 0,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  tags JSONB DEFAULT '[]',
  last_contacted TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les campagnes marketing (complément)
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  message_template TEXT NOT NULL,
  target_contacts JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  results JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.prospect_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour prospect_databases
CREATE POLICY "Users can manage their prospect databases" ON public.prospect_databases
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Politiques RLS pour prospects
CREATE POLICY "Users can manage their prospects" ON public.prospects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Politiques RLS pour marketing_campaigns
CREATE POLICY "Users can manage their marketing campaigns" ON public.marketing_campaigns
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger pour updated_at sur prospect_databases
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prospect_databases_updated_at BEFORE UPDATE ON public.prospect_databases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
