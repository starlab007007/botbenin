-- Correction complète : détection de doublons intelligente + nettoyage des données
DROP FUNCTION IF EXISTS transfer_local_businesses_to_prospects(uuid[], uuid);

CREATE OR REPLACE FUNCTION transfer_local_businesses_to_prospects(
  business_ids uuid[],
  target_database_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_business record;
  v_successfully_added integer := 0;
  v_skipped_duplicates integer := 0;
  v_failed integer := 0;
  v_prospect_id uuid;
  v_first_name text;
  v_last_name text;
  v_clean_email text;
  v_clean_phone text;
  v_clean_linkedin text;
  v_clean_address text;
  v_clean_website text;
BEGIN
  -- Récupérer l'ID utilisateur
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Vérifier que la base de données appartient à l'utilisateur
  IF NOT EXISTS (
    SELECT 1 FROM prospect_databases 
    WHERE id = target_database_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Database not found or access denied';
  END IF;
  
  -- Traiter chaque entreprise
  FOR v_business IN 
    SELECT * FROM local_businesses 
    WHERE id = ANY(business_ids) AND user_id = v_user_id
  LOOP
    BEGIN
      -- Nettoyage des données
      v_clean_email := NULLIF(TRIM(v_business.email), '');
      v_clean_phone := NULLIF(TRIM(v_business.phone), '');
      
      -- Nettoyer LinkedIn URL (ignorer les valeurs par défaut)
      v_clean_linkedin := CASE 
        WHEN v_business.linkedin_url IS NULL THEN NULL
        WHEN v_business.linkedin_url LIKE '%Non disponible%' THEN NULL
        WHEN TRIM(v_business.linkedin_url) = '' THEN NULL
        ELSE TRIM(v_business.linkedin_url)
      END;
      
      -- Nettoyer l'adresse
      v_clean_address := CASE 
        WHEN v_business.address IS NULL THEN NULL
        WHEN v_business.address LIKE '%non précisée%' THEN NULL
        WHEN v_business.address LIKE '%Non spécifié%' THEN NULL
        WHEN TRIM(v_business.address) = '' THEN NULL
        ELSE TRIM(v_business.address)
      END;
      
      -- Nettoyer le website
      v_clean_website := CASE 
        WHEN v_business.website IS NULL THEN NULL
        WHEN v_business.website LIKE '%Non disponible%' THEN NULL
        WHEN TRIM(v_business.website) = '' THEN NULL
        ELSE TRIM(v_business.website)
      END;
      
      -- Détection de doublons INTELLIGENTE
      -- Critère 1: Email valide + Entreprise identique
      -- Critère 2: Téléphone valide + Prénom + Nom identiques
      IF EXISTS (
        SELECT 1 FROM prospects 
        WHERE database_id = target_database_id 
        AND (
          -- Email + Entreprise
          (v_clean_email IS NOT NULL 
           AND email = v_clean_email 
           AND company = COALESCE(v_business.company_name, v_business.name))
          OR
          -- Téléphone + Nom complet
          (v_clean_phone IS NOT NULL 
           AND phone = v_clean_phone
           AND first_name = SPLIT_PART(v_business.name, ' ', 1)
           AND last_name LIKE '%' || COALESCE(v_business.company_name, SPLIT_PART(v_business.name, ' ', 2)) || '%')
        )
      ) THEN
        v_skipped_duplicates := v_skipped_duplicates + 1;
        CONTINUE;
      END IF;
      
      -- Extraction intelligente de first_name et last_name
      IF v_business.name IS NOT NULL AND TRIM(v_business.name) != '' THEN
        IF POSITION(' ' IN v_business.name) > 0 THEN
          v_first_name := SPLIT_PART(v_business.name, ' ', 1);
          v_last_name := COALESCE(
            NULLIF(TRIM(SUBSTRING(v_business.name FROM POSITION(' ' IN v_business.name) + 1)), ''),
            v_business.company_name,
            'Principal'
          );
        ELSE
          v_first_name := v_business.name;
          v_last_name := COALESCE(v_business.company_name, 'Principal');
        END IF;
      ELSE
        v_first_name := 'Contact';
        v_last_name := COALESCE(v_business.company_name, 'Principal');
      END IF;
      
      -- Insérer le prospect avec TOUS les champs nettoyés
      INSERT INTO prospects (
        database_id,
        user_id,
        first_name,
        last_name,
        company,
        email,
        phone,
        position,
        status,
        source,
        tags,
        notes,
        custom_fields,
        score
      ) VALUES (
        target_database_id,
        v_user_id,
        v_first_name,
        v_last_name,
        COALESCE(v_business.company_name, v_business.name, 'Entreprise sans nom'),
        v_clean_email,
        v_clean_phone,
        NULLIF(TRIM(v_business.job_title), ''), -- Nettoyage du job_title
        'new',
        'local_search',
        CASE 
          WHEN v_business.category IS NOT NULL AND v_business.category != 'Non spécifié'
          THEN to_jsonb(ARRAY[v_business.category])
          ELSE '[]'::jsonb
        END,
        -- Notes restructurées en texte clair
        CASE 
          WHEN v_clean_address IS NOT NULL AND v_business.hours IS NOT NULL AND v_business.hours != ''
          THEN 'Adresse: ' || v_clean_address || E'\nHoraires: ' || v_business.hours
          WHEN v_clean_address IS NOT NULL
          THEN 'Adresse: ' || v_clean_address
          WHEN v_business.hours IS NOT NULL AND v_business.hours != ''
          THEN 'Horaires: ' || v_business.hours
          ELSE NULL
        END,
        -- Custom fields structurés et nettoyés
        jsonb_build_object(
          'contact_info', jsonb_build_object(
            'linkedin_url', v_clean_linkedin,
            'industry', NULLIF(TRIM(v_business.industry), ''),
            'company_size', NULLIF(TRIM(v_business.company_size), '')
          ),
          'business_info', jsonb_build_object(
            'address', v_clean_address,
            'coordinates', v_business.coordinates,
            'hours', NULLIF(TRIM(v_business.hours), ''),
            'price_range', NULLIF(TRIM(v_business.price_range), '')
          ),
          'metrics', jsonb_build_object(
            'rating', v_business.rating,
            'review_count', v_business.review_count,
            'distance', NULLIF(TRIM(v_business.distance), '')
          ),
          'metadata', jsonb_build_object(
            'category', NULLIF(TRIM(v_business.category), ''),
            'website', v_clean_website,
            'search_session_id', v_business.search_session_id
          )
        ),
        CASE 
          WHEN v_business.rating >= 4 THEN 80
          WHEN v_business.rating >= 3 THEN 60
          ELSE 40
        END
      )
      RETURNING id INTO v_prospect_id;
      
      v_successfully_added := v_successfully_added + 1;
      
    EXCEPTION 
      WHEN OTHERS THEN
        RAISE WARNING 'Error processing business %: %', v_business.id, SQLERRM;
        v_failed := v_failed + 1;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'successfully_added', v_successfully_added,
    'skipped_duplicates', v_skipped_duplicates,
    'failed', v_failed
  );
END;
$$;;
