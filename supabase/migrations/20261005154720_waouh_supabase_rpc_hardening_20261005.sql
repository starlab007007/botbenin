-- WAOUH Supabase RPC hardening — pass 2
-- Backend-only queue/audit primitives must never be callable from PostgREST clients.

REVOKE ALL ON FUNCTION public.waouh_enqueue_outbound(text,uuid,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_enqueue_outbound(text,uuid,text,jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_enqueue_outbound(text,uuid,text,jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.waouh_enqueue_outbound_v2(text,uuid,text,jsonb,text,text,text,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_enqueue_outbound_v2(text,uuid,text,jsonb,text,text,text,uuid,uuid,text,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_enqueue_outbound_v2(text,uuid,text,jsonb,text,text,text,uuid,uuid,text,text) TO service_role;

REVOKE ALL ON FUNCTION public.waouh_record_commerce_event(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_record_commerce_event(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waouh_record_commerce_event(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb) TO service_role;

-- Browser RPC: keep authenticated access, but bind the conversation to the
-- current auth user (or an admin). Anonymous guests must use the Edge API,
-- where the x-waouh-session token can be validated.
CREATE OR REPLACE FUNCTION public.waouh_mark_conversation_read(p_conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.waouh_conversations c
      JOIN public.waouh_users u ON u.id = c.user_id
      WHERE c.id = p_conv_id
        AND u.auth_user_id = v_uid
    )
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.waouh_conversations
     SET unread_count = 0,
         updated_at = now()
   WHERE id = p_conv_id;

  UPDATE public.waouh_notifications
     SET opened = true,
         read_at = COALESCE(read_at, now())
   WHERE conversation_id = p_conv_id
     AND COALESCE(opened, false) = false;
END;
$function$;

REVOKE ALL ON FUNCTION public.waouh_mark_conversation_read(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.waouh_mark_conversation_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.waouh_mark_conversation_read(uuid) TO authenticated, service_role;
