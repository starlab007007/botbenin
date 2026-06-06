// Admin-only aggregator for WAOUH history dashboard.
// Returns: negotiations list (with filters), and for a given negotiation/article:
// merged timeline (messages + outbound queue + notifications + trace events).

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

    // Admin check via JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(url, svc);
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
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

      // KPIs (computed on filtered set)
      const counts = filteredNeg.reduce((acc: any, n: any) => {
        acc.total++;
        acc.byStatus[n.status] = (acc.byStatus[n.status] || 0) + 1;
        return acc;
      }, { total: 0, byStatus: {} as Record<string, number> });

      // Trace errors in window
      const { count: errorCount } = await sb.from("waouh_trace_events")
        .select("*", { count: "exact", head: true })
        .eq("status", "error").gte("created_at", sinceIso);

      // WhatsApp delivery rate
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

    if (action === "timeline") {
      const negotiationId: string | null = body?.negotiationId || null;
      const articleId: string | null = body?.articleId || null;
      if (!negotiationId && !articleId) {
        return new Response(JSON.stringify({ ok: false, error: "missing negotiationId or articleId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const buildIn = (col: string) => articleId ? `${col}.eq.${articleId}` : "";

      // Messages by article (preferred) else by negotiation meta
      const msgQ = articleId
        ? sb.from("waouh_messages").select("*").eq("article_id", articleId).gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(500)
        : sb.from("waouh_messages").select("*").contains("meta", { negotiation_id: negotiationId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(500);

      const queueQ = articleId
        ? sb.from("waouh_outbound_queue").select("*").contains("payload", { article_id: articleId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(500)
        : sb.from("waouh_outbound_queue").select("*").contains("payload", { negotiation_id: negotiationId }).gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(500);

      const notifQ = articleId
        ? sb.from("waouh_notifications").select("*").eq("article_id", articleId).gte("sent_at", sinceIso).order("sent_at", { ascending: true }).limit(500)
        : sb.from("waouh_notifications").select("*").contains("payload", { negotiation_id: negotiationId }).gte("sent_at", sinceIso).order("sent_at", { ascending: true }).limit(500);

      let traceQ = sb.from("waouh_trace_events").select("*").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1000);
      if (negotiationId) traceQ = traceQ.eq("negotiation_id", negotiationId);
      else if (articleId) traceQ = traceQ.eq("article_id", articleId);

      const [msgs, queue, notifs, traces] = await Promise.all([msgQ, queueQ, notifQ, traceQ]);

      return new Response(JSON.stringify({
        ok: true,
        messages: msgs.data || [],
        queue: queue.data || [],
        notifications: notifs.data || [],
        traces: traces.data || [],
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
