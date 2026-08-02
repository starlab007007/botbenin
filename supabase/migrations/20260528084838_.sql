
-- Drop leaky policies
DROP POLICY IF EXISTS "WA: anyone can view admin shared accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "WA: admins manage shared accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "WA: users can view own accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "WA: users can insert own accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "WA: users can update own accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "WA: users can delete own accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "whatsapp_accounts_select_own" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "whatsapp_accounts_insert_own" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "whatsapp_accounts_update_own" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "whatsapp_accounts_delete_own" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Users can view their own WhatsApp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Users can create their own WhatsApp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Users can update their own WhatsApp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Users can delete their own WhatsApp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Users can manage their own WhatsApp accounts" ON public.whatsapp_accounts;

-- Strict per-user policies
CREATE POLICY "wa_select_own_only" ON public.whatsapp_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "wa_insert_own_only" ON public.whatsapp_accounts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "wa_update_own_only" ON public.whatsapp_accounts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "wa_delete_own_only" ON public.whatsapp_accounts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Service role keeps full access for edge functions
CREATE POLICY "wa_service_role_all" ON public.whatsapp_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Purge shared flag
UPDATE public.whatsapp_accounts SET is_admin_shared = false WHERE is_admin_shared = true;
;
