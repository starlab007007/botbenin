-- Corriger la fonction transfer_local_businesses_to_prospects
-- Problème: La fonction essaie d'insérer dans des colonnes qui n'existent pas (name, address, city, country)
-- Solution: Utiliser les bonnes colonnes et stocker les données manquantes dans custom_fields

DROP FUNCTION IF EXISTS transfer_local_businesses_to_prospects(uuid[], uuid);

CREATE OR REPLACE FUNCTION transfer_local_businesses_to_prospects(
  business_ids uuid[],
  target_database_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_business record;
  v_successfully_added integer := 0;
  v_skipped_duplicates integer := 0;
  v_failed integer := 0;
  v_prospect_id uuid;
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
      -- Vérifier les doublons (par email ou téléphone)
      IF EXISTS (
        SELECT 1 FROM prospects 
        WHERE database_id = target_database_id 
        AND (
          (email IS NOT NULL AND email = v_business.email)
          OR (phone IS NOT NULL AND phone = v_business.phone)
        )
      ) THEN
        v_skipped_duplicates := v_skipped_duplicates + 1;
        CONTINUE;
      END IF;
      
      -- Insérer le prospect avec les bonnes colonnes
      INSERT INTO prospects (
        database_id,
        user_id,
        company,
        email,
        phone,
        status,
        source,
        tags,
        notes,
        custom_fields,
        score
      ) VALUES (
        target_database_id,
        v_user_id,
        COALESCE(v_business.company_name, v_business.name, 'Entreprise sans nom'),
        v_business.email,
        v_business.phone,
        'new',
        'local_search',
        CASE 
          WHEN v_business.category IS NOT NULL 
          THEN to_jsonb(ARRAY[v_business.category])
          ELSE '[]'::jsonb
        END,
        jsonb_build_object(
          'original_data', jsonb_build_object(
            'rating', v_business.rating,
            'review_count', v_business.review_count,
            'hours', v_business.hours,
            'price_range', v_business.price_range,
            'distance', v_business.distance,
            'website', v_business.website,
            'coordinates', v_business.coordinates
          )
        ),
        jsonb_build_object(
          'address', v_business.address,
          'rating', v_business.rating,
          'review_count', v_business.review_count,
          'website', v_business.website,
          'category', v_business.category
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
        -- Logger l'erreur mais continuer
        RAISE WARNING 'Error processing business %: %', v_business.id, SQLERRM;
        v_failed := v_failed + 1;
    END;
  END LOOP;
  
  -- Retourner les résultats
  RETURN jsonb_build_object(
    'successfully_added', v_successfully_added,
    'skipped_duplicates', v_skipped_duplicates,
    'failed', v_failed
  );
END;
$$;