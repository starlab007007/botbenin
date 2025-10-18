-- Table pour stocker les credentials Facebook des utilisateurs
CREATE TABLE IF NOT EXISTS public.facebook_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  page_id TEXT,
  page_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.facebook_credentials ENABLE ROW LEVEL SECURITY;

-- Users can manage their own Facebook credentials
CREATE POLICY "Users can manage their own Facebook credentials"
  ON public.facebook_credentials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table pour tracker les publications Facebook
CREATE TABLE IF NOT EXISTS public.facebook_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.generated_videos(id) ON DELETE CASCADE,
  facebook_post_id TEXT,
  page_id TEXT,
  post_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.facebook_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own posts
CREATE POLICY "Users can manage their own Facebook posts"
  ON public.facebook_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_facebook_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facebook_credentials_updated_at
  BEFORE UPDATE ON public.facebook_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_credentials_updated_at();