-- Whitelisted campaign contacts must provide verifiable marketing opt-in.
-- Imported or synchronized phone numbers do not automatically convey permission.
ALTER TABLE public.wa_contacts
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in_at timestamptz;
COMMENT ON COLUMN public.wa_contacts.whatsapp_marketing_opt_in IS
  'Explicit recipient permission for WAOUH promotional WhatsApp campaigns; absence of consent is false.';
COMMENT ON COLUMN public.wa_contacts.whatsapp_marketing_opt_in_at IS
  'Recorded consent date, administered by the contact owner.';
