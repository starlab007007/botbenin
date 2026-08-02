
ALTER TABLE public.waouh_ai_agents
  ADD COLUMN IF NOT EXISTS agent_type text NOT NULL DEFAULT 'commerce',
  ADD COLUMN IF NOT EXISTS paused_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS google_sheet_url text,
  ADD COLUMN IF NOT EXISTS website_url text;

DO $$ BEGIN
  ALTER TABLE public.waouh_ai_agents
    ADD CONSTRAINT waouh_ai_agents_agent_type_check
    CHECK (agent_type IN ('commerce','docs','website'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.waouh_ai_agents DROP CONSTRAINT IF EXISTS waouh_ai_agents_status_check;
ALTER TABLE public.waouh_ai_agents
  ADD CONSTRAINT waouh_ai_agents_status_check
  CHECK (status IN ('draft','training','active','paused','testing','deployed'));

ALTER TABLE public.waouh_ai_agent_conversations
  ADD COLUMN IF NOT EXISTS human_takeover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operator_messages jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.waouh_ai_agent_partner_products (
  agent_id uuid NOT NULL REFERENCES public.waouh_ai_agents(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.waouh_partner_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_ai_agent_partner_products TO authenticated;
GRANT ALL ON public.waouh_ai_agent_partner_products TO service_role;
ALTER TABLE public.waouh_ai_agent_partner_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own agent-product links"
    ON public.waouh_ai_agent_partner_products
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service manages links"
    ON public.waouh_ai_agent_partner_products
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_ai_agent_conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
;
