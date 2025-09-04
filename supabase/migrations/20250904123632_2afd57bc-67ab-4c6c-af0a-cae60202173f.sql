-- First check if user_id column exists in whatsapp_accounts, if not add it
ALTER TABLE public.whatsapp_accounts 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create WhatsApp messages table for storing message history
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name text NOT NULL,
    from_number text NOT NULL,
    to_number text NOT NULL,
    message_content text NOT NULL,
    message_type text NOT NULL DEFAULT 'text'::text,
    direction text NOT NULL DEFAULT 'outgoing'::text,
    status text NOT NULL DEFAULT 'sent'::text,
    timestamp timestamp with time zone NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    media_url text,
    reply_to_message_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create WhatsApp contacts table for managing contacts
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name text NOT NULL,
    phone_number text NOT NULL,
    name text,
    profile_picture text,
    last_seen timestamp with time zone DEFAULT now(),
    is_contact boolean DEFAULT false,
    is_blocked boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    message_count integer DEFAULT 0,
    last_message text,
    last_message_timestamp timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(session_name, phone_number)
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_messages using existing columns
CREATE POLICY "Users can view their own WhatsApp messages"
    ON public.whatsapp_messages
    FOR SELECT
    USING (
        session_name IN (
            SELECT wa.session_name 
            FROM public.whatsapp_accounts wa
            WHERE wa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own WhatsApp messages"
    ON public.whatsapp_messages
    FOR INSERT
    WITH CHECK (
        session_name IN (
            SELECT wa.session_name 
            FROM public.whatsapp_accounts wa
            WHERE wa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own WhatsApp messages"
    ON public.whatsapp_messages
    FOR UPDATE
    USING (
        session_name IN (
            SELECT wa.session_name 
            FROM public.whatsapp_accounts wa
            WHERE wa.user_id = auth.uid()
        )
    );

-- Create RLS policies for whatsapp_contacts
CREATE POLICY "Users can view their own WhatsApp contacts"
    ON public.whatsapp_contacts
    FOR SELECT
    USING (
        session_name IN (
            SELECT wa.session_name 
            FROM public.whatsapp_accounts wa
            WHERE wa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own WhatsApp contacts"
    ON public.whatsapp_contacts
    FOR ALL
    USING (
        session_name IN (
            SELECT wa.session_name 
            FROM public.whatsapp_accounts wa
            WHERE wa.user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session_name ON public.whatsapp_messages(session_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_to ON public.whatsapp_messages(from_number, to_number);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_session_name ON public.whatsapp_contacts(session_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_last_message ON public.whatsapp_contacts(last_message_timestamp DESC);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_messages_updated_at 
    BEFORE UPDATE ON public.whatsapp_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_contacts_updated_at 
    BEFORE UPDATE ON public.whatsapp_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update contact message statistics
CREATE OR REPLACE FUNCTION update_contact_message_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update message count and last message for contact
    UPDATE public.whatsapp_contacts 
    SET 
        message_count = message_count + 1,
        last_message = NEW.message_content,
        last_message_timestamp = NEW.timestamp
    WHERE session_name = NEW.session_name 
    AND phone_number = CASE 
        WHEN NEW.direction = 'incoming' THEN NEW.from_number
        ELSE NEW.to_number
    END;

    -- If contact doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO public.whatsapp_contacts (
            session_name,
            phone_number,
            message_count,
            last_message,
            last_message_timestamp
        ) VALUES (
            NEW.session_name,
            CASE 
                WHEN NEW.direction = 'incoming' THEN NEW.from_number
                ELSE NEW.to_number
            END,
            1,
            NEW.message_content,
            NEW.timestamp
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_stats_on_message
    AFTER INSERT ON public.whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION update_contact_message_stats();