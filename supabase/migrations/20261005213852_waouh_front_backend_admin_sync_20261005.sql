-- WAOUH front/backend/admin synchronization.
-- 1) Every table subscribed by active Web/mobile/admin code must be present in
--    the Supabase Realtime publication. RLS remains the authorization layer.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'waouh_ai_agent_conversations',
    'waouh_ai_agents',
    'waouh_articles',
    'waouh_conversations',
    'waouh_deals',
    'waouh_diffusion_approvals',
    'waouh_messages',
    'waouh_notifications',
    'waouh_outbound_queue',
    'waouh_partner_activity',
    'waouh_partner_products',
    'waouh_partner_sales',
    'waouh_radar_signals',
    'waouh_statuses',
    'waouh_transactions',
    'whatsapp_accounts',
    'waouh_external_commerce_signals',
    'waouh_negotiations',
    'waouh_agent_approvals',
    'waouh_radar_api_configs',
    'waouh_admin_module_controls'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_tables p
         WHERE p.pubname='supabase_realtime'
           AND p.schemaname='public'
           AND p.tablename=t
       )
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "admins read all agent approvals" ON public.waouh_agent_approvals;
CREATE POLICY "admins read all agent approvals"
ON public.waouh_agent_approvals
FOR SELECT
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin')
  OR public.has_role((SELECT auth.uid()), 'super_admin')
);

GRANT UPDATE (auth_user_id) ON TABLE public.waouh_users TO authenticated;
GRANT INSERT (auth_user_id, web_session_id, display_name, phone_number, channel)
  ON TABLE public.waouh_users TO authenticated;

DROP POLICY IF EXISTS "waouh_users insert self auth" ON public.waouh_users;
CREATE POLICY "waouh_users insert self auth"
ON public.waouh_users
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = auth_user_id);

GRANT UPDATE (opened) ON TABLE public.waouh_notifications TO anon, authenticated;

DROP POLICY IF EXISTS "waouh_conversations owner read" ON public.waouh_conversations;
CREATE POLICY "waouh_conversations owner read"
ON public.waouh_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.waouh_users wu
    WHERE wu.id = waouh_conversations.user_id
      AND wu.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "waouh_conversations owner update" ON public.waouh_conversations;
CREATE POLICY "waouh_conversations owner update"
ON public.waouh_conversations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.waouh_users wu
    WHERE wu.id = waouh_conversations.user_id
      AND wu.auth_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.waouh_users wu
    WHERE wu.id = waouh_conversations.user_id
      AND wu.auth_user_id = (SELECT auth.uid())
  )
);
