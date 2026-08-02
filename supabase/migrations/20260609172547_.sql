
-- 1) E2E test runs table
CREATE TABLE IF NOT EXISTS public.waouh_e2e_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario text NOT NULL,           -- 'A' | 'B' | 'C' | 'ALL'
  source text NOT NULL,             -- 'chat' | 'partner' | 'radar' | 'ALL'
  status text NOT NULL DEFAULT 'running', -- running | ok | partial | failed
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.waouh_e2e_test_runs TO authenticated;
GRANT ALL ON public.waouh_e2e_test_runs TO service_role;

ALTER TABLE public.waouh_e2e_test_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waouh_e2e_test_runs' AND policyname='admins read e2e runs') THEN
    CREATE POLICY "admins read e2e runs"
      ON public.waouh_e2e_test_runs
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_waouh_e2e_test_runs_started_at
  ON public.waouh_e2e_test_runs (started_at DESC);

-- 2) Promotion linking column on unified catalog
ALTER TABLE public.waouh_unified_catalog
  ADD COLUMN IF NOT EXISTS promoted_article_id uuid;

CREATE INDEX IF NOT EXISTS idx_waouh_unified_catalog_promoted
  ON public.waouh_unified_catalog (promoted_article_id);

-- 3) Radar enrichment marker
ALTER TABLE public.waouh_radar_signals
  ADD COLUMN IF NOT EXISTS needs_enrichment boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_waouh_radar_signals_needs_enrichment
  ON public.waouh_radar_signals (needs_enrichment) WHERE needs_enrichment = true;
;
