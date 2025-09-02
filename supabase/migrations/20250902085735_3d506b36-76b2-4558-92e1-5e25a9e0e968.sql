-- Create whatsapp_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
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

-- Create whatsapp_bot_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_links (
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

-- Enable Row Level Security on new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_accounts' AND policyname = 'Users can manage their own WhatsApp accounts'
  ) THEN
    ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own WhatsApp accounts"
    ON public.whatsapp_accounts
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_bot_links' AND policyname = 'Users can manage their bot links'
  ) THEN
    ALTER TABLE public.whatsapp_bot_links ENABLE ROW LEVEL SECURITY;
    
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
  END IF;
END
$$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_accounts_user_id') THEN
    CREATE INDEX idx_whatsapp_accounts_user_id ON public.whatsapp_accounts(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_accounts_status') THEN
    CREATE INDEX idx_whatsapp_accounts_status ON public.whatsapp_accounts(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_bot_links_account_id') THEN
    CREATE INDEX idx_whatsapp_bot_links_account_id ON public.whatsapp_bot_links(whatsapp_account_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_bot_links_bot_id') THEN
    CREATE INDEX idx_whatsapp_bot_links_bot_id ON public.whatsapp_bot_links(bot_id);
  END IF;
END
$$;

-- Create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_accounts_updated_at') THEN
    CREATE TRIGGER update_whatsapp_accounts_updated_at
      BEFORE UPDATE ON public.whatsapp_accounts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_bot_links_updated_at') THEN
    CREATE TRIGGER update_whatsapp_bot_links_updated_at
      BEFORE UPDATE ON public.whatsapp_bot_links
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- Add tables to realtime publication if not already added
DO $$
BEGIN
  -- Check and add whatsapp_accounts to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'whatsapp_accounts'
  ) THEN
    ALTER TABLE public.whatsapp_accounts REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_accounts;
  END IF;
  
  -- Check and add whatsapp_bot_links to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'whatsapp_bot_links'
  ) THEN
    ALTER TABLE public.whatsapp_bot_links REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_bot_links;
  END IF;
  
  -- Check and add whatsapp_messages to realtime if it exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_messages') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'whatsapp_messages'
    ) THEN
      ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
    END IF;
  END IF;
END
$$;