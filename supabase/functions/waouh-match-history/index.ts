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
    let articleId = clean(body?.articleId ?? body?.article_id);
    const sessionId = clean(body?.sessionId ?? body?.session_id);
    const authUserId = clean(body?.authUserId ?? body?.auth_user_id);
    let requestedThreadId = clean(body?.threadId ?? body?.thread_id);
    const rawCorrelationId = clean(
      body?.correlationId ??
        body?.correlation_id ??
        body?.idempotency_key ??
        body?.request_id,
    );
    const correlationId =
      rawCorrelationId && /^[A-Za-z0-9_-]{8,160}$/.test(rawCorrelationId)
        ? rawCorrelationId
        : null;
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
    const viewerOwnsScopedRow = (row: any) =>
      (!!sessionId && row?.web_session_id === sessionId) ||
      (!!row?.user_id && userIdSet.has(row.user_id));

    // A provisional Deal Room may open before Flutter knows article_id/thread_id.
    // Recover the authoritative scope from the exact idempotency/correlation key
    // instead of treating this short creation window as a client error.
    if (!articleId && correlationId) {
      const { data: correlatedRows } = await sb
        .from("waouh_messages")
        .select("id,conversation_id,thread_id,article_id,meta,user_id,web_session_id,created_at")
        .or(
          `meta->>idempotency_key.eq.${correlationId},meta->>correlation_id.eq.${correlationId},meta->>request_id.eq.${correlationId},meta->>dedupe_key.eq.${correlationId}`,
        )
        .order("created_at", { ascending: false })
        .limit(20);
      const correlated = (correlatedRows ?? []).find(viewerOwnsScopedRow) ?? null;
      if (correlated) {
        articleId = clean(correlated.article_id ?? correlated.meta?.article_id);
        requestedThreadId =
          requestedThreadId ?? threadFrom(correlated);

        // The inbound correlated row can be written just before the server reply.
        // If its article/thread is still empty, inspect only subsequent messages
        // in the same viewer-owned conversation for the authoritative scope.
        if ((!articleId || !requestedThreadId) && correlated.conversation_id) {
          const { data: followingRows } = await sb
            .from("waouh_messages")
            .select("thread_id,article_id,meta,user_id,web_session_id,created_at")
            .eq("conversation_id", correlated.conversation_id)
            .gte("created_at", correlated.created_at)
            .order("created_at", { ascending: true })
            .limit(30);
          for (const row of followingRows ?? []) {
            if (!viewerOwnsScopedRow(row)) continue;
            articleId =
              articleId ?? clean(row.article_id ?? row.meta?.article_id);
            requestedThreadId =
              requestedThreadId ?? threadFrom(row);
            if (articleId && requestedThreadId) break;
          }
        }
      }
    }

    // A thread id alone is enough to recover article scope, but only when the
    // authenticated viewer is actually one of the thread participants.
    if (!articleId && requestedThreadId) {
      const { data: thread } = await sb
        .from("waouh_chat_threads")
        .select("id,article_id,buyer_user_id,seller_user_id,thread_type")
        .eq("id", requestedThreadId)
        .eq("thread_type", "product_meet")
        .maybeSingle();
      if (
        thread &&
        (userIdSet.has(thread.buyer_user_id) ||
          userIdSet.has(thread.seller_user_id))
      ) {
        articleId = clean(thread.article_id);
      }
    }

    // Once the article is known, recover the canonical product_meet in real time
    // so old negotiations with a null negotiation.thread_id still synchronize.
    if (articleId && !requestedThreadId) {
      const { data: threadRows } = await sb
        .from("waouh_chat_threads")
        .select("id,article_id,buyer_user_id,seller_user_id,status,updated_at")
        .eq("article_id", articleId)
        .eq("thread_type", "product_meet")
        .order("updated_at", { ascending: false })
        .limit(20);
      const candidates = (threadRows ?? []).filter((thread: any) => {
        const viewerParticipant =
          userIdSet.has(thread.buyer_user_id) ||
          userIdSet.has(thread.seller_user_id);
        if (!viewerParticipant) return false;
        if (!counterpartUserId) return true;
        return (
          thread.buyer_user_id === counterpartUserId ||
          thread.seller_user_id === counterpartUserId
        );
      });
      if (candidates.length > 0) {
        requestedThreadId = clean(candidates[0].id);
      }
    }

    // No server scope yet is a normal transient state, not an error. Returning
    // 200 keeps Flutter connected while Realtime/polling waits for creation.
    if (!articleId) {
      return json({
        ok: true,
        pending: true,
        messages: [],
        resolved_thread_id: requestedThreadId,
        conversation_scope: {
          article_id: null,
          role,
          counterpart_user_id: counterpartUserId,
          thread_id: requestedThreadId,
          correlation_id: correlationId,
        },
        viewer: {
          userIds,
          sessionId,
          authUserId,
          authoritative: true,
        },
        synced_at: new Date().toISOString(),
      });
    }

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

    const viewerOwns = viewerOwnsScopedRow;

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
