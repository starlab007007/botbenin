import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { resolveSiblingUserIds } from "../_shared/waouh-identity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);
    const body = await req.json().catch(() => ({}));
    const threadId: string | null = body?.threadId ?? null;
    const articleId: string | null = body?.articleId ?? null;
    const matchKey: string | null = body?.matchKey ?? null;
    const sessionId: string | null = body?.sessionId ?? null;
    const counterpartUserId: string | null = body?.counterpartUserId ?? null;
    const buyerUserId: string | null = body?.buyerUserId ?? null;
    const sellerUserId: string | null = body?.sellerUserId ?? null;
    const before: string | null = body?.before ?? null;
    const rawLimit = Number(body?.limit ?? 80);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 250, 1), 300);

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    let authUserId: string | null = null;
    if (token && token !== key) {
      const { data } = await sb.auth.getUser(token);
      authUserId = data.user?.id ?? null;
    }
    if (!authUserId && !sessionId) {
      return json({ ok: false, error: "viewer identity required" }, 401);
    }

    const viewerFilters: string[] = [];
    if (authUserId) {
      viewerFilters.push(`auth_user_id.eq.${authUserId}`);
    } else if (sessionId) {
      viewerFilters.push(`web_session_id.eq.${sessionId}`);
    }
    const { data: users, error: usersError } = await sb
      .from("waouh_users")
      .select("id,auth_user_id,web_session_id,phone_number")
      .or(viewerFilters.join(","))
      .limit(100);
    if (usersError) throw usersError;
    const viewerSet = new Set((users || []).map((item: any) => item.id));
    for (const viewer of users || []) {
      for (const siblingId of await resolveSiblingUserIds(sb, viewer as any)) {
        viewerSet.add(siblingId);
      }
    }
    const viewerIds = [...viewerSet];
    if (viewerIds.length === 0) return json({ ok: false, error: "viewer not linked" }, 403);

    if (threadId) {
      const { data: thread, error: threadError } = await sb
        .from("waouh_chat_threads")
        .select("id,thread_key,thread_type,article_id,buyer_user_id,seller_user_id,owner_user_id,status")
        .eq("id", threadId)
        .maybeSingle();
      if (threadError) throw threadError;
      if (!thread) return json({ ok: false, error: "thread not found" }, 404);
      const participants = [thread.buyer_user_id, thread.seller_user_id, thread.owner_user_id]
        .filter(Boolean);
      if (!participants.some((id: string) => viewerIds.includes(id))) {
        return json({ ok: false, error: "thread access denied" }, 403);
      }
      if (articleId && thread.article_id && articleId !== thread.article_id) {
        return json({ ok: false, error: "article/thread mismatch" }, 409);
      }

      let query: any = sb
        .from("waouh_messages")
        .select("id,conversation_id,thread_id,direction,text,created_at,attachments,meta,article_id,user_id,web_session_id")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false })
        .limit(limit * 2);
      if (before) query = query.lt("created_at", before);
      const { data: rows, error } = await query;
      if (error) throw error;
      const visibleRows = (rows || []).filter((row: any) =>
        viewerIds.includes(row.user_id) || (!authUserId && !!sessionId && row.web_session_id === sessionId)
      ).slice(0, limit);

      let seedNotification: any = null;
      const { data: seeds } = await sb
        .from("waouh_notifications")
        .select("sent_at,notification_type,payload")
        .eq("thread_id", threadId)
        .or(`user_id.in.(${viewerIds.join(",")})${!authUserId && sessionId ? `,web_session_id.eq.${sessionId}` : ""}`)
        .order("sent_at", { ascending: false })
        .limit(1);
      if (seeds?.[0]) seedNotification = seeds[0];

      return json({
        ok: true,
        messages: visibleRows.slice().reverse(),
        hasMore: (rows || []).length === limit * 2 || visibleRows.length === limit,
        thread,
        seedNotification,
        viewer: { userIds: viewerIds, authUserId, sessionId },
        synced_at: new Date().toISOString(),
      });
    }

    // Compatibilité contrôlée avec les anciennes lignes. Aucun retour par
    // article seul : il faut une clé de match et les deux parties explicites.
    if (!articleId || !matchKey || !buyerUserId || !sellerUserId) {
      return json({
        ok: true,
        messages: [],
        hasMore: false,
        legacy: true,
        reason: "thread_id required for isolated history",
      });
    }
    if (!viewerIds.includes(buyerUserId) && !viewerIds.includes(sellerUserId)) {
      return json({ ok: false, error: "legacy match access denied" }, 403);
    }
    let legacyQuery: any = sb
      .from("waouh_messages")
      .select("id,conversation_id,thread_id,direction,text,created_at,attachments,meta,article_id,user_id,web_session_id")
      .or(`article_id.eq.${articleId},meta->>article_id.eq.${articleId}`)
      .order("created_at", { ascending: false })
      .limit(limit * 3);
    if (before) legacyQuery = legacyQuery.lt("created_at", before);
    const { data: legacyRows, error: legacyError } = await legacyQuery;
    if (legacyError) throw legacyError;
    const exact = (legacyRows || []).filter((row: any) => {
      const meta = row?.meta || {};
      const exactKey = meta.match_key === matchKey;
      const exactPair = meta.buyer_user_id === buyerUserId && meta.seller_user_id === sellerUserId;
      const viewerOwns = viewerIds.includes(row.user_id) || (!authUserId && !!sessionId && row.web_session_id === sessionId);
      const counterpartMatches = !counterpartUserId ||
        meta.counterpart_user_id === counterpartUserId ||
        meta.buyer_user_id === counterpartUserId ||
        meta.seller_user_id === counterpartUserId;
      return viewerOwns && counterpartMatches && (exactKey || exactPair);
    }).slice(0, limit);
    return json({
      ok: true,
      messages: exact.slice().reverse(),
      hasMore: exact.length === limit,
      legacy: true,
      viewer: { userIds: viewerIds, authUserId, sessionId },
    });
  } catch (error) {
    console.error("[waouh-match-history]", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});
