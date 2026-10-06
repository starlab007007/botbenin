CREATE INDEX IF NOT EXISTS idx_waouh_articles_created_at_desc
  ON public.waouh_articles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waouh_buyer_profiles_created_at_desc
  ON public.waouh_buyer_profiles(created_at DESC);

ALTER POLICY "active articles public read"
ON public.waouh_articles
USING (
  status = 'active'
  OR (SELECT public.is_admin(auth.uid()))
);

ALTER POLICY "admin read buyer_profiles"
ON public.waouh_buyer_profiles
TO authenticated
USING ((SELECT public.is_admin(auth.uid())));

ALTER POLICY "admin read users"
ON public.waouh_users
TO authenticated
USING ((SELECT public.is_admin(auth.uid())));

ALTER POLICY "waouh_users session lookup token"
ON public.waouh_users
USING (
  web_session_id IS NOT NULL
  AND web_session_id = (
    SELECT NULLIF(
      (
        COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb
        ->> 'x-waouh-session'
      ),
      ''
    )
  )
);
