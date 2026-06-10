CREATE TABLE public.waouh_price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.waouh_articles(id) ON DELETE SET NULL,
  query text NOT NULL,
  city text,
  category text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence text NOT NULL DEFAULT 'low',
  n_internal int NOT NULL DEFAULT 0,
  n_radar int NOT NULL DEFAULT 0,
  n_web int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.waouh_price_snapshots TO authenticated;
GRANT ALL ON public.waouh_price_snapshots TO service_role;

ALTER TABLE public.waouh_price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read price snapshots"
  ON public.waouh_price_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages snapshots"
  ON public.waouh_price_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_waouh_price_snapshots_article ON public.waouh_price_snapshots(article_id, created_at DESC);
CREATE INDEX idx_waouh_price_snapshots_query ON public.waouh_price_snapshots(query, created_at DESC);