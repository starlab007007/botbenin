
CREATE TABLE IF NOT EXISTS public.waouh_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text,
  author_avatar_url text,
  type text NOT NULL CHECK (type IN ('sell','buy','announce')),
  title text NOT NULL,
  caption text,
  price_fcfa integer,
  location text,
  lat double precision,
  lng double precision,
  media_url text,
  media_kind text,
  media_urls text[] NOT NULL DEFAULT '{}'::text[],
  article_id uuid,
  waouh_code text,
  views_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.waouh_statuses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waouh_statuses TO authenticated;
GRANT ALL ON public.waouh_statuses TO service_role;

ALTER TABLE public.waouh_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "statuses_public_read_active" ON public.waouh_statuses;
CREATE POLICY "statuses_public_read_active" ON public.waouh_statuses
FOR SELECT USING (expires_at > now());

DROP POLICY IF EXISTS "statuses_owner_insert" ON public.waouh_statuses;
CREATE POLICY "statuses_owner_insert" ON public.waouh_statuses
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "statuses_owner_update" ON public.waouh_statuses;
CREATE POLICY "statuses_owner_update" ON public.waouh_statuses
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "statuses_owner_delete" ON public.waouh_statuses;
CREATE POLICY "statuses_owner_delete" ON public.waouh_statuses
FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS waouh_statuses_expires_idx ON public.waouh_statuses(expires_at);
CREATE INDEX IF NOT EXISTS waouh_statuses_type_idx ON public.waouh_statuses(type);
CREATE INDEX IF NOT EXISTS waouh_statuses_user_idx ON public.waouh_statuses(user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS waouh_statuses_set_updated_at ON public.waouh_statuses;
CREATE TRIGGER waouh_statuses_set_updated_at
BEFORE UPDATE ON public.waouh_statuses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
;
