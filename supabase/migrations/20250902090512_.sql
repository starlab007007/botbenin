-- Drop existing whatsapp_messages table if it has wrong structure
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;

-- Create whatsapp_messages table with correct structure
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  bot_link_id UUID REFERENCES public.whatsapp_bot_links(id) ON DELETE SET NULL,
  message_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'contact')),
  content TEXT,
  media_url TEXT,
  is_from_me BOOLEAN NOT NULL DEFAULT false,
  is_bot_response BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  waha_raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(whatsapp_account_id, message_id)
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_messages
CREATE POLICY "Users can view their WhatsApp messages"
ON public.whatsapp_messages
FOR SELECT
USING (
  whatsapp_account_id IN (
    SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert WhatsApp messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their WhatsApp messages"
ON public.whatsapp_messages
FOR UPDATE
USING (
  whatsapp_account_id IN (
    SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their WhatsApp messages"
ON public.whatsapp_messages
FOR DELETE
USING (
  whatsapp_account_id IN (
    SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_messages_account_id ON public.whatsapp_messages(whatsapp_account_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp);
CREATE INDEX idx_whatsapp_messages_from_number ON public.whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_to_number ON public.whatsapp_messages(to_number);

-- Add table to realtime publication
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;;
