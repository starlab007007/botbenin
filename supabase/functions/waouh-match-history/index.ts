import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-waouh-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown): string | null => {
  const text = `${value ?? ""}`.trim();
  return text && text !== "null" ? text : null;
};

const threadFrom = (row: any): string | null =>
  clean(
    row?.thread_id ??
      row?.threadId ??
      row?.meta?.thread_id ??
      row?.meta?.threadId ??
      row?.payload?.thread_id,
  );

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ ok: false, error: "server configuration missing" }, 500);
    const sb = createClient(url, key);

    const body = await req.json().catch(() => ({}));
    const articleId = clean(body?.articleId ?? body?.article_id);
    const sessionId = clean(body?.sessionId ?? body?.session_id);
    const authUserId = clean(body?.authUserId ?? body?.auth_user_id);
    const requestedThreadId = clean(body?.threadId ?? body?.thread_id);
    const notificationId = clean(body?.notificationId ?? body?.notification_id);
    const counterpartUserId = clean(
      body?.counterpartUserId ?? body?.counterpart_user_id,
    );
    const role: "buyer" | "seller" = body?.role === "seller" ? "seller" : "buyer";
    const before = clean(body?.before);
    const rawLimit = Number(body?.limit ?? 30);
    const limit = Math.min(
      Math.max(Number.isFinite(rawLimit) ? rawLimit : 30, 1),
      200,
    );
    const includeMeta = body?.includeMeta !== false;

    if (!articleId) return json({ ok: false, error: "missing articleId" }, 400);
    if (!sessionId && !authUserId) {
      return json({ ok: false, error: "missing viewer identity" }, 400);
    }

    const identityOr: string[] = [];
    if (authUserId) identityOr.push(`auth_user_id.eq.${authUserId}`);
    if (sessionId) identityOr.push(`web_session_id.eq.${sessionId}`);
    const { data: users, error: usersError } = await sb
      .from("waouh_users")
      .select("id,auth_user_id,web_session_id")
      .or(identityOr.join(","))
      .limit(100);
    if (usersError) throw usersError;
    const userIds = Array.from(
      new Set((users ?? []).map((item: any) => clean(item?.id)).filter(Boolean)),
    ) as string[];
    const userIdSet = new Set(userIds);

    let query: any = sb
      .from("waouh_messages")
      .select(
        "id,conversation_id,thread_id,article_id,direction,text,created_at," +
          "attachments,meta,user_id,web_session_id",
      )
      .or(`article_id.eq.${articleId},meta->>article_id.eq.${articleId}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) query = query.lt("created_at", before);
    const { data: rawRows, error: rowsError } = await query;
    if (rowsError) throw rowsError;
    const allRows: any[] = rawRows ?? [];

    const sessionMatchInRows = sessionId
      ? allRows.some((row) => row?.web_session_id === sessionId)
      : false;
    const userMatchInRows = allRows.some(
      (row) => row?.user_id && userIdSet.has(row.user_id),
    );

    const { data: article } = await sb
      .from("waouh_articles")
      .select("seller_id,status")
      .eq("id", articleId)
      .maybeSingle();
    let isSeller = !!article?.seller_id && userIdSet.has(article.seller_id);

    let isStatusOwner = false;
    try {
      const { data: status } = await sb
        .from("waouh_statuses")
        .select("user_id")
        .eq("id", articleId)
        .maybeSingle();
      if (status?.user_id && authUserId && status.user_id === authUserId) {
        isStatusOwner = true;
        isSeller = true;
      }
    } catch (_) {
      // La table peut ne pas exister sur les anciens environnements.
    }

    let notifiedForArticle = false;
    if (!isSeller && !sessionMatchInRows && !userMatchInRows) {
      const notificationOr: string[] = [];
      if (userIds.length) notificationOr.push(`user_id.in.(${userIds.join(",")})`);
      if (sessionId) notificationOr.push(`web_session_id.eq.${sessionId}`);
      if (notificationOr.length) {
        const { data: notifications } = await sb
          .from("waouh_notifications")
          .select("id")
          .eq("article_id", articleId)
          .or(notificationOr.join(","))
          .limit(1);
        notifiedForArticle = !!notifications?.length;
      }
    }

    const authoritativeViewer =
      isSeller ||
      isStatusOwner ||
      sessionMatchInRows ||
      userMatchInRows ||
      notifiedForArticle;
    if (!authoritativeViewer) {
      return json({ ok: false, error: "viewer not linked to article" }, 403);
    }

    const viewerOwns = (row: any) =>
      (!!sessionId && row?.web_session_id === sessionId) ||
      (!!row?.user_id && userIdSet.has(row.user_id));

    let rows = allRows.filter(viewerOwns);
    if (role === "seller" && counterpartUserId) {
      rows = rows.filter((row) => {
        const cp = clean(
          row?.meta?.counterpart_user_id ?? row?.meta?.buyer_user_id,
        );
        return cp === counterpartUserId || row?.user_id === counterpartUserId;
      });
    }
    if (role === "buyer" && counterpartUserId) {
      rows = rows.filter((row) => {
        const cp = clean(
          row?.meta?.counterpart_user_id ?? row?.meta?.seller_user_id,
        );
        return !cp || cp === counterpartUserId;
      });
    }
    if (requestedThreadId) {
      rows = rows.filter((row) => {
        const threadId = threadFrom(row);
        return !threadId || threadId === requestedThreadId;
      });
    }

    const discoveredThreads = Array.from(
      new Set(rows.map(threadFrom).filter(Boolean)),
    ) as string[];
    const resolvedThreadId = requestedThreadId ??
      (discoveredThreads.length === 1 ? discoveredThreads[0] : null);
    const messages = rows.slice().reverse();

    let articleStatus: string | null = clean(article?.status);
    let seedNotification: any = null;
    if (includeMeta) {
      let seed: any = null;
      if (notificationId) {
        const { data } = await sb
          .from("waouh_notifications")
          .select("sent_at,notification_type,payload,thread_id")
          .eq("id", notificationId)
          .maybeSingle();
        seed = data;
      } else {
        const types = role === "seller"
          ? ["new_buyer", "match", "match_seller", "radar_match"]
          : ["match", "match_buyer", "radar_match"];
        let seedQuery: any = sb
          .from("waouh_notifications")
          .select("sent_at,notification_type,payload,thread_id")
          .eq("article_id", articleId)
          .in("notification_type", types)
          .order("sent_at", { ascending: false })
          .limit(1);
        const seedOr: string[] = [];
        if (userIds.length) seedOr.push(`user_id.in.(${userIds.join(",")})`);
        if (sessionId) seedOr.push(`web_session_id.eq.${sessionId}`);
        if (seedOr.length) seedQuery = seedQuery.or(seedOr.join(","));
        const { data } = await seedQuery;
        seed = Array.isArray(data) ? data[0] : data;
      }
      if (seed) {
        const payload = seed.payload ?? {};
        seedNotification = {
          sent_at: seed.sent_at,
          notification_type: seed.notification_type,
          text: payload?.text ?? payload?.message ?? null,
          payload,
          thread_id: seed.thread_id ?? payload?.thread_id ?? resolvedThreadId,
        };
      }
    }

    return json({
      ok: true,
      messages,
      hasMore: allRows.length === limit,
      articleStatus,
      seedNotification,
      resolved_thread_id: resolvedThreadId,
      conversation_scope: {
        article_id: articleId,
        role,
        counterpart_user_id: counterpartUserId,
        thread_id: resolvedThreadId,
      },
      viewer: {
        userIds,
        sessionId,
        authUserId,
        isSeller,
        isStatusOwner,
        notifiedForArticle,
        authoritative: authoritativeViewer,
      },
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[waouh-match-history] error", error);
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : `${error}`,
      },
      500,
    );
  }
});
