-- Back-fill depuis waouh_partners (en évitant les doublons de phone_number)
WITH src AS (
  SELECT
    u.id AS user_id,
    COALESCE(
      NULLIF(regexp_replace(p.whatsapp, '\D', '', 'g'), ''),
      NULLIF(regexp_replace(p.telephone, '\D', '', 'g'), '')
    ) AS new_phone
  FROM public.waouh_users u
  JOIN public.waouh_partners p ON p.user_id = u.auth_user_id
  WHERE u.auth_user_id IS NOT NULL
    AND (
      u.phone_number IS NULL
      OR u.phone_number = ''
      OR u.phone_number ILIKE '%@lid%'
      OR length(regexp_replace(u.phone_number, '\D', '', 'g')) < 10
    )
)
UPDATE public.waouh_users u
SET phone_number = src.new_phone
FROM src
WHERE u.id = src.user_id
  AND src.new_phone IS NOT NULL
  AND length(src.new_phone) >= 10
  AND NOT EXISTS (
    SELECT 1 FROM public.waouh_users u2
    WHERE u2.phone_number = src.new_phone AND u2.id <> u.id
  );

-- Back-fill depuis waouh_external_listings.seller_phone (radar IA)
WITH src AS (
  SELECT
    u.id AS user_id,
    NULLIF(regexp_replace(e.seller_phone, '\D', '', 'g'), '') AS new_phone
  FROM public.waouh_users u
  JOIN public.waouh_external_listings e ON e.seller_user_id = u.id
  WHERE (
      u.phone_number IS NULL
      OR u.phone_number = ''
      OR u.phone_number ILIKE '%@lid%'
      OR length(regexp_replace(u.phone_number, '\D', '', 'g')) < 10
    )
    AND e.seller_phone IS NOT NULL
)
UPDATE public.waouh_users u
SET phone_number = src.new_phone
FROM src
WHERE u.id = src.user_id
  AND src.new_phone IS NOT NULL
  AND length(src.new_phone) >= 10
  AND NOT EXISTS (
    SELECT 1 FROM public.waouh_users u2
    WHERE u2.phone_number = src.new_phone AND u2.id <> u.id
  );;
