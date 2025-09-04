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

-- Simple RLS policies that allow users to manage their own data
-- We'll assume that session filtering is handled in the application layer for now
CREATE POLICY "Authenticated users can access whatsapp_messages"
    ON public.whatsapp_messages
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access whatsapp_contacts"
    ON public.whatsapp_contacts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session_name ON public.whatsapp_messages(session_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_to ON public.whatsapp_messages(from_number, to_number);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_session_name ON public.whatsapp_contacts(session_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_last_message ON public.whatsapp_contacts(last_message_timestamp DESC);