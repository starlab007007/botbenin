-- Nettoyer les doublons existants dans la table prospects
WITH prospect_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, company, phone, email, first_name, last_name 
      ORDER BY created_at ASC
    ) as rn
  FROM prospects 
  WHERE company IS NOT NULL AND phone IS NOT NULL
)
DELETE FROM prospects 
WHERE id IN (
  SELECT id FROM prospect_duplicates WHERE rn > 1
);

-- Créer un index unique composite pour éviter les futurs doublons (sans CONCURRENTLY)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_unique_business
ON prospects (user_id, COALESCE(company, ''), COALESCE(phone, ''), COALESCE(email, ''))
WHERE company IS NOT NULL AND phone IS NOT NULL;;
