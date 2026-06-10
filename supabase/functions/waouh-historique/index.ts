// Admin-only aggregator for WAOUH history dashboard.
// Actions: list | timeline | divergences | backfill | completeness

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Stages effectivement émis par le pipeline (cf. _shared/waouh-sync.ts).
// Les anciens stages "chat_in", "router", "whatsapp_send" ne sont jamais
// insérés en base → plafonnaient la complétude à 40% au mieux.
const CORE_STAGES = ["sync", "queue_enqueue", "web_mirror"];

function completenessFromStages(stages: Set<string>): number {
  const hit = CORE_STAGES.filter((s) => stages.has(s)).length;
  return Math.round((hit / CORE_STAGES.length) * 100);
}


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
      const offset = Math.max(0, Number(body?.offset ?? 0));

      let q = sb.from("waouh_negotiations")
        .select("id, article_id, buyer_user_id, seller_user_id, state, last_offer_price, transaction_id, created_at, updated_at, meta", { count: "exact" })
        .gte("updated_at", sinceIso)
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (status && status !== "all") q = q.eq("state", status);
      if (articleId) q = q.eq("article_id", articleId);
      const { data: negotiations, error: negErr, count: totalCount } = await q;
      if (negErr) throw negErr;

      const articleIds = Array.from(new Set((negotiations || []).map((n: any) => n.article_id).filter(Boolean)));
      const userIds = Array.from(new Set((negotiations || []).flatMap((n: any) => [n.buyer_user_id, n.seller_user_id]).filter(Boolean)));
      const negIds = (negotiations || []).map((n: any) => n.id);

      const [{ data: articles }, { data: users }, { data: traceRows }] = await Promise.all([
        articleIds.length
          ? sb.from("waouh_articles").select("id, title, price, currency, photos, status").in("id", articleIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? sb.from("waouh_users").select("id, display_name, phone_number, auth_user_id").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        negIds.length
          ? sb.from("waouh_trace_events").select("negotiation_id, stage, status").in("negotiation_id", negIds).limit(20000)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // Completeness per negotiation
      const stagesByNeg = new Map<string, Set<string>>();
      for (const t of (traceRows || []) as any[]) {
        if (!t.negotiation_id) continue;
        if (!stagesByNeg.has(t.negotiation_id)) stagesByNeg.set(t.negotiation_id, new Set());
        stagesByNeg.get(t.negotiation_id)!.add(t.stage);
      }
      const completeness: Record<string, { pct: number; stages: string[] }> = {};
      for (const n of (negotiations || []) as any[]) {
        const set = stagesByNeg.get(n.id) || new Set();
        completeness[n.id] = { pct: completenessFromStages(set), stages: Array.from(set) };
      }

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
        acc.byStatus[n.state] = (acc.byStatus[n.state] || 0) + 1;
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
        completeness,
        pagination: { offset, limit, total: totalCount ?? filteredNeg.length, hasMore: (totalCount ?? 0) > offset + filteredNeg.length },
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
      const limit = Math.min(Math.max(Number(body?.limit ?? 500), 1), 2000);
      const offset = Math.max(0, Number(body?.offset ?? 0));

      if (!negotiationId && !articleId && !transactionId && !traceId) {
        return new Response(JSON.stringify({ ok: false, error: "missing negotiationId/articleId/transactionId/traceId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const msgQ = articleId
        ? sb.from("waouh_messages").select("*").eq("article_id", articleId).gte("created_at", sinceIso).order("created_at", { ascending: true }).range(offset, offset + limit - 1)
        : negotiationId
          ? sb.from("waouh_messages").select("*").contains("meta", { negotiation_id: negotiationId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).range(offset, offset + limit - 1)
          : traceId
            ? sb.from("waouh_messages").select("*").contains("meta", { trace_id: traceId }).order("created_at", { ascending: true }).range(offset, offset + limit - 1)
            : sb.from("waouh_messages").select("*").contains("meta", { transaction_id: transactionId }).order("created_at", { ascending: true }).range(offset, offset + limit - 1);

      const queueQ = articleId
        ? sb.from("waouh_outbound_queue").select("*").contains("payload", { article_id: articleId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).range(offset, offset + limit - 1)
        : negotiationId
          ? sb.from("waouh_outbound_queue").select("*").contains("payload", { negotiation_id: negotiationId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).range(offset, offset + limit - 1)
          : traceId
            ? sb.from("waouh_outbound_queue").select("*").contains("payload", { trace_id: traceId }).order("created_at", { ascending: true }).range(offset, offset + limit - 1)
            : sb.from("waouh_outbound_queue").select("*").eq("transaction_id", transactionId).order("created_at", { ascending: true }).range(offset, offset + limit - 1);

      const notifQ = articleId
        ? sb.from("waouh_notifications").select("*").eq("article_id", articleId).gte("sent_at", sinceIso).order("sent_at", { ascending: true }).limit(500)
        : negotiationId
          ? sb.from("waouh_notifications").select("*").contains("payload", { negotiation_id: negotiationId }).gte("sent_at", sinceIso).order("sent_at", { ascending: true }).limit(500)
          : sb.from("waouh_notifications").select("*").contains("payload", { trace_id: traceId || transactionId }).order("sent_at", { ascending: true }).limit(500);

      let traceQ = sb.from("waouh_trace_events").select("*").order("created_at", { ascending: true }).range(offset, offset + limit - 1);
      if (traceId) traceQ = traceQ.eq("trace_id", traceId);
      else if (transactionId) traceQ = traceQ.eq("transaction_id", transactionId);
      else if (negotiationId) traceQ = traceQ.eq("negotiation_id", negotiationId).gte("created_at", sinceIso);
      else if (articleId) traceQ = traceQ.eq("article_id", articleId).gte("created_at", sinceIso);

      const [msgs, queue, notifs, traces] = await Promise.all([msgQ, queueQ, notifQ, traceQ]);

      const traceIds = new Set((traces.data || []).map((t: any) => t.trace_id).filter(Boolean));
      const msgsNoTrace = (msgs.data || []).filter((m: any) => !m?.meta?.trace_id);
      const queueNoTrace = (queue.data || []).filter((q: any) => !q?.payload?.trace_id);
      const orphanQueue = (queue.data || []).filter((q: any) => q?.payload?.trace_id && !traceIds.has(q.payload.trace_id));
      const errorTraces = (traces.data || []).filter((t: any) => t.status === "error");

      // Completeness for this scope
      const stageSet = new Set((traces.data || []).map((t: any) => t.stage));
      const completeness = { pct: completenessFromStages(stageSet), stages: Array.from(stageSet), missing: CORE_STAGES.filter((s) => !stageSet.has(s)) };

      return new Response(JSON.stringify({
        ok: true,
        messages: msgs.data || [],
        queue: queue.data || [],
        notifications: notifs.data || [],
        traces: traces.data || [],
        completeness,
        pagination: { offset, limit, hasMore: (msgs.data?.length || 0) === limit || (queue.data?.length || 0) === limit || (traces.data?.length || 0) === limit },
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

    if (action === "backfill") {
      // Generate synthetic trace events from existing messages, queue items and negotiations
      // so historical data shows up in the dashboard.
      const days: number = Math.max(1, Math.min(365, Number(body?.days ?? 90)));
      const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
      const events: any[] = [];
      let scanned = { messages: 0, queue: 0, negotiations: 0 };

      // 1) From negotiations: ensure a "chat_in" + "router" event for each negotiation
      const { data: negs } = await sb.from("waouh_negotiations")
        .select("id, article_id, buyer_user_id, seller_user_id, state, created_at, updated_at")
        .gte("updated_at", cutoff).limit(2000);
      scanned.negotiations = (negs || []).length;

      const { data: existing } = await sb.from("waouh_trace_events")
        .select("negotiation_id, stage").gte("created_at", cutoff).limit(20000);
      const existingKeys = new Set((existing || []).map((e: any) => `${e.negotiation_id}::${e.stage}`));

      for (const n of (negs || []) as any[]) {
        const traceId = crypto.randomUUID();
        const base = { trace_id: traceId, article_id: n.article_id, negotiation_id: n.id, status: "ok", payload: { backfill: true, backfill_key: `backfill-${n.id}` } };
        const seed: Array<{ stage: string; created_at: string }> = [
          { stage: "chat_in", created_at: n.created_at },
          { stage: "router", created_at: n.created_at },
          { stage: "sync", created_at: n.created_at },
        ];
        if (["accepted", "closed", "paid", "completed"].includes(n.state)) {
          seed.push({ stage: "queue_enqueue", created_at: n.updated_at });
          seed.push({ stage: "whatsapp_send", created_at: n.updated_at });
        }
        for (const s of seed) {
          if (existingKeys.has(`${n.id}::${s.stage}`)) continue;
          events.push({ ...base, stage: s.stage, created_at: s.created_at, intent: "backfill" });
        }
      }

      // 2) From messages: a chat_in or web_mirror per message
      const { data: msgs } = await sb.from("waouh_messages")
        .select("id, article_id, channel, direction, meta, created_at")
        .gte("created_at", cutoff).limit(5000);
      scanned.messages = (msgs || []).length;
      for (const m of (msgs || []) as any[]) {
        if (m?.meta?.trace_id) continue;
        const negId = m?.meta?.negotiation_id || null;
        const stage = m.channel === "whatsapp" ? "whatsapp_send" : "chat_in";
        events.push({
          trace_id: crypto.randomUUID(), article_id: m.article_id, negotiation_id: negId,
          stage, status: "ok", role: m.direction, intent: "backfill_message",
          payload: { message_id: m.id, channel: m.channel, backfill: true, backfill_key: `backfill-msg-${m.id}` },
          created_at: m.created_at,
        });
      }

      // 3) From outbound queue: queue_enqueue + whatsapp_send
      const { data: queueRows } = await sb.from("waouh_outbound_queue")
        .select("id, transaction_id, channel, status, payload, last_error, created_at, updated_at")
        .gte("created_at", cutoff).limit(5000);
      scanned.queue = (queueRows || []).length;
      for (const q of (queueRows || []) as any[]) {
        if (q?.payload?.trace_id) continue;
        const negId = q?.payload?.negotiation_id || null;
        const artId = q?.payload?.article_id || null;
        const traceId = crypto.randomUUID();
        events.push({
          trace_id: traceId, article_id: artId, negotiation_id: negId, transaction_id: q.transaction_id,
          stage: "queue_enqueue", status: "ok", intent: "backfill_queue",
          payload: { queue_id: q.id, channel: q.channel, backfill: true, backfill_key: `backfill-q-${q.id}` },
          created_at: q.created_at,
        });
        if (q.status === "sent" || q.status === "failed") {
          events.push({
            trace_id: traceId, article_id: artId, negotiation_id: negId, transaction_id: q.transaction_id,
            stage: q.channel === "whatsapp" ? "whatsapp_send" : "web_mirror",
            status: q.status === "failed" ? "error" : "ok",
            error: q.last_error || null,
            intent: "backfill_dispatch",
            payload: { queue_id: q.id, backfill: true, backfill_key: `backfill-q-${q.id}-dispatch` },
            created_at: q.updated_at || q.created_at,
          });
        }
      }

      // Insert in chunks
      let inserted = 0;
      const insertErrors: string[] = [];
      for (let i = 0; i < events.length; i += 500) {
        const chunk = events.slice(i, i + 500);
        const { error } = await sb.from("waouh_trace_events").insert(chunk);
        if (error) {
          console.error("[waouh-historique] backfill insert error", error.message);
          insertErrors.push(error.message);
        } else {
          inserted += chunk.length;
        }
      }

      if (events.length > 0 && inserted === 0) {
        return new Response(JSON.stringify({ ok: false, error: insertErrors[0] || "all inserts failed", scanned, prepared: events.length }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true, scanned, inserted, prepared: events.length, errors: insertErrors.slice(0, 5) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
