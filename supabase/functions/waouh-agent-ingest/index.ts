import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { chunkText, embedText, chatCompletion } from "../_shared/agent-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function plainHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, code: "UNAUTHORIZED", error: "Connexion requise" }, 401);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return json({ ok: false, code: "UNAUTHORIZED", error: "Session expirée" }, 401);
    if (!Deno.env.get("LOVABLE_API_KEY")) return json({ ok: false, code: "AI_KEY_MISSING", error: "Service IA non configuré" }, 503);

    const body = await req.json().catch(() => ({}));
    const agentId = String(body.agent_id || "").trim();
    const sourceType = String(body.source_type || "text").trim();
    if (!agentId) return json({ ok: false, code: "INVALID_REQUEST", error: "Agent requis" }, 400);
    const admin = createClient(url, service);
    const { data: agent } = await admin.from("waouh_ai_agents").select("id,user_id").eq("id", agentId).maybeSingle();
    if (!agent || agent.user_id !== authData.user.id) return json({ ok: false, code: "AGENT_NOT_FOUND", error: "Agent introuvable" }, 404);

    let content = String(body.text || "").trim();
    const filename = String(body.filename || body.storage_path || "");
    const storagePath = String(body.storage_path || "").trim();
    const targetUrl = String(body.url || "").trim();

    if (storagePath && !content) {
      if (!storagePath.startsWith(`${authData.user.id}/`)) {
        return json({ ok: false, code: "DOCUMENT_FORBIDDEN", error: "Document non accessible" }, 403);
      }
      const { data: blob, error } = await admin.storage.from("agent-documents").download(storagePath);
      if (error || !blob) return json({ ok: false, code: "DOCUMENT_DOWNLOAD_FAILED", error: "Téléchargement du document impossible" }, 400);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const lower = filename.toLowerCase();
      if (lower.endsWith(".pdf")) {
        const { extractText, getDocumentProxy } = await import("npm:unpdf@0.12.1");
        const pdf = await getDocumentProxy(bytes);
        const extracted = await extractText(pdf, { mergePages: true });
        content = Array.isArray(extracted.text) ? extracted.text.join("\n\n") : String(extracted.text || "");
      } else if (lower.endsWith(".docx")) {
        const mammoth = await import("npm:mammoth@1.8.0");
        const extracted = await mammoth.extractRawText({ buffer: bytes });
        content = String(extracted.value || "");
      } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
        content = new TextDecoder().decode(bytes);
      } else {
        return json({ ok: false, code: "DOCUMENT_FORMAT_INVALID", error: "Utilisez PDF, Word, TXT ou MD" }, 400);
      }
    }

    if (targetUrl && !content) {
      const parsed = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) return json({ ok: false, code: "URL_INVALID", error: "Adresse web invalide" }, 400);
      const firecrawl = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawl && body.crawl === true) {
        const response = await fetch("https://api.firecrawl.dev/v2/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${firecrawl}` },
          body: JSON.stringify({ url: targetUrl, limit: 15, maxDepth: 2, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
        });
        const data = await response.json().catch(() => ({}));
        const pages = Array.isArray(data?.data) ? data.data : [];
        content = pages.map((page: any) => `${page?.metadata?.title || page?.metadata?.sourceURL || ""}\n${page?.markdown || ""}`).join("\n\n---\n\n");
      }
      if (!content && firecrawl) {
        const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${firecrawl}` },
          body: JSON.stringify({ url: targetUrl, formats: ["markdown"], onlyMainContent: true }),
        });
        const data = await response.json().catch(() => ({}));
        content = String(data?.data?.markdown || data?.markdown || "");
      }
      if (!content) {
        const response = await fetch(targetUrl);
        if (!response.ok) return json({ ok: false, code: "URL_FETCH_FAILED", error: "Le site est inaccessible" }, 400);
        content = plainHtml((await response.text()).slice(0, 60000));
      }
    }

    content = content.replace(/\s+/g, " ").trim();
    if (!content) return json({ ok: false, code: "KNOWLEDGE_EMPTY", error: "Aucun contenu lisible" }, 400);

    if (content.length > 5000) {
      try {
        const summary = await chatCompletion({
          system: "Résume les faits business utiles en français : produits, prix, horaires, livraison, règles et contacts. Retourne des puces courtes.",
          messages: [{ role: "user", content: content.slice(0, 14000) }],
          temperature: 0.15,
        });
        content = `${summary}\n\n---\n\n${content.slice(0, 5000)}`;
      } catch (_) {
        // Raw document content still remains valuable if summarisation is unavailable.
      }
    }

    const chunks = chunkText(content);
    let inserted = 0;
    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      const { error } = await admin.from("waouh_ai_agent_chunks").insert({
        agent_id: agentId,
        user_id: authData.user.id,
        source_type: sourceType,
        content: chunk,
        embedding,
        metadata: { filename: filename || null, url: targetUrl || null, storage_path: storagePath || null },
      });
      if (error) throw error;
      inserted += 1;
    }
    return json({ ok: true, inserted, total: chunks.length });
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const code = text.includes("LOVABLE_API_KEY") ? "AI_KEY_MISSING" : "KNOWLEDGE_INDEX_FAILED";
    console.error("waouh-agent-ingest", error);
    return json({ ok: false, code, error: text }, 400);
  }
});
