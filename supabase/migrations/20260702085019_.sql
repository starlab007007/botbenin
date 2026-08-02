
DROP POLICY IF EXISTS "agent-docs read own" ON storage.objects;
CREATE POLICY "agent-docs read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "agent-docs write own" ON storage.objects;
CREATE POLICY "agent-docs write own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "agent-docs delete own" ON storage.objects;
CREATE POLICY "agent-docs delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
;
