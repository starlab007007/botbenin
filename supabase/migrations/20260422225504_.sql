
-- Sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1;

-- Tables
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT UNIQUE,
  user_id UUID NOT NULL,
  assigned_to UUID,
  category TEXT NOT NULL DEFAULT 'incident',
  severity TEXT NOT NULL DEFAULT 'mineure',
  status TEXT NOT NULL DEFAULT 'ouvert',
  module TEXT,
  site TEXT,
  profile TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reproduction_steps TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  origin TEXT NOT NULL DEFAULT 'manual',
  chatbot_session_id UUID,
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  resolution_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_severity ON public.support_tickets(severity);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS public.support_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolved BOOLEAN DEFAULT false,
  escalated_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  confidence_score NUMERIC,
  category_detected TEXT,
  module_detected TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_chat_sessions_user ON public.support_chat_sessions(user_id);

CREATE TABLE IF NOT EXISTS public.support_knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  module TEXT,
  category TEXT,
  source TEXT DEFAULT 'Guide SIGDSTS v11.0',
  keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_kb_active ON public.support_knowledge_articles(is_active);
CREATE INDEX IF NOT EXISTS idx_support_kb_module ON public.support_knowledge_articles(module);

CREATE TABLE IF NOT EXISTS public.support_sla_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  threshold_minutes INT,
  breached BOOLEAN DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_sla_ticket ON public.support_sla_events(ticket_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.support_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_set_updated_at();

DROP TRIGGER IF EXISTS trg_support_chat_sessions_updated ON public.support_chat_sessions;
CREATE TRIGGER trg_support_chat_sessions_updated BEFORE UPDATE ON public.support_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.support_set_updated_at();

DROP TRIGGER IF EXISTS trg_support_kb_updated ON public.support_knowledge_articles;
CREATE TRIGGER trg_support_kb_updated BEFORE UPDATE ON public.support_knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.support_set_updated_at();

-- Auto ticket_number + sla_due_at
CREATE OR REPLACE FUNCTION public.support_ticket_before_insert()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  next_num BIGINT;
  sla_minutes INT;
BEGIN
  IF NEW.ticket_number IS NULL THEN
    next_num := nextval('public.support_ticket_seq');
    NEW.ticket_number := 'SUP-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  IF NEW.sla_due_at IS NULL THEN
    sla_minutes := CASE NEW.severity
      WHEN 'critique' THEN 120
      WHEN 'majeure'  THEN 240
      ELSE 1440
    END;
    NEW.sla_due_at := NEW.created_at + (sla_minutes || ' minutes')::interval;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_support_ticket_before_insert ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_before_insert BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_ticket_before_insert();

-- Helpers using existing has_role(uuid, text)
CREATE OR REPLACE FUNCTION public.is_support_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name IN ('admin', 'super_admin', 'support')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_support_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name IN ('admin', 'super_admin')
  )
$$;

-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_sla_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select_own_or_staff" ON public.support_tickets;
CREATE POLICY "support_tickets_select_own_or_staff" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to OR public.is_support_staff(auth.uid()));

DROP POLICY IF EXISTS "support_tickets_insert_own" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_own" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_tickets_update_own_or_staff" ON public.support_tickets;
CREATE POLICY "support_tickets_update_own_or_staff" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to OR public.is_support_staff(auth.uid()));

DROP POLICY IF EXISTS "support_tickets_delete_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_delete_admin" ON public.support_tickets
  FOR DELETE TO authenticated USING (public.is_support_admin(auth.uid()));

DROP POLICY IF EXISTS "support_messages_select" ON public.support_ticket_messages;
CREATE POLICY "support_messages_select" ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id
      AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR public.is_support_staff(auth.uid())))
    AND (NOT is_internal_note OR public.is_support_staff(auth.uid()))
  );

DROP POLICY IF EXISTS "support_messages_insert" ON public.support_ticket_messages;
CREATE POLICY "support_messages_insert" ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id
      AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR public.is_support_staff(auth.uid())))
  );

DROP POLICY IF EXISTS "support_chat_select" ON public.support_chat_sessions;
CREATE POLICY "support_chat_select" ON public.support_chat_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_support_staff(auth.uid()));

DROP POLICY IF EXISTS "support_chat_insert" ON public.support_chat_sessions;
CREATE POLICY "support_chat_insert" ON public.support_chat_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "support_chat_update" ON public.support_chat_sessions;
CREATE POLICY "support_chat_update" ON public.support_chat_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_support_staff(auth.uid()));

DROP POLICY IF EXISTS "support_chat_insert_anon" ON public.support_chat_sessions;
CREATE POLICY "support_chat_insert_anon" ON public.support_chat_sessions
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "support_kb_select_public" ON public.support_knowledge_articles;
CREATE POLICY "support_kb_select_public" ON public.support_knowledge_articles
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_support_admin(auth.uid()));

DROP POLICY IF EXISTS "support_kb_admin_all" ON public.support_knowledge_articles;
CREATE POLICY "support_kb_admin_all" ON public.support_knowledge_articles
  FOR ALL TO authenticated
  USING (public.is_support_admin(auth.uid()))
  WITH CHECK (public.is_support_admin(auth.uid()));

DROP POLICY IF EXISTS "support_sla_select_staff" ON public.support_sla_events;
CREATE POLICY "support_sla_select_staff" ON public.support_sla_events
  FOR SELECT TO authenticated
  USING (
    public.is_support_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "support_sla_insert_staff" ON public.support_sla_events;
CREATE POLICY "support_sla_insert_staff" ON public.support_sla_events
  FOR INSERT TO authenticated WITH CHECK (public.is_support_staff(auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "support_attachments_user_read" ON storage.objects;
CREATE POLICY "support_attachments_user_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'support-attachments'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_support_staff(auth.uid())));

DROP POLICY IF EXISTS "support_attachments_user_insert" ON storage.objects;
CREATE POLICY "support_attachments_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "support_attachments_user_delete" ON storage.objects;
CREATE POLICY "support_attachments_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'support-attachments'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_support_admin(auth.uid())));

-- Realtime
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_ticket_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
;
