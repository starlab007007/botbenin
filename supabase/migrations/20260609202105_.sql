-- a) Purge mapping corrompu : phone_e164 == "+" || lid (le LID auto-injecté comme téléphone)
UPDATE public.waouh_lid_phone_map
   SET phone = NULL, phone_e164 = NULL
 WHERE phone_e164 IS NOT NULL
   AND regexp_replace(phone_e164, '\D', '', 'g') = lid;

-- b) Réparer waouh_users dont le phone_number est un LID camouflé en 229XXXXXXXXXXXXX
UPDATE public.waouh_users
   SET phone_number = substr(phone_number, 4) || '@lid'
 WHERE phone_number ~ '^229\d{12,}$';

-- c) Re-queue les messages échoués pour ces users (un seul retry)
UPDATE public.waouh_outbound_queue
   SET status = 'pending', attempts = 0, next_attempt_at = now(), last_error = NULL
 WHERE status = 'failed'
   AND last_error LIKE 'no WA contact for 229%'
   AND length(regexp_replace(to_phone, '\D', '', 'g')) > 13;

-- d) Garde-fou : interdire phone_e164 == lid à l'avenir
ALTER TABLE public.waouh_lid_phone_map
  DROP CONSTRAINT IF EXISTS waouh_lid_phone_map_no_self_phone;
ALTER TABLE public.waouh_lid_phone_map
  ADD CONSTRAINT waouh_lid_phone_map_no_self_phone
  CHECK (phone_e164 IS NULL OR regexp_replace(phone_e164, '\D', '', 'g') <> lid);;
