GRANT UPDATE, DELETE ON public.wa_send_jobs TO authenticated;

DROP POLICY IF EXISTS "own jobs update" ON public.wa_send_jobs;
CREATE POLICY "own jobs update"
ON public.wa_send_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own jobs delete" ON public.wa_send_jobs;
CREATE POLICY "own jobs delete"
ON public.wa_send_jobs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);;
