// WAOUH Health Check — surfaces sync health for the admin dashboard.
// Returns: last webhook activity, per-article message counts, and
// detected divergences (negotiations without messages, messages without
// matching article rows, traces missing for recent negotiations).
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
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const hours = Math.min(Math.max(Number(body?.hours ?? 24), 1), 24 * 30);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const topN = Math.min(Math.max(Number(body?.top ?? 20), 1), 200);

    // 1) Last webhook activity (proxy: most recent inbound waouh_messages
    //    coming from whatsapp / waha / external channels).
    const { data: lastInbound } = await sb
      .from("waouh_messages")
      .select("id, created_at, channel, direction, article_id")
      .eq("direction", "in")
      .order("created_at", { ascending: false })
      .limit(1);
    const lastWebhookAt = lastInbound?.[0]?.created_at ?? null;

    // 2) Per-article message counts in window.
    const { data: recentMsgs } = await sb
      .from("waouh_messages")
      .select("article_id, direction, created_at")
      .gte("created_at", since)
      .not("article_id", "is", null)
      .limit(5000);

    const perArticle = new Map<string, { total: number; in: number; out: number; last: string }>();
    for (const m of recentMsgs ?? []) {
      const k = (m as any).article_id as string;
      if (!k) continue;
      const cur = perArticle.get(k) ?? { total: 0, in: 0, out: 0, last: (m as any).created_at };
      cur.total += 1;
      if ((m as any).direction === "in") cur.in += 1;
      else cur.out += 1;
      if ((m as any).created_at > cur.last) cur.last = (m as any).created_at;
      perArticle.set(k, cur);
    }
    const topArticles = Array.from(perArticle.entries())
      .map(([article_id, v]) => ({ article_id, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, topN);

    // 3) Divergences
    // 3a) Negotiations created in window with ZERO related messages
    const { data: recentNegs } = await sb
      .from("waouh_negotiations")
      .select("id, article_id, state, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    const negArticleIds = Array.from(new Set((recentNegs ?? []).map((n: any) => n.article_id).filter(Boolean)));
    const articleIdsWithMsgs = new Set<string>();
    if (negArticleIds.length) {
      const { data: msgsForNegs } = await sb
        .from("waouh_messages")
        .select("article_id")
        .in("article_id", negArticleIds)
        .limit(2000);
      (msgsForNegs ?? []).forEach((m: any) => m.article_id && articleIdsWithMsgs.add(m.article_id));
    }
    const negotiationsWithoutMessages = (recentNegs ?? [])
      .filter((n: any) => n.article_id && !articleIdsWithMsgs.has(n.article_id))
      .slice(0, 50);

    // 3b) Recent messages whose article_id has no waouh_articles row
    const recentArticleIds = Array.from(perArticle.keys()).slice(0, 200);
    let orphanArticleMsgs: string[] = [];
    if (recentArticleIds.length) {
      const { data: arts } = await sb
        .from("waouh_articles")
        .select("id")
        .in("id", recentArticleIds);
      const known = new Set((arts ?? []).map((a: any) => a.id));
      orphanArticleMsgs = recentArticleIds.filter((id) => !known.has(id));
    }

    // 3c) Negotiations without any trace_events
    let negsWithoutTrace: any[] = [];
    if ((recentNegs ?? []).length) {
      const negIds = (recentNegs ?? []).map((n: any) => n.id);
      const { data: traces } = await sb
        .from("waouh_trace_events")
        .select("negotiation_id")
        .in("negotiation_id", negIds)
        .limit(2000);
      const tracedNegIds = new Set((traces ?? []).map((t: any) => t.negotiation_id).filter(Boolean));
      negsWithoutTrace = (recentNegs ?? [])
        .filter((n: any) => !tracedNegIds.has(n.id))
        .slice(0, 50);
    }

    // 4) Outbound queue health
    const { count: queuePending } = await sb
      .from("waouh_outbound_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    const { count: queueFailed } = await sb
      .from("waouh_outbound_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since);

    return new Response(
      JSON.stringify({
        ok: true,
        window: { hours, since },
        last_webhook_at: lastWebhookAt,
        totals: {
          articles_with_messages: perArticle.size,
          messages_in_window: (recentMsgs ?? []).length,
          negotiations_in_window: (recentNegs ?? []).length,
          queue_pending: queuePending ?? 0,
          queue_failed_in_window: queueFailed ?? 0,
        },
        top_articles: topArticles,
        divergences: {
          negotiations_without_messages: negotiationsWithoutMessages,
          orphan_article_ids: orphanArticleMsgs,
          negotiations_without_trace: negsWithoutTrace,
        },
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[waouh-health-check] error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
