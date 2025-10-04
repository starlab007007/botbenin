-- Améliorer la fonction transfer_local_businesses_to_prospects pour gérer les doublons
DROP FUNCTION IF EXISTS public.transfer_local_businesses_to_prospects(uuid[], uuid);

CREATE OR REPLACE FUNCTION public.transfer_local_businesses_to_prospects(
  business_ids uuid[], 
  target_database_id uuid
)
RETURNS TABLE(
  total_processed integer,
  successfully_added integer,
  skipped_duplicates integer,
  failed integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  business_record RECORD;
  current_user_id uuid;
  processed_count INTEGER := 0;
  success_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Récupérer l'ID utilisateur authentifié
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Vérifier que l'utilisateur possède la base de destination
  IF NOT EXISTS (
    SELECT 1 FROM public.prospect_databases 
    WHERE id = target_database_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Database not found or access denied';
  END IF;

  -- Traiter chaque entreprise
  FOR business_record IN 
    SELECT * FROM public.local_businesses 
    WHERE id = ANY(business_ids) AND user_id = current_user_id
  LOOP
    processed_count := processed_count + 1;
    
    BEGIN
      -- Vérifier si un prospect similaire existe déjà
      IF EXISTS (
        SELECT 1 FROM public.prospects
        WHERE user_id = current_user_id
          AND database_id = target_database_id
          AND COALESCE(company, '') = COALESCE(business_record.company_name, '')
          AND COALESCE(phone, '') = COALESCE(business_record.phone, '')
          AND COALESCE(email, '') = COALESCE(business_record.email, '')
      ) THEN
        -- Doublon détecté, on l'ignore
        duplicate_count := duplicate_count + 1;
      ELSE
        -- Insérer le nouveau prospect
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
          current_user_id,
          target_database_id,
          SPLIT_PART(business_record.name, ' ', 1),
          COALESCE(SPLIT_PART(business_record.name, ' ', 2), ''),
          business_record.email,
          business_record.phone,
          business_record.company_name,
          business_record.job_title,
          'local_search',
          'new',
          CONCAT(
            'Catégorie: ', COALESCE(business_record.category, ''), 
            E'\nAdresse: ', COALESCE(business_record.address, ''),
            E'\nNote: ', COALESCE(business_record.rating::text, ''),
            E'\nSite web: ', COALESCE(business_record.website, '')
          ),
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
          ARRAY[business_record.category, 'local_business']::text[]
        );
        
        success_count := success_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- En cas d'erreur, on compte et on continue
      error_count := error_count + 1;
      RAISE WARNING 'Error processing business %: %', business_record.id, SQLERRM;
    END;
  END LOOP;

  -- Mettre à jour la date de la base de données
  UPDATE public.prospect_databases
  SET updated_at = NOW()
  WHERE id = target_database_id;

  -- Retourner les résultats
  RETURN QUERY SELECT 
    processed_count,
    success_count,
    duplicate_count,
    error_count;
END;
$$;