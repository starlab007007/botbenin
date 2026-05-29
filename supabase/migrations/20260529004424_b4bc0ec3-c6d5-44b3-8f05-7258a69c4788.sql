-- Nettoyage one-shot des profils acheteurs qui causent du spam de notifications.
-- 1) Désactiver les profils sans mot-clé (sinon ils matchent toutes les annonces).
UPDATE public.waouh_buyer_profiles
SET is_active = false
WHERE is_active = true
  AND (keywords IS NULL OR array_length(keywords, 1) IS NULL);

-- 2) Dédupliquer les profils strictement identiques (même user_id + mêmes keywords triés/uniques).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id,
             (SELECT array_agg(DISTINCT lower(k) ORDER BY lower(k)) FROM unnest(keywords) k)
           ORDER BY created_at ASC
         ) AS rn
  FROM public.waouh_buyer_profiles
  WHERE is_active = true
    AND keywords IS NOT NULL
    AND array_length(keywords, 1) >= 1
)
UPDATE public.waouh_buyer_profiles p
SET is_active = false
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;