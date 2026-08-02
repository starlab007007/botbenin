-- Table to record explicit buyer interests on articles (independent of chat messages)
CREATE TABLE IF NOT EXISTS public.waouh_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL,
  buyer_user_id UUID,
  buyer_profile_id UUID,
  seller_user_id UUID,
  source TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waouh_interests_dedupe UNIQUE (article_id, buyer_user_id)
);

GRANT SELECT, INSERT ON public.waouh_interests TO authenticated;
GRANT ALL ON public.waouh_interests TO service_role;

ALTER TABLE public.waouh_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers see their own interests"
ON public.waouh_interests FOR SELECT
TO authenticated
USING (
  buyer_user_id IN (SELECT id FROM public.waouh_users WHERE auth_user_id = auth.uid())
  OR seller_user_id IN (SELECT id FROM public.waouh_users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Service role full access waouh_interests"
ON public.waouh_interests FOR ALL
TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_waouh_interests_article ON public.waouh_interests(article_id);
CREATE INDEX IF NOT EXISTS idx_waouh_interests_buyer ON public.waouh_interests(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_waouh_interests_seller ON public.waouh_interests(seller_user_id);

-- Detach legacy anonymous session ids from accounts that are now authenticated,
-- so future logins don't fuse histories from different accounts on the same browser.
UPDATE public.waouh_users
SET web_session_id = NULL
WHERE auth_user_id IS NOT NULL AND web_session_id IS NOT NULL;
;
