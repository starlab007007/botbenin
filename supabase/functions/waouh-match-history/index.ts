// Source-of-truth loader for WaouhMatchChatWindow.
// Returns the full per-article chat history for the calling viewer
// (web session + linked waouh_users rows) regardless of timing/race
// conditions on the client. The window uses this to render history
// authoritatively from DB instead of relying on localStorage cache.
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
    const articleId: string | null = body?.articleId ?? null;
    const sessionId: string | null = body?.sessionId ?? null;
    const authUserId: string | null = body?.authUserId ?? null;
    const role: "buyer" | "seller" = body?.role === "seller" ? "seller" : "buyer";
    const before: string | null = body?.before ?? null;
    const rawLimit = Number(body?.limit ?? 30);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 30, 1), 200);
    const includeMeta = body?.includeMeta !== false;
    const notificationId: string | null = body?.notificationId ?? null;

    if (!articleId) {
      return new Response(JSON.stringify({ ok: false, error: "missing articleId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!sessionId && !authUserId) {
      return new Response(JSON.stringify({ ok: false, error: "missing viewer identity" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Resolve every waouh_users.id linked to this viewer (auth user OR web session).
    const ors: string[] = [];
    if (authUserId) ors.push(`auth_user_id.eq.${authUserId}`);
    if (sessionId) ors.push(`web_session_id.eq.${sessionId}`);
    const { data: users } = await sb
      .from("waouh_users")
      .select("id, auth_user_id, web_session_id, phone_number")
      .or(ors.join(","))
      .limit(50);
    const userIds = Array.from(new Set((users ?? []).map((u: any) => u.id)));

    // 2) Pull article-scoped messages for that viewer. Server-side OR handles
    //    legacy rows where article_id is only in meta.
    let q: any = sb
      .from("waouh_messages")
      .select("id,direction,text,created_at,attachments,meta,article_id,user_id,web_session_id")
      .or(`article_id.eq.${articleId},meta->>article_id.eq.${articleId}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data: rowsRaw, error: rowsErr } = await q;
    if (rowsErr) throw rowsErr;

    // 3) Filter by viewer ownership server-side (more reliable than .or chaining).
    const userIdSet = new Set(userIds);
    const rows = (rowsRaw ?? []).filter((m: any) => {
      if (sessionId && m.web_session_id === sessionId) return true;
      if (m.user_id && userIdSet.has(m.user_id)) return true;
      return false;
    });
    const messages = rows.slice().reverse(); // ASC for client
    const hasMore = (rowsRaw ?? []).length === limit;

    // 4) Optional meta: article status + seed notification.
    let articleStatus: string | null = null;
    let seedNotification: { sent_at: string; notification_type: string; text: string | null } | null = null;
    if (includeMeta) {
      const { data: art } = await sb
        .from("waouh_articles")
        .select("status")
        .eq("id", articleId)
        .maybeSingle();
      articleStatus = (art as any)?.status ?? null;

      let seedRaw: any = null;
      if (notificationId) {
        const { data } = await sb
          .from("waouh_notifications")
          .select("sent_at,notification_type,payload")
          .eq("id", notificationId)
          .maybeSingle();
        seedRaw = data;
      } else {
        const types = role === "seller"
          ? ["new_buyer", "match", "match_seller", "radar_match"]
          : ["match", "match_buyer", "radar_match"];
        let nq: any = sb
          .from("waouh_notifications")
          .select("sent_at,notification_type,payload")
          .eq("article_id", articleId)
          .in("notification_type", types)
          .order("sent_at", { ascending: false })
          .limit(1);
        if (userIds.length) nq = nq.or(`user_id.in.(${userIds.join(",")}),web_session_id.eq.${sessionId ?? "__none__"}`);
        const { data } = await nq;
        seedRaw = Array.isArray(data) ? data[0] : data;
      }
      if (seedRaw) {
        seedNotification = {
          sent_at: seedRaw.sent_at,
          notification_type: seedRaw.notification_type,
          text: (seedRaw.payload as any)?.text ?? null,
        };
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      messages,
      hasMore,
      articleStatus,
      seedNotification,
      viewer: { userIds, sessionId, authUserId },
      synced_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-match-history] error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
