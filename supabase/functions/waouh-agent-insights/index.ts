import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { chatCompletion } from "../_shared/agent-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stop = new Set(
  "le la les de des du et un une à en pour par avec sur ou est c est je tu il elle nous vous ils elles bonjour bonsoir merci ok oui non ça sa ce cette ces mes ton ta si mais que qui quoi comment quand où combien whatsapp waouh".split(/\s+/),
);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "Connexion requise" }, 401);
    const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: authData } = await caller.auth.getUser();
    if (!authData.user) return json({ ok: false, error: "Session expirée" }, 401);
    const body = await req.json().catch(() => ({}));
    const agentId = String(body.agent_id || "").trim();
    const mode = String(body.mode || "overview");
    const question = String(body.question || "").trim();
    if (!agentId) return json({ ok: false, error: "Agent requis" }, 400);

    const admin = createClient(url, service);
    const { data: agent } = await admin.from("waouh_ai_agents").select("*").eq("id", agentId).maybeSingle();
    if (!agent || agent.user_id !== authData.user.id) return json({ ok: false, error: "Agent introuvable" }, 404);

    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: conversations } = await admin
      .from("waouh_ai_agent_conversations")
      .select("wa_contact_phone,messages,needs_handoff,last_activity")
      .eq("agent_id", agentId)
      .gte("last_activity", since)
      .limit(500);
    const rows = conversations || [];
    const words = new Map<string, number>();
    const productCounts = new Map<string, number>();
    const manual = await admin.from("waouh_ai_agent_products").select("name").eq("agent_id", agentId);
    const linked = await admin.from("waouh_ai_agent_partner_products").select("waouh_partner_products(nom)").eq("agent_id", agentId);
    const names = [
      ...(manual.data || []).map((item: any) => String(item.name || "")),
      ...(linked.data || []).map((item: any) => String(item.waouh_partner_products?.nom || "")),
    ].filter(Boolean);
    names.forEach((name) => productCounts.set(name, 0));

    let totalMessages = 0;
    for (const row of rows as any[]) {
      const messages = Array.isArray(row.messages) ? row.messages : [];
      totalMessages += messages.length;
      const whole = messages.map((item: any) => String(item.content || "")).join(" ").toLowerCase();
      for (const product of names) {
        if (whole.includes(product.toLowerCase())) productCounts.set(product, (productCounts.get(product) || 0) + 1);
      }
      for (const message of messages) {
        if (message?.role !== "user") continue;
        String(message?.content || "")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter((word) => word.length >= 4 && !stop.has(word))
          .forEach((word) => words.set(word, (words.get(word) || 0) + 1));
      }
    }
    const overview = {
      ok: true,
      total_conversations: rows.length,
      total_messages: totalMessages,
      unique_contacts: new Set(rows.map((row: any) => row.wa_contact_phone)).size,
      total_handoffs: rows.filter((row: any) => row.needs_handoff).length,
      top_keywords: [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count })),
      top_products: [...productCounts.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    };
    if (mode !== "query" || !question) return json(overview);
    if (!Deno.env.get("GEMINI_API_KEY")) return json({ ok: false, error: "Service IA Gemini non configuré" }, 503);
    const answer = await chatCompletion({
      system: "Tu es un analyste business. Réponds en français en 2 à 5 lignes. Base-toi strictement sur les chiffres et extraits fournis.",
      messages: [{ role: "user", content: JSON.stringify({ question, overview, agent: { name: agent.name, sector: agent.sector }, samples: rows.slice(0, 20).map((row: any) => ({ contact: row.wa_contact_phone, messages: (row.messages || []).slice(-3) })) }) }],
      temperature: 0.2,
    });
    return json({ ...overview, answer });
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    console.error("waouh-agent-insights", error);
    return json({ ok: false, error: text }, 400);
  }
});
