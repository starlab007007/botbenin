REVOKE EXECUTE ON FUNCTION public.waouh_admin_data_backfill(text, int4) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "All auth read commission" ON public.waouh_commission_settings;
CREATE POLICY "Non-anonymous users read commission" ON public.waouh_commission_settings FOR SELECT TO authenticated
USING (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS "Authenticated users can create fingerprints" ON public.visitor_fingerprints;
CREATE POLICY "Authenticated users can create fingerprints" ON public.visitor_fingerprints FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert debug logs" ON public.debug_session_logs;
CREATE POLICY "System can insert debug logs" ON public.debug_session_logs FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert WhatsApp messages" ON public.whatsapp_messages;
CREATE POLICY "System can insert WhatsApp messages" ON public.whatsapp_messages FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can update metrics" ON public.suggestion_metrics;
CREATE POLICY "System can update metrics" ON public.suggestion_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert access logs" ON public.access_logs;
CREATE POLICY "Users insert own access logs" ON public.access_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can update sends" ON public.qualification_campaign_sends;
CREATE POLICY "Service role can update sends" ON public.qualification_campaign_sends FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Owners can update their campaign sends" ON public.qualification_campaign_sends FOR UPDATE TO authenticated
USING (campaign_id IN (SELECT id FROM public.qualification_campaigns WHERE user_id = auth.uid()))
WITH CHECK (campaign_id IN (SELECT id FROM public.qualification_campaigns WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "settings public read" ON public.waouh_settings;
CREATE POLICY "Admins read settings" ON public.waouh_settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view limits" ON public.ia_creator_usage_limits;
CREATE POLICY "Signed-in users can view limits" ON public.ia_creator_usage_limits FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public upload on public-media" ON storage.objects;
CREATE POLICY "Allow public upload on public-media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public-media' AND owner = auth.uid());