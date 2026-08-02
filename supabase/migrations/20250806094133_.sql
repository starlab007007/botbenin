-- Create the social_sharing_campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.social_sharing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID DEFAULT NULL,
  campaign_name TEXT NOT NULL,
  campaign_description TEXT DEFAULT '',
  custom_message TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  target_platforms TEXT[] DEFAULT '{}',
  tracking_parameters JSONB DEFAULT '{}',
  preview_images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.social_sharing_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for the campaigns table
CREATE POLICY "Users can view their own campaigns" 
ON public.social_sharing_campaigns 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own campaigns" 
ON public.social_sharing_campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own campaigns" 
ON public.social_sharing_campaigns 
FOR UPDATE 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own campaigns" 
ON public.social_sharing_campaigns 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_social_campaigns_owner_id ON public.social_sharing_campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_created_at ON public.social_sharing_campaigns(created_at DESC);;
