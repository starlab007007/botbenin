
-- Migration pour les tables de prospection locale et ciblage B2B

-- Table pour stocker les entreprises locales trouvées
CREATE TABLE IF NOT EXISTS public.local_businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  hours TEXT,
  price_range TEXT,
  distance TEXT,
  location TEXT,
  coordinates JSONB,
  job_title TEXT,
  linkedin_url TEXT,
  industry TEXT,
  company_size TEXT,
  search_session_id TEXT,
  source TEXT DEFAULT 'local_search',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour stocker les entreprises B2B trouvées
CREATE TABLE IF NOT EXISTS public.b2b_businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  job_title TEXT,
  location TEXT,
  industry TEXT,
  company_size TEXT,
  coordinates JSONB,
  search_session_id TEXT,
  source TEXT DEFAULT 'b2b_search',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.local_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_businesses ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour local_businesses
CREATE POLICY "Users can manage their local businesses" ON public.local_businesses
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Politiques RLS pour b2b_businesses
CREATE POLICY "Users can manage their b2b businesses" ON public.b2b_businesses
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger pour updated_at sur local_businesses
CREATE TRIGGER update_local_businesses_updated_at BEFORE UPDATE ON public.local_businesses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur b2b_businesses
CREATE TRIGGER update_b2b_businesses_updated_at BEFORE UPDATE ON public.b2b_businesses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour transférer les entreprises locales vers les prospects
CREATE OR REPLACE FUNCTION public.transfer_local_businesses_to_prospects(business_ids uuid[], target_database_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transferred_count INTEGER := 0;
  business_record RECORD;
BEGIN
  -- Check if user owns the target database
  IF NOT EXISTS (
    SELECT 1 FROM public.prospect_databases 
    WHERE id = target_database_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Database not found or access denied';
  END IF;

  -- Transfer each business to prospects
  FOR business_record IN 
    SELECT * FROM public.local_businesses 
    WHERE id = ANY(business_ids) AND user_id = auth.uid()
  LOOP
    INSERT INTO public.prospects (
      user_id,
      database_id,
      first_name,
      last_name,
      email,
      phone,
      company,
      position,
      source,
      status,
      notes,
      custom_fields,
      tags
    ) VALUES (
      auth.uid(),
      target_database_id,
      SPLIT_PART(business_record.name, ' ', 1),
      COALESCE(SPLIT_PART(business_record.name, ' ', 2), ''),
      business_record.email,
      business_record.phone,
      business_record.company_name,
      business_record.job_title,
      'local_search',
      'new',
      CONCAT('Catégorie: ', COALESCE(business_record.category, ''), 
             ', Adresse: ', COALESCE(business_record.address, ''),
             ', Note: ', COALESCE(business_record.rating::text, ''),
             ', Site web: ', COALESCE(business_record.website, '')),
      JSONB_BUILD_OBJECT(
        'rating', business_record.rating,
        'review_count', business_record.review_count,
        'hours', business_record.hours,
        'price_range', business_record.price_range,
        'distance', business_record.distance,
        'coordinates', business_record.coordinates,
        'linkedin_url', business_record.linkedin_url,
        'industry', business_record.industry,
        'company_size', business_record.company_size
      ),
      JSONB_BUILD_ARRAY(business_record.category, 'local_business')
    );
    
    transferred_count := transferred_count + 1;
  END LOOP;

  RETURN transferred_count;
END;
$$;

-- Fonction pour transférer les entreprises B2B vers les prospects
CREATE OR REPLACE FUNCTION public.transfer_b2b_businesses_to_prospects(business_ids uuid[], target_database_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transferred_count INTEGER := 0;
  business_record RECORD;
BEGIN
  -- Check if user owns the target database
  IF NOT EXISTS (
    SELECT 1 FROM public.prospect_databases 
    WHERE id = target_database_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Database not found or access denied';
  END IF;

  -- Transfer each business to prospects
  FOR business_record IN 
    SELECT * FROM public.b2b_businesses 
    WHERE id = ANY(business_ids) AND user_id = auth.uid()
  LOOP
    INSERT INTO public.prospects (
      user_id,
      database_id,
      first_name,
      last_name,
      email,
      phone,
      company,
      position,
      source,
      status,
      notes,
      custom_fields,
      tags
    ) VALUES (
      auth.uid(),
      target_database_id,
      SPLIT_PART(business_record.name, ' ', 1),
      COALESCE(SPLIT_PART(business_record.name, ' ', 2), ''),
      business_record.email,
      business_record.phone,
      business_record.company_name,
      business_record.job_title,
      'b2b_search',
      'new',
      CONCAT('Industrie: ', COALESCE(business_record.industry, ''), 
             ', Localisation: ', COALESCE(business_record.location, ''),
             ', Taille: ', COALESCE(business_record.company_size, ''),
             ', Site web: ', COALESCE(business_record.website, '')),
      JSONB_BUILD_OBJECT(
        'coordinates', business_record.coordinates,
        'linkedin_url', business_record.linkedin_url,
        'industry', business_record.industry,
        'company_size', business_record.company_size,
        'location', business_record.location
      ),
      JSONB_BUILD_ARRAY(business_record.industry, 'b2b_business')
    );
    
    transferred_count := transferred_count + 1;
  END LOOP;

  RETURN transferred_count;
END;
$$;
