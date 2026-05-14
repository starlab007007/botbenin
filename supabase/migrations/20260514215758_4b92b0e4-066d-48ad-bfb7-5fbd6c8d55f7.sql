
ALTER TABLE public.waouh_users
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS web_session_id text UNIQUE;

ALTER TABLE public.waouh_users ALTER COLUMN phone_number DROP NOT NULL;

ALTER TABLE public.waouh_conversations
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp';

CREATE TABLE IF NOT EXISTS public.waouh_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.waouh_conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.waouh_users(id) ON DELETE CASCADE,
  web_session_id text,
  phone_number text,
  channel text NOT NULL DEFAULT 'web',
  direction text NOT NULL CHECK (direction IN ('in','out')),
  text text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waouh_messages_session_idx ON public.waouh_messages(web_session_id, created_at);
CREATE INDEX IF NOT EXISTS waouh_messages_conv_idx ON public.waouh_messages(conversation_id, created_at);

ALTER TABLE public.waouh_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waouh_messages public read by session"
  ON public.waouh_messages FOR SELECT
  USING (web_session_id IS NOT NULL);

CREATE POLICY "waouh_messages admin read all"
  ON public.waouh_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "waouh_messages anon insert"
  ON public.waouh_messages FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_messages;
ALTER TABLE public.waouh_messages REPLICA IDENTITY FULL;
