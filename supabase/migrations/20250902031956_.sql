-- Add WAHA authentication fields to whatsapp_accounts
ALTER TABLE public.whatsapp_accounts 
ADD COLUMN IF NOT EXISTS waha_authenticated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dashboard_authenticated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_auth_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW();;
