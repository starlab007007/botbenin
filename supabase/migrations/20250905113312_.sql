-- Table pour enregistrer les messages envoyés via WAHA (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS public.waha_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'sent',
  waha_response JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waha_message_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their WAHA message logs" 
ON public.waha_message_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their WAHA message logs" 
ON public.waha_message_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_waha_message_logs_user_id ON public.waha_message_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_waha_message_logs_session_name ON public.waha_message_logs(session_name);;
