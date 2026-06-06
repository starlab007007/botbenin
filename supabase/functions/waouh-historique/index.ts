// Admin-only aggregator for WAOUH history dashboard.
// Actions:
//  - list: negotiations + KPIs (with status/article/search filters)
//  - timeline: messages + queue + notifications + trace events for a negotiation/article/traceId
//  - trace_search: lookup all events for a given trace_id
//  - divergences: detect missing traces / unsync'd messages on the window
//  - export: returns full filtered dataset for CSV (client serializes)

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
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(url, svc);
    // FIX: param name is `_role_name` not `_role`
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userData.user.id, _role_name: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "list";
    const sinceDays: number = Math.max(1, Math.min(365, Number(body?.sinceDays ?? 30)));
    const sinceIso = new Date(Date.now() - sinceDays * 24 * 3600 * 1000).toISOString();

    if (action === "list") {
      const status: string | null = body?.status || null;
      const articleId: string | null = body?.articleId || null;
      const search: string | null = body?.search || null;
      const limit = Math.min(Math.max(Number(body?.limit ?? 50), 1), 200);

      let q = sb.from("waouh_negotiations")
        .select("id, article_id, buyer_user_id, seller_user_id, status, current_price, last_price, currency, created_at, updated_at, meta")
        .gte("updated_at", sinceIso)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (status && status !== "all") q = q.eq("status", status);
      if (articleId) q = q.eq("article_id", articleId);
      const { data: negotiations, error: negErr } = await q;
      if (negErr) throw negErr;

      const articleIds = Array.from(new Set((negotiations || []).map((n: any) => n.article_id).filter(Boolean)));
      const userIds = Array.from(new Set((negotiations || []).flatMap((n: any) => [n.buyer_user_id, n.seller_user_id]).filter(Boolean)));

      const [{ data: articles }, { data: users }] = await Promise.all([
        articleIds.length
          ? sb.from("waouh_articles").select("id, title, price, currency, photos, status").in("id", articleIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? sb.from("waouh_users").select("id, display_name, phone_number, auth_user_id").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      let filteredNeg = negotiations || [];
      if (search) {
        const s = search.toLowerCase();
        const articleMap = new Map((articles || []).map((a: any) => [a.id, a]));
        filteredNeg = filteredNeg.filter((n: any) => {
          const a = articleMap.get(n.article_id);
          return (a?.title || "").toLowerCase().includes(s) || (n.id || "").toLowerCase().includes(s);
        });
      }

      const counts = filteredNeg.reduce((acc: any, n: any) => {
        acc.total++;
        acc.byStatus[n.status] = (acc.byStatus[n.status] || 0) + 1;
        return acc;
      }, { total: 0, byStatus: {} as Record<string, number> });

      const { count: errorCount } = await sb.from("waouh_trace_events")
        .select("*", { count: "exact", head: true })
        .eq("status", "error").gte("created_at", sinceIso);

      const { count: waSent } = await sb.from("waouh_outbound_queue")
        .select("*", { count: "exact", head: true })
        .eq("channel", "whatsapp").eq("status", "sent").gte("created_at", sinceIso);
      const { count: waFailed } = await sb.from("waouh_outbound_queue")
        .select("*", { count: "exact", head: true })
        .eq("channel", "whatsapp").eq("status", "failed").gte("created_at", sinceIso);

      return new Response(JSON.stringify({
        ok: true,
        negotiations: filteredNeg,
        articles: articles || [],
        users: users || [],
        stats: {
          ...counts,
          traceErrors: errorCount || 0,
          waSent: waSent || 0,
          waFailed: waFailed || 0,
          waDeliveryRate: (waSent || 0) + (waFailed || 0) > 0
            ? Math.round(((waSent || 0) / ((waSent || 0) + (waFailed || 0))) * 100)
            : 100,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "timeline" || action === "export") {
      const negotiationId: string | null = body?.negotiationId || null;
      const articleId: string | null = body?.articleId || null;
      const transactionId: string | null = body?.transactionId || null;
      const traceId: string | null = body?.traceId || null;

      if (!negotiationId && !articleId && !transactionId && !traceId) {
        return new Response(JSON.stringify({ ok: false, error: "missing negotiationId/articleId/transactionId/traceId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const msgQ = articleId
        ? sb.from("waouh_messages").select("*").eq("article_id", articleId).gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1000)
        : negotiationId
          ? sb.from("waouh_messages").select("*").contains("meta", { negotiation_id: negotiationId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1000)
          : traceId
            ? sb.from("waouh_messages").select("*").contains("meta", { trace_id: traceId }).order("created_at", { ascending: true }).limit(1000)
            : sb.from("waouh_messages").select("*").contains("meta", { transaction_id: transactionId }).order("created_at", { ascending: true }).limit(1000);

      const queueQ = articleId
        ? sb.from("waouh_outbound_queue").select("*").contains("payload", { article_id: articleId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1000)
        : negotiationId
          ? sb.from("waouh_outbound_queue").select("*").contains("payload", { negotiation_id: negotiationId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1000)
          : traceId
            ? sb.from("waouh_outbound_queue").select("*").contains("payload", { trace_id: traceId }).order("created_at", { ascending: true }).limit(1000)
            : sb.from("waouh_outbound_queue").select("*").eq("transaction_id", transactionId).order("created_at", { ascending: true }).limit(1000);

      const notifQ = articleId
        ? sb.from("waouh_notifications").select("*").eq("article_id", articleId).gte("sent_at", sinceIso).order("sent_at", { ascending: true }).limit(500)
        : negotiationId
          ? sb.from("waouh_notifications").select("*").contains("payload", { negotiation_id: negotiationId }).gte("sent_at", sinceIso).order("sent_at", { ascending: true }).limit(500)
          : sb.from("waouh_notifications").select("*").contains("payload", { trace_id: traceId || transactionId }).order("sent_at", { ascending: true }).limit(500);

      let traceQ = sb.from("waouh_trace_events").select("*").order("created_at", { ascending: true }).limit(2000);
      if (traceId) traceQ = traceQ.eq("trace_id", traceId);
      else if (transactionId) traceQ = traceQ.eq("transaction_id", transactionId);
      else if (negotiationId) traceQ = traceQ.eq("negotiation_id", negotiationId).gte("created_at", sinceIso);
      else if (articleId) traceQ = traceQ.eq("article_id", articleId).gte("created_at", sinceIso);

      const [msgs, queue, notifs, traces] = await Promise.all([msgQ, queueQ, notifQ, traceQ]);

      // Divergence detection: messages without trace_id OR queue items missing matching trace_id, plus error traces.
      const traceIds = new Set((traces.data || []).map((t: any) => t.trace_id).filter(Boolean));
      const msgsNoTrace = (msgs.data || []).filter((m: any) => !m?.meta?.trace_id);
      const queueNoTrace = (queue.data || []).filter((q: any) => !q?.payload?.trace_id);
      const orphanQueue = (queue.data || []).filter((q: any) => q?.payload?.trace_id && !traceIds.has(q.payload.trace_id));
      const errorTraces = (traces.data || []).filter((t: any) => t.status === "error");

      return new Response(JSON.stringify({
        ok: true,
        messages: msgs.data || [],
        queue: queue.data || [],
        notifications: notifs.data || [],
        traces: traces.data || [],
        divergences: {
          messages_without_trace: msgsNoTrace.length,
          queue_without_trace: queueNoTrace.length,
          orphan_queue_items: orphanQueue.length,
          error_traces: errorTraces.length,
          samples: {
            msgsNoTrace: msgsNoTrace.slice(0, 5).map((m: any) => ({ id: m.id, channel: m.channel, created_at: m.created_at })),
            orphanQueue: orphanQueue.slice(0, 5).map((q: any) => ({ id: q.id, channel: q.channel, trace_id: q.payload?.trace_id })),
            errorTraces: errorTraces.slice(0, 5).map((t: any) => ({ id: t.id, stage: t.stage, error: t.error })),
          },
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "divergences") {
      // Window-wide divergences across all negotiations.
      const [{ data: msgs }, { data: queue }, { data: traces }] = await Promise.all([
        sb.from("waouh_messages").select("id, article_id, meta, channel, created_at").gte("created_at", sinceIso).limit(5000),
        sb.from("waouh_outbound_queue").select("id, payload, channel, status, last_error, created_at").gte("created_at", sinceIso).limit(5000),
        sb.from("waouh_trace_events").select("id, trace_id, article_id, negotiation_id, stage, status, error, created_at").gte("created_at", sinceIso).limit(10000),
      ]);

      const traceIds = new Set((traces || []).map((t: any) => t.trace_id).filter(Boolean));
      const msgsNoTrace = (msgs || []).filter((m: any) => !m?.meta?.trace_id);
      const queueNoTrace = (queue || []).filter((q: any) => !q?.payload?.trace_id);
      const orphanQueue = (queue || []).filter((q: any) => q?.payload?.trace_id && !traceIds.has(q.payload.trace_id));
      const errorTraces = (traces || []).filter((t: any) => t.status === "error");
      const failedQueue = (queue || []).filter((q: any) => q.status === "failed");

      return new Response(JSON.stringify({
        ok: true,
        summary: {
          messages_without_trace: msgsNoTrace.length,
          queue_without_trace: queueNoTrace.length,
          orphan_queue_items: orphanQueue.length,
          error_traces: errorTraces.length,
          failed_queue: failedQueue.length,
        },
        samples: {
          msgsNoTrace: msgsNoTrace.slice(0, 10),
          orphanQueue: orphanQueue.slice(0, 10),
          errorTraces: errorTraces.slice(0, 10),
          failedQueue: failedQueue.slice(0, 10),
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-historique] error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
