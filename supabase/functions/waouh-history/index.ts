import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    const body = await req.json().catch(() => ({}));
    const sessionId: string | null = body?.sessionId || null;
    const authUserId: string | null = body?.authUserId || null;
    const phoneNumber: string | null = body?.phoneNumber || null;

    if (!sessionId && !authUserId && !phoneNumber) {
      return new Response(JSON.stringify({ ok: false, error: "missing identifier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve all waouh_users.id linked to this caller (web_session_id ∪ auth_user_id ∪ phone)
    const ors: string[] = [];
    if (sessionId) ors.push(`web_session_id.eq.${sessionId}`);
    if (authUserId) ors.push(`auth_user_id.eq.${authUserId}`);
    if (phoneNumber) ors.push(`phone_number.eq.${phoneNumber}`);

    const { data: users, error: usersErr } = await sb
      .from("waouh_users")
      .select("id, phone_number, auth_user_id, web_session_id, display_name")
      .or(ors.join(","));
    if (usersErr) throw usersErr;
    const userIds = (users || []).map((u: any) => u.id);

    // Messages: by user_id IN userIds OR by web_session_id
    let msgQuery = sb.from("waouh_messages")
      .select("id, conversation_id, user_id, web_session_id, phone_number, channel, direction, text, meta, attachments, created_at")
      .order("created_at", { ascending: true })
      .limit(1000);
    const msgOrs: string[] = [];
    if (userIds.length) msgOrs.push(`user_id.in.(${userIds.join(",")})`);
    if (sessionId) msgOrs.push(`web_session_id.eq.${sessionId}`);
    if (msgOrs.length) msgQuery = msgQuery.or(msgOrs.join(","));
    const { data: messages } = await msgQuery;

    // Notifications
    let notifQuery = sb.from("waouh_notifications")
      .select("id, user_id, conversation_id, notification_type, channel, payload, sent_at, opened, read_at, web_session_id, article_id")
      .order("sent_at", { ascending: false })
      .limit(200);
    const notifOrs: string[] = [];
    if (userIds.length) notifOrs.push(`user_id.in.(${userIds.join(",")})`);
    if (sessionId) notifOrs.push(`web_session_id.eq.${sessionId}`);
    if (notifOrs.length) notifQuery = notifQuery.or(notifOrs.join(","));
    const { data: notifications } = await notifQuery;

    // Conversations
    let conversations: any[] = [];
    if (userIds.length) {
      const { data: convs } = await sb.from("waouh_conversations")
        .select("id, user_id, phone_number, channel, last_message, last_intent, last_direction, last_inbound_at, unread_count, updated_at, current_article_id")
        .in("user_id", userIds)
        .order("last_inbound_at", { ascending: false, nullsFirst: false })
        .limit(200);
      conversations = convs || [];
    }

    return new Response(JSON.stringify({
      ok: true,
      users: users || [],
      messages: messages || [],
      notifications: notifications || [],
      conversations,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-history] error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
