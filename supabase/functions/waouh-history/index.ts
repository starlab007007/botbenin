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
    // Pagination
    const rawLimit = Number(body?.limit ?? 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 10, 1), 200);
    const before: string | null = body?.before || null; // ISO timestamp cursor
    const since: string | null = body?.since || null; // ISO timestamp lower bound (new-thread cutoff)
    const includeMeta = body?.includeMeta !== false; // notifications/conversations only on initial load

    if (!sessionId && !authUserId && !phoneNumber) {
      return new Response(JSON.stringify({ ok: false, error: "missing identifier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const useAuth = !!authUserId;
    const ors: string[] = [];
    if (useAuth) ors.push(`auth_user_id.eq.${authUserId}`);
    else if (sessionId) ors.push(`web_session_id.eq.${sessionId}`);
    if (!useAuth && phoneNumber) ors.push(`phone_number.eq.${phoneNumber}`);

    const { data: users, error: usersErr } = await sb
      .from("waouh_users")
      .select("id, phone_number, auth_user_id, web_session_id, display_name")
      .or(ors.join(","));
    if (usersErr) throw usersErr;
    const userIds = (users || []).map((u: any) => u.id);

    // Messages: DESC + limit, then reverse to ASC for the client
    let msgQuery = sb.from("waouh_messages")
      .select("id, conversation_id, thread_id, user_id, web_session_id, phone_number, channel, direction, text, meta, attachments, created_at")
      .is("thread_id", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) msgQuery = msgQuery.lt("created_at", before);
    if (since) msgQuery = msgQuery.gte("created_at", since);
    const msgOrs: string[] = [];
    if (userIds.length) msgOrs.push(`user_id.in.(${userIds.join(",")})`);
    if (!useAuth && sessionId) msgOrs.push(`web_session_id.eq.${sessionId}`);
    if (msgOrs.length) msgQuery = msgQuery.or(msgOrs.join(","));
    const { data: messagesDesc } = await msgQuery;
    const messages = (messagesDesc || []).slice().reverse();
    const hasMore = (messagesDesc || []).length === limit;

    let notifications: any[] = [];
    let conversations: any[] = [];
    if (includeMeta) {
      let notifQuery = sb.from("waouh_notifications")
        .select("id, user_id, conversation_id, notification_type, channel, payload, sent_at, opened, read_at, web_session_id, article_id")
        .order("sent_at", { ascending: false })
        .limit(200);
      const notifOrs: string[] = [];
      if (userIds.length) notifOrs.push(`user_id.in.(${userIds.join(",")})`);
      if (!useAuth && sessionId) notifOrs.push(`web_session_id.eq.${sessionId}`);
      if (notifOrs.length) notifQuery = notifQuery.or(notifOrs.join(","));
      const { data: notifs } = await notifQuery;
      notifications = notifs || [];

      if (userIds.length) {
        const { data: convs } = await sb.from("waouh_conversations")
          .select("id, user_id, phone_number, channel, last_message, last_intent, last_direction, last_inbound_at, unread_count, updated_at, current_article_id")
          .in("user_id", userIds)
          .order("last_inbound_at", { ascending: false, nullsFirst: false })
          .limit(200);
        conversations = convs || [];
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      users: users || [],
      messages,
      hasMore,
      notifications,
      conversations,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-history] error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
