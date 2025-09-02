-- Create whatsapp_accounts table
CREATE TABLE public.whatsapp_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'error')),
  qr_code TEXT,
  webhook_url TEXT,
  waha_session_data JSONB DEFAULT '{}',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_name)
);

-- Create whatsapp_bot_links table
CREATE TABLE public.whatsapp_bot_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  auto_response_enabled BOOLEAN DEFAULT true,
  welcome_message TEXT DEFAULT 'Bonjour! Je suis votre assistant IA. Comment puis-je vous aider?',
  response_delay_seconds INTEGER DEFAULT 2 CHECK (response_delay_seconds >= 0 AND response_delay_seconds <= 30),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(whatsapp_account_id, bot_id)
);

-- Create whatsapp_messages table
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
  is_bot_response BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  waha_raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(whatsapp_account_id, message_id)
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_accounts
CREATE POLICY "Users can manage their own WhatsApp accounts"
ON public.whatsapp_accounts
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for whatsapp_bot_links
CREATE POLICY "Users can manage their bot links"
ON public.whatsapp_bot_links
FOR ALL
USING (
  whatsapp_account_id IN (
    SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  whatsapp_account_id IN (
    SELECT id FROM public.whatsapp_accounts WHERE user_id = auth.uid()
  )
);

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

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_accounts_user_id ON public.whatsapp_accounts(user_id);
CREATE INDEX idx_whatsapp_accounts_status ON public.whatsapp_accounts(status);
CREATE INDEX idx_whatsapp_bot_links_account_id ON public.whatsapp_bot_links(whatsapp_account_id);
CREATE INDEX idx_whatsapp_bot_links_bot_id ON public.whatsapp_bot_links(bot_id);
CREATE INDEX idx_whatsapp_messages_account_id ON public.whatsapp_messages(whatsapp_account_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp);
CREATE INDEX idx_whatsapp_messages_from_number ON public.whatsapp_messages(from_number);

-- Create update triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.whatsapp_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_bot_links_updated_at
  BEFORE UPDATE ON public.whatsapp_bot_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add tables to realtime publication
ALTER TABLE public.whatsapp_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_bot_links REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_bot_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;