import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import {
  jsonError,
  jsonResponse,
  requireAuthOrGuestSession,
  requireSameAuthUser,
  waouhCorsHeaders,
} from "../_shared/waouh-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: waouhCorsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed");

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const sessionId: string | null = body?.sessionId || null;
    const claimedAuthUserId: string | null = body?.authUserId || null;

    // Sécurité : l'historique est lisible uniquement par :
    // 1) un utilisateur JWT authentifié correspondant à authUserId ; ou
    // 2) une session invitée dont x-waouh-session == sessionId.
    const auth = await requireAuthOrGuestSession(req, sessionId);
    if (!auth.ok) return auth.response;

    const authMismatch = requireSameAuthUser(claimedAuthUserId, auth.authUser?.id ?? null);
    if (authMismatch) return authMismatch;

    const effectiveAuthUserId = auth.authUser?.id ?? null;

    // Pagination.
    const rawLimit = Number(body?.limit ?? 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 10, 1), 200);
    const before: string | null = body?.before || null;
    const since: string | null = body?.since || null;
    const includeMeta = body?.includeMeta !== false;

    const userOrs: string[] = [];
    if (effectiveAuthUserId) userOrs.push(`auth_user_id.eq.${effectiveAuthUserId}`);
    if (auth.sessionValid && auth.bodySessionId) userOrs.push(`web_session_id.eq.${auth.bodySessionId}`);

    if (userOrs.length === 0) return jsonError(403, "missing_authorized_scope");

    const { data: users, error: usersErr } = await sb
      .from("waouh_users")
      .select("id, phone_number, auth_user_id, web_session_id, display_name")
      .or(userOrs.join(","));
    if (usersErr) throw usersErr;
    const userIds = (users || []).map((u: any) => u.id).filter(Boolean);

    // Messages: DESC + limit, then reverse ASC for client.
    let msgQuery = sb.from("waouh_messages")
      .select("id, conversation_id, user_id, web_session_id, phone_number, channel, direction, text, meta, attachments, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) msgQuery = msgQuery.lt("created_at", before);
    if (since) msgQuery = msgQuery.gte("created_at", since);

    const msgOrs: string[] = [];
    if (userIds.length) msgOrs.push(`user_id.in.(${userIds.join(",")})`);
    if (auth.sessionValid && auth.bodySessionId) msgOrs.push(`web_session_id.eq.${auth.bodySessionId}`);
    if (msgOrs.length) msgQuery = msgQuery.or(msgOrs.join(","));
    else msgQuery = msgQuery.eq("id", "00000000-0000-0000-0000-000000000000");

    const { data: messagesDesc, error: msgErr } = await msgQuery;
    if (msgErr) throw msgErr;
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
      if (auth.sessionValid && auth.bodySessionId) notifOrs.push(`web_session_id.eq.${auth.bodySessionId}`);
      if (notifOrs.length) {
        notifQuery = notifQuery.or(notifOrs.join(","));
        const { data: notifs, error: notifErr } = await notifQuery;
        if (notifErr) throw notifErr;
        notifications = notifs || [];
      }

      if (userIds.length) {
        const { data: convs, error: convErr } = await sb.from("waouh_conversations")
          .select("id, user_id, phone_number, channel, last_message, last_intent, last_direction, last_inbound_at, unread_count, updated_at, current_article_id")
          .in("user_id", userIds)
          .order("last_inbound_at", { ascending: false, nullsFirst: false })
          .limit(200);
        if (convErr) throw convErr;
        conversations = convs || [];
      }
    }

    return jsonResponse({
      ok: true,
      users: users || [],
      messages,
      hasMore,
      notifications,
      conversations,
      scope: {
        auth_user_id: effectiveAuthUserId,
        session_scoped: !!auth.sessionValid,
      },
    });
  } catch (e: any) {
    console.error("[waouh-history] error", e);
    return jsonError(500, "history_internal_error", e?.message ?? String(e));
  }
});
