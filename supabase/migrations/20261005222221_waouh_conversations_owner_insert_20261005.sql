DROP POLICY IF EXISTS "waouh_conversations owner insert" ON public.waouh_conversations;
CREATE POLICY "waouh_conversations owner insert"
ON public.waouh_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.waouh_users wu
    WHERE wu.id = waouh_conversations.user_id
      AND wu.auth_user_id = (SELECT auth.uid())
  )
);
