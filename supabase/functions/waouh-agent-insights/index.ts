// Agent insights: KPIs, timeline, top keywords, top products, optional Google Sheet snapshot,
// and free-form natural-language questions about the agent's data.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  ,
};

const STOP = new Set("le la les de des du et un une à en pour par avec sur ou est c'est je tu il elle nous vous ils elles bonjour bonsoir merci ok oui non ça sa ce cette ces mes ton ta si mais que qui quoi comment quand où combien wa waouh whatsapp".split(/\s+/));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) throw new Error("unauthorized");
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error("unauthorized");

    const { agent_id, mode = "overview", question } = await req.json();
    if (!agent_id) throw new Error("agent_id requis");

    const { data: agent } = await supabase.from("waouh_ai_agents").select("*").eq("id", agent_id).maybeSingle();
    if (!agent || agent.user_id !== user.id) throw new Error("forbidden");

    // Load conversations (last 30 days)
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: convs } = await supabase.from("waouh_ai_agent_conversations")
      .select("wa_contact_phone, messages, needs_handoff, last_activity, created_at")
      .eq("agent_id", agent_id)
      .gte("last_activity", since)
      .limit(500);

    const total_conversations = convs?.length || 0;
    const unique_contacts = new Set((convs || []).map((c: any) => c.wa_contact_phone)).size;
    const total_handoffs = (convs || []).filter((c: any) => c.needs_handoff).length;

    let total_messages = 0;
    const wordCounts = new Map<string, number>();
    const dayCounts = new Map<string, number>();

    for (const c of convs || []) {
      const msgs: any[] = Array.isArray(c.messages) ? c.messages : [];
      total_messages += msgs.length;
      const day = new Date(c.last_activity).toISOString().slice(0, 10);
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      for (const m of msgs) {
        if (m.role !== "user") continue;
        const words = String(m.content || "").toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !STOP.has(w));
        for (const w of words) wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    }
    const top_keywords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([word, count]) => ({ word, count }));

    // Fill 30-day timeline
    const conversations_per_day: Array<{ day: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      conversations_per_day.push({ day: d.slice(5), count: dayCounts.get(d) || 0 });
    }

    // Top products mentioned (partner + manual)
    const { data: partnerLinks } = await supabase.from("waouh_ai_agent_partner_products")
      .select("waouh_partner_products(nom)").eq("agent_id", agent_id);
    const { data: manual } = await supabase.from("waouh_ai_agent_products")
      .select("name").eq("agent_id", agent_id);
    const names = [
      ...((partnerLinks as any[]) || []).map((r) => r.waouh_partner_products?.nom).filter(Boolean),
      ...((manual as any[]) || []).map((r) => r.name).filter(Boolean),
    ];
    const productCounts: Record<string, number> = {};
    for (const n of names) productCounts[n] = 0;
    for (const c of convs || []) {
      const text = (Array.isArray(c.messages) ? c.messages : []).map((m: any) => m.content || "").join(" ").toLowerCase();
      for (const n of names) if (text.includes(String(n).toLowerCase())) productCounts[n]++;
    }
    const top_products = Object.entries(productCounts)
      .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    // Optional Google Sheet snapshot
    let sheet: any = null;
    if (agent.google_sheet_url) {
      sheet = await loadPublicSheet(agent.google_sheet_url).catch((e) => ({ error: e.message }));
    }

    // Free-form question via LLM
    if (mode === "query" && question) {
      const answer = await answerQuestion({
        question, agent, convs: convs || [],
        top_keywords, top_products, sheet,
      });
      return json({ ok: true, answer });
    }

    return json({
      ok: true,
      total_conversations, total_messages, unique_contacts, total_handoffs,
      conversations_per_day, top_keywords, top_products,
      sheet,
    });
  } catch (e: any) {
    console.error("insights err", e);
    return json({ error: e.message }, 400);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ---- Public Google Sheet reader (CSV export) ----
async function loadPublicSheet(url: string) {
  const m = url.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!m) throw new Error("URL Google Sheet invalide");
  const id = m[1];
  const gidM = url.match(/[?&#]gid=(\d+)/);
  const gid = gidM ? gidM[1] : "0";
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error("Feuille inaccessible. Rendez-la publique en lecture.");
  const csv = await res.text();
  const rows = parseCsv(csv);
  if (!rows.length) return { rows: 0, cols: 0, headers: [], sample: [] };
  const headers = rows[0];
  const body = rows.slice(1);
  // Try to detect quantity/stock column for low-stock alerts
  const qtyIdx = headers.findIndex((h) => /stock|quant|qté|qty|reste/i.test(h));
  const nameIdx = headers.findIndex((h) => /nom|name|produit|item|article/i.test(h));
  const low_stock = qtyIdx >= 0 ? body
    .map((r) => ({ name: r[nameIdx >= 0 ? nameIdx : 0], qty: Number(r[qtyIdx]) }))
    .filter((r) => !isNaN(r.qty) && r.qty <= 5).slice(0, 20) : [];
  return { rows: body.length, cols: headers.length, headers, sample: body.slice(0, 8), low_stock };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = ""; let row: string[] = []; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ---- NL question answering via Lovable AI gateway ----
async function answerQuestion(ctx: any): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return "Aucune clé IA configurée pour l'analyse en langage naturel.";
  const compactConvs = (ctx.convs || []).slice(0, 30).map((c: any) => ({
    contact: c.wa_contact_phone,
    n: (c.messages || []).length,
    last: (c.messages || []).slice(-2).map((m: any) => `${m.role}: ${m.content}`).join(" | "),
  }));
  const body = {
    model: "google/gemini-2.5-flash-lite",
    messages: [
      { role: "system", content: `Tu es un analyste business qui répond en français, en 3-6 lignes claires, avec chiffres concrets si dispo. Base-toi uniquement sur les données fournies.` },
      { role: "user", content: JSON.stringify({
        question: ctx.question,
        stats: {
          conversations: ctx.convs.length,
          top_keywords: ctx.top_keywords,
          top_products: ctx.top_products,
        },
        sample_conversations: compactConvs,
        sheet: ctx.sheet ? { headers: ctx.sheet.headers, sample: ctx.sheet.sample, low_stock: ctx.sheet.low_stock } : null,
        agent: { name: ctx.agent.name, sector: ctx.agent.sector, type: ctx.agent.agent_type },
      }) },
    ],
  };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway err", res.status, t);
    return `⚠️ IA indisponible (${res.status})`;
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content || "Aucune réponse.";
}
