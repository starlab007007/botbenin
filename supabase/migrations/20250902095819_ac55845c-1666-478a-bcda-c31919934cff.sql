-- Add RLS policies for whatsapp_accounts table

-- Policy for users to view their own WhatsApp accounts
CREATE POLICY "Users can view their own WhatsApp accounts" 
ON public.whatsapp_accounts 
FOR SELECT 
USING (user_id = auth.uid());

-- Policy for users to create their own WhatsApp accounts
CREATE POLICY "Users can create their own WhatsApp accounts" 
ON public.whatsapp_accounts 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own WhatsApp accounts
CREATE POLICY "Users can update their own WhatsApp accounts" 
ON public.whatsapp_accounts 
FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Policy for users to delete their own WhatsApp accounts
CREATE POLICY "Users can delete their own WhatsApp accounts" 
ON public.whatsapp_accounts 
FOR DELETE 
USING (user_id = auth.uid());

-- Add RLS policies for whatsapp_bot_links table

-- Policy for users to view their own bot links (through WhatsApp accounts)
CREATE POLICY "Users can view their own WhatsApp bot links" 
ON public.whatsapp_bot_links 
FOR SELECT 
USING (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
));

-- Policy for users to create bot links for their own WhatsApp accounts
CREATE POLICY "Users can create WhatsApp bot links for their accounts" 
ON public.whatsapp_bot_links 
FOR INSERT 
WITH CHECK (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
));

-- Policy for users to update their own bot links
CREATE POLICY "Users can update their own WhatsApp bot links" 
ON public.whatsapp_bot_links 
FOR UPDATE 
USING (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
))
WITH CHECK (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
));

-- Policy for users to delete their own bot links
CREATE POLICY "Users can delete their own WhatsApp bot links" 
ON public.whatsapp_bot_links 
FOR DELETE 
USING (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
));

-- Add RLS policies for whatsapp_messages table

-- Policy for users to view messages from their WhatsApp accounts
CREATE POLICY "Users can view messages from their WhatsApp accounts" 
ON public.whatsapp_messages 
FOR SELECT 
USING (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
));

-- Policy for system to insert messages (for webhook integration)
CREATE POLICY "System can insert WhatsApp messages" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (true);

-- Policy for users to update messages from their WhatsApp accounts
CREATE POLICY "Users can update messages from their WhatsApp accounts" 
ON public.whatsapp_messages 
FOR UPDATE 
USING (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
))
WITH CHECK (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
));

-- Policy for users to delete messages from their WhatsApp accounts
CREATE POLICY "Users can delete messages from their WhatsApp accounts" 
ON public.whatsapp_messages 
FOR DELETE 
USING (whatsapp_account_id IN (
  SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
));