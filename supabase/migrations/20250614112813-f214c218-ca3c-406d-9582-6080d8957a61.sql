
-- 1. LEADS (CRM)
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, qualified, converted, lost
  source TEXT,
  owner_id UUID, -- assignable to a user
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb
);

-- RLS: Allow users to see and edit only their own leads (or those assigned to them)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their leads" ON public.leads
  FOR SELECT USING (user_id = auth.uid() OR owner_id = auth.uid());
CREATE POLICY "Users can modify their leads" ON public.leads
  FOR UPDATE USING (user_id = auth.uid() OR owner_id = auth.uid());
CREATE POLICY "Users can insert leads" ON public.leads
  FOR INSERT WITH CHECK (user_id = auth.uid() OR owner_id = auth.uid());
CREATE POLICY "Users can delete their leads" ON public.leads
  FOR DELETE USING (user_id = auth.uid());

-- 2. MARKETING CAMPAIGNS
-- If not present (we see `campaigns` table already, but let's ensure it's correct and add any missing columns)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS segment JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}'::jsonb;

-- RLS: Let users access/manage only their own campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can modify their campaigns" ON public.campaigns
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can create their own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their campaigns" ON public.campaigns
  FOR DELETE USING (user_id = auth.uid());

-- 3. Advanced Analytics/Insights (optional, for storing custom dashboard insights)
CREATE TABLE IF NOT EXISTS public.conversation_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL, -- e.g., 'keyword', 'intent', 'sentiment'
  summary TEXT,       -- insight summary
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.conversation_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own insights" ON public.conversation_insights
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own insights" ON public.conversation_insights
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can modify their insights" ON public.conversation_insights
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their insights" ON public.conversation_insights
  FOR DELETE USING (user_id = auth.uid());
