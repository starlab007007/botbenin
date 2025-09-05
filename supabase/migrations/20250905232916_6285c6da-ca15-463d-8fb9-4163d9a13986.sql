-- Create a comprehensive table for storing WAHA sessions data
CREATE TABLE IF NOT EXISTS public.waha_sessions_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'DISCONNECTED',
  phone_number TEXT,
  account_info JSONB,
  metadata JSONB DEFAULT '{}',
  server_name TEXT DEFAULT 'WAHA',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.waha_sessions_data ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can manage WAHA sessions" 
ON public.waha_sessions_data 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_waha_sessions_data_updated_at
BEFORE UPDATE ON public.waha_sessions_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();