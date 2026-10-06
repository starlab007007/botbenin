DROP POLICY IF EXISTS "admins delete e2e runs" ON public.waouh_e2e_test_runs;
CREATE POLICY "admins delete e2e runs"
ON public.waouh_e2e_test_runs
FOR DELETE
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin')
  OR public.has_role((SELECT auth.uid()), 'super_admin')
);
