ALTER TABLE public.whatsapp_accounts
DROP CONSTRAINT IF EXISTS whatsapp_accounts_status_check;

ALTER TABLE public.whatsapp_accounts
ADD CONSTRAINT whatsapp_accounts_status_check
CHECK (status = ANY (ARRAY[
  'disconnected',
  'connecting',
  'connected',
  'error',
  'WORKING',
  'SCAN_QR_CODE',
  'DISCONNECTED',
  'STARTING',
  'STOPPED',
  'FAILED',
  'UNKNOWN',
  'NOT_FOUND'
]::text[]));;
