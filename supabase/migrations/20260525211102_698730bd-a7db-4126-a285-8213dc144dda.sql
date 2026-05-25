
-- OTP codes for WhatsApp auth
CREATE TABLE IF NOT EXISTS public.whatsapp_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_otp_phone ON public.whatsapp_otp_codes(phone, used, expires_at DESC);
ALTER TABLE public.whatsapp_otp_codes ENABLE ROW LEVEL SECURITY;
-- No direct user access; managed only via edge functions with service role
CREATE POLICY "deny_all_whatsapp_otp" ON public.whatsapp_otp_codes FOR ALL USING (false) WITH CHECK (false);

-- FCM device tokens for push
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fcm_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android','ios','web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fcm_token)
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_device_tokens" ON public.device_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_device_tokens" ON public.device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_device_tokens" ON public.device_tokens
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_delete_own_device_tokens" ON public.device_tokens
  FOR DELETE USING (auth.uid() = user_id);
