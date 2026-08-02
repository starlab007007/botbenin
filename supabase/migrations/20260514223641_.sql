
CREATE OR REPLACE FUNCTION public.waouh_link_session(p_session_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.waouh_users
    SET auth_user_id = p_user_id
    WHERE web_session_id = p_session_id AND auth_user_id IS NULL;

  UPDATE public.waouh_messages
    SET user_id = COALESCE(user_id, p_user_id)
    WHERE web_session_id = p_session_id;
END;
$$;
;
