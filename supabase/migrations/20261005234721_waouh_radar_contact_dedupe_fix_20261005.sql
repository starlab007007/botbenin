CREATE OR REPLACE FUNCTION public.merge_radar_contacts_duplicates()
RETURNS TABLE(merged_phone text, merged_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  keep_id uuid;
  cnt int;
BEGIN
  FOR r IN
    SELECT phone_e164_normalized, COUNT(*) AS c
    FROM public.waouh_radar_contacts
    WHERE phone_e164_normalized IS NOT NULL
    GROUP BY phone_e164_normalized
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM public.waouh_radar_contacts
    WHERE phone_e164_normalized = r.phone_e164_normalized
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE public.waouh_radar_contacts keep SET
      signal_count = (SELECT SUM(signal_count) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      intent_buy_count = (SELECT SUM(intent_buy_count) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      intent_sell_count = (SELECT SUM(intent_sell_count) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      categories = (SELECT ARRAY(SELECT DISTINCT unnest(array_agg(c)) FROM (SELECT unnest(categories) AS c FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized) s)),
      cities = (SELECT ARRAY(SELECT DISTINCT unnest(array_agg(c)) FROM (SELECT unnest(cities) AS c FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized) s)),
      first_seen_at = (SELECT MIN(first_seen_at) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      last_seen_at = (SELECT MAX(last_seen_at) FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized),
      status = CASE
        WHEN EXISTS(SELECT 1 FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized AND status='opted_out') THEN 'opted_out'
        WHEN EXISTS(SELECT 1 FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized AND status='blocked') THEN 'blocked'
        WHEN EXISTS(SELECT 1 FROM public.waouh_radar_contacts WHERE phone_e164_normalized = r.phone_e164_normalized AND status='opted_in') THEN 'opted_in'
        ELSE 'new'
      END,
      phone_e164 = r.phone_e164_normalized
    WHERE keep.id = keep_id;

    DELETE FROM public.waouh_radar_contacts
    WHERE phone_e164_normalized = r.phone_e164_normalized
      AND id <> keep_id;

    GET DIAGNOSTICS cnt = ROW_COUNT;
    merged_phone := r.phone_e164_normalized;
    merged_count := cnt;
    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.merge_radar_contacts_duplicates() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.merge_radar_contacts_duplicates() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_radar_contacts_duplicates() TO service_role;
