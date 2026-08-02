
-- 1. waouh_ai_agents
CREATE TABLE public.waouh_ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  waha_session_id UUID,
  waha_session_name TEXT,
  name TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'other',
  template_id TEXT,
  persona JSONB NOT NULL DEFAULT '{"tone":"friendly","emojis":true,"name":"Assistant"}'::jsonb,
  capabilities JSONB NOT NULL DEFAULT '{"qa":true,"sell":false,"appointments":false,"qualify":false,"handoff":true}'::jsonb,
  knowledge_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  system_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','training','active','paused')),
  stats JSONB NOT NULL DEFAULT '{"messages_handled":0,"handoffs":0,"conversions":0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_agents_user ON public.waouh_ai_agents(user_id);
CREATE INDEX idx_ai_agents_session ON public.waouh_ai_agents(waha_session_name) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_ai_agents TO authenticated;
GRANT ALL ON public.waouh_ai_agents TO service_role;
ALTER TABLE public.waouh_ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_agents_all" ON public.waouh_ai_agents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "service_agents_all" ON public.waouh_ai_agents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. waouh_ai_agent_products (mini-catalogue)
CREATE TABLE public.waouh_ai_agent_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.waouh_ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  price_fcfa INTEGER,
  description TEXT,
  photo_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_products_agent ON public.waouh_ai_agent_products(agent_id);
CREATE INDEX idx_agent_products_user ON public.waouh_ai_agent_products(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_ai_agent_products TO authenticated;
GRANT ALL ON public.waouh_ai_agent_products TO service_role;
ALTER TABLE public.waouh_ai_agent_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_agent_products_all" ON public.waouh_ai_agent_products FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "service_agent_products_all" ON public.waouh_ai_agent_products FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. waouh_ai_agent_chunks (RAG avec pgvector)
CREATE TABLE public.waouh_ai_agent_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.waouh_ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_chunks_agent ON public.waouh_ai_agent_chunks(agent_id);
CREATE INDEX idx_agent_chunks_embedding ON public.waouh_ai_agent_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_ai_agent_chunks TO authenticated;
GRANT ALL ON public.waouh_ai_agent_chunks TO service_role;
ALTER TABLE public.waouh_ai_agent_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_agent_chunks_all" ON public.waouh_ai_agent_chunks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "service_agent_chunks_all" ON public.waouh_ai_agent_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. waouh_ai_agent_conversations
CREATE TABLE public.waouh_ai_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.waouh_ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  wa_contact_phone TEXT NOT NULL,
  wa_contact_name TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  needs_handoff BOOLEAN NOT NULL DEFAULT false,
  handoff_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, wa_contact_phone)
);
CREATE INDEX idx_agent_conv_agent ON public.waouh_ai_agent_conversations(agent_id);
CREATE INDEX idx_agent_conv_user ON public.waouh_ai_agent_conversations(user_id);
CREATE INDEX idx_agent_conv_last ON public.waouh_ai_agent_conversations(last_activity DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_ai_agent_conversations TO authenticated;
GRANT ALL ON public.waouh_ai_agent_conversations TO service_role;
ALTER TABLE public.waouh_ai_agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_agent_conv_read" ON public.waouh_ai_agent_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "service_agent_conv_all" ON public.waouh_ai_agent_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Trigger updated_at (réutilise la fonction si elle existe déjà)
CREATE OR REPLACE FUNCTION public.tg_ai_agents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER waouh_ai_agents_updated BEFORE UPDATE ON public.waouh_ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.tg_ai_agents_updated_at();
CREATE TRIGGER waouh_ai_agent_products_updated BEFORE UPDATE ON public.waouh_ai_agent_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_ai_agents_updated_at();
CREATE TRIGGER waouh_ai_agent_conversations_updated BEFORE UPDATE ON public.waouh_ai_agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_ai_agents_updated_at();

-- 6. RPC de recherche vectorielle (top-k chunks pour un agent)
CREATE OR REPLACE FUNCTION public.match_agent_chunks(
  _agent_id UUID,
  _query_embedding vector(768),
  _match_count INTEGER DEFAULT 5
)
RETURNS TABLE(id UUID, content TEXT, source_type TEXT, similarity FLOAT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.content, c.source_type,
         1 - (c.embedding <=> _query_embedding) AS similarity
  FROM public.waouh_ai_agent_chunks c
  WHERE c.agent_id = _agent_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> _query_embedding
  LIMIT _match_count;
$$;
GRANT EXECUTE ON FUNCTION public.match_agent_chunks(UUID, vector, INTEGER) TO service_role, authenticated;
;
