UPDATE public.waouh_messages
SET attachments = COALESCE((
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(attachments) elem
  WHERE NOT (elem->>'url' LIKE '%waha.bot.bj%' OR elem->>'url' LIKE '%/api/files/%')
), '[]'::jsonb)
WHERE attachments IS NOT NULL
  AND jsonb_typeof(attachments) = 'array'
  AND attachments::text LIKE ANY (ARRAY['%waha.bot.bj%', '%/api/files/%']);