
-- Add is_admin_shared column to whatsapp_accounts
ALTER TABLE public.whatsapp_accounts
  ADD COLUMN IF NOT EXISTS is_admin_shared boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_admin_shared
  ON public.whatsapp_accounts(is_admin_shared) WHERE is_admin_shared = true;

-- Allow any authenticated user to SELECT admin-shared sessions (in addition to their own)
DROP POLICY IF EXISTS "WA: anyone can view admin shared accounts" ON public.whatsapp_accounts;
CREATE POLICY "WA: anyone can view admin shared accounts"
ON public.whatsapp_accounts
FOR SELECT
TO authenticated
USING (is_admin_shared = true);

-- Only admins can flip is_admin_shared = true
DROP POLICY IF EXISTS "WA: admins manage shared accounts" ON public.whatsapp_accounts;
CREATE POLICY "WA: admins manage shared accounts"
ON public.whatsapp_accounts
FOR ALL
TO authenticated
USING (is_admin_shared = true AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (is_admin_shared = true AND public.has_role(auth.uid(), 'admin'));
;
