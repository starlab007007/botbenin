// Ingest agent knowledge: text, url, doc, voice transcript.
// Chunks + embeds and stores into waouh_ai_agent_chunks.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { chunkText, embedText, chatCompletion } from "../_shared/agent-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // resolve user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { agent_id, source_type, text, url } = await req.json();
    if (!agent_id) throw new Error("agent_id requis");

    // check ownership
    const { data: agent, error: aerr } = await supabase.from("waouh_ai_agents").select("id, user_id").eq("id", agent_id).maybeSingle();
    if (aerr || !agent || agent.user_id !== user.id) throw new Error("agent introuvable");

    let content = String(text || "").trim();

    // If URL provided, scrape it via Firecrawl if available, else basic fetch
    if (url && !content) {
      const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (fcKey) {
        const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${fcKey}` },
          body: JSON.stringify({ url, formats: ["markdown"] }),
        });
        const j = await r.json().catch(() => ({}));
        content = j?.data?.markdown || j?.markdown || "";
      }
      if (!content) {
        const r = await fetch(url);
        const html = await r.text();
        content = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 20000);
      }
    }

    if (!content) throw new Error("contenu vide");

    // Optional: ask model to synthesize/clean into structured business info
    if (content.length > 3000) {
      try {
        const summary = await chatCompletion({
          system: "Tu es un extracteur d'informations business en français. Résume les faits clés (produits, prix, horaires, zone, contact, ton) en une liste concise de puces courtes.",
          messages: [{ role: "user", content: content.slice(0, 12000) }],
          temperature: 0.2,
        });
        content = `${summary}\n\n---\n\n${content.slice(0, 4000)}`;
      } catch (_) { /* ignore, use raw */ }
    }

    const chunks = chunkText(content, 800, 100);
    let inserted = 0;
    for (const c of chunks) {
      try {
        const emb = await embedText(c);
        const { error } = await supabase.from("waouh_ai_agent_chunks").insert({
          agent_id, user_id: user.id, source_type: source_type || "text",
          content: c, embedding: emb as any,
          metadata: { url: url || null },
        });
        if (!error) inserted++;
      } catch (e) {
        console.error("chunk err", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, inserted, total: chunks.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
