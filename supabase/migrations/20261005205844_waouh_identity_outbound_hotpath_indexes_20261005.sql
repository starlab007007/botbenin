-- WAOUH identity and outbound hot-path indexes.
CREATE INDEX IF NOT EXISTS idx_waouh_users_auth_user_id
  ON public.waouh_users(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_waouh_outbound_to_user_created
  ON public.waouh_outbound_queue(to_user_id, created_at DESC)
  WHERE to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_waouh_outbound_web_session_created
  ON public.waouh_outbound_queue(web_session_id, created_at DESC)
  WHERE web_session_id IS NOT NULL;
