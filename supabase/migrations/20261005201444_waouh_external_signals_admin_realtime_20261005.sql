-- WAOUH admin Realtime for external commerce signals — 2026-10-05.
-- The Command Center subscribes to this table to refresh NEXUS telemetry.

GRANT SELECT ON TABLE public.waouh_external_commerce_signals TO authenticated;

DROP POLICY IF EXISTS "Admin read external commerce signals" ON public.waouh_external_commerce_signals;
CREATE POLICY "Admin read external commerce signals"
ON public.waouh_external_commerce_signals
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'super_admin')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='waouh_external_commerce_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_external_commerce_signals;
  END IF;
END $$;
