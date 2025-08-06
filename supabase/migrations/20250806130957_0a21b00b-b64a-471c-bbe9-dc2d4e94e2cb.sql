-- Vérifier et corriger la fonction de transfert pour s'assurer qu'elle utilise l'ID utilisateur correct
CREATE OR REPLACE FUNCTION public.transfer_local_businesses_to_prospects(business_ids uuid[], target_database_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  transferred_count INTEGER := 0;
  business_record RECORD;
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user owns the target database
  IF NOT EXISTS (
    SELECT 1 FROM public.prospect_databases 
    WHERE id = target_database_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Database not found or access denied';
  END IF;

  -- Transfer each business to prospects
  FOR business_record IN 
    SELECT * FROM public.local_businesses 
    WHERE id = ANY(business_ids) AND user_id = current_user_id
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
      current_user_id, -- Utiliser l'ID utilisateur authentifié
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
$function$