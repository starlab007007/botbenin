import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import QRCode from "npm:qrcode@1.5.4";
import {
  runAgentTurn,
  STUDIO_AI_VERSION,
} from "./agent-ai-studio.ts";

const PUBLIC_WEB_VERSION = "21.4.6.24";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const configuredBaseUrl = (Deno.env.get("AGENT_PUBLIC_BASE_URL") ?? "").replace(/\/+$/, "");
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Json = Record<string, any>;

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Waouh-Public-Agent-Version": PUBLIC_WEB_VERSION,
    },
  });
}

function clean(value: unknown, max = 600) {
  return String(value ?? "").trim().slice(0, max);
}

function asMap(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Json
    : {};
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function publicBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl;
  return "https://bot.bj";
}

function slugFromRequest(request: Request) {
  const url = new URL(request.url);
  const querySlug = clean(url.searchParams.get("slug"), 80);
  if (querySlug) return querySlug;
  const parts = url.pathname.split("/").filter(Boolean);
  const last = clean(parts.at(-1), 80);
  return last === "a" || last === "health" ? "" : last;
}

function shareConfig(agent: any) {
  return asMap(asMap(agent?.capabilities).public_share);
}

async function publicAgent(slug: string) {
  if (!/^[a-z0-9_-]{6,80}$/i.test(slug)) return null;

  const { data, error } = await service
    .from("waouh_ai_agents")
    .select("*")
    .contains("capabilities", { public_share: { slug } })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const share = shareConfig(data);
  if (share.enabled !== true || clean(share.slug) !== slug) return null;
  return data;
}

function normalizedKind(value: unknown) {
  const kind = clean(value).toLowerCase();
  if (kind === "training" || kind === "formation") return "training";
  if (kind === "presentation" || kind === "présentation") return "presentation";
  return "product";
}

function partnerPhotos(row: any) {
  const values = [
    ...asArray(row?.photos),
    row?.photo_url,
    row?.image_url,
  ].map((value) => clean(value, 1600)).filter(Boolean);
  return [...new Set(values)].slice(0, 3).map((url, index) => ({
    type: "image",
    filename: `photo-${index + 1}.jpg`,
    mime_type: "image/jpeg",
    url,
    caption: clean(row?.nom || row?.name),
  }));
}

async function signMedia(rawMedia: any[]) {
  const result: Json[] = [];
  for (const raw of rawMedia.slice(0, 5)) {
    const item = asMap(raw);
    const path = clean(item.storage_path, 1200);
    let url = clean(item.url, 2200);
    if (path) {
      const signed = await service.storage
        .from("agent-catalog-media")
        .createSignedUrl(path, 900);
      if (!signed.error) url = clean(signed.data?.signedUrl, 2200);
    }
    if (!url) continue;
    result.push({
      type: clean(item.type) || "image",
      filename: clean(item.filename) || "media",
      mime_type: clean(item.mime_type) || "application/octet-stream",
      url,
      caption: clean(item.caption),
    });
  }
  return result;
}

async function featuredCatalog(agent: any) {
  const agentId = clean(agent.id, 100);
  const userId = clean(agent.user_id, 100);
  const metadata = new Map<string, any>();
  for (const raw of asArray(asMap(agent.capabilities).studio_catalog)) {
    const item = asMap(raw);
    const id = clean(item.id, 100);
    if (id) metadata.set(id, item);
  }

  const [manualResult, linksResult] = await Promise.all([
    service
      .from("waouh_ai_agent_products")
      .select("*")
      .eq("agent_id", agentId)
      .eq("user_id", userId)
      .limit(24),
    service
      .from("waouh_ai_agent_partner_products")
      .select("product_id")
      .eq("agent_id", agentId)
      .eq("user_id", userId)
      .limit(24),
  ]);

  if (manualResult.error) throw manualResult.error;
  if (linksResult.error) throw linksResult.error;

  const entries: Json[] = [];
  for (const row of manualResult.data || []) {
    const meta = metadata.get(String(row.id || "")) || {};
    const media = await signMedia(asArray(meta.media));
    entries.push({
      id: String(row.id || ""),
      name: clean(row.name || row.nom) || "Élément",
      kind: normalizedKind(meta.kind || row.kind),
      description: clean(meta.description || row.description, 500),
      category: clean(meta.category || row.category || row.categorie, 120),
      price: row.price ?? row.prix ?? row.prix_min ?? null,
      duration: clean(meta.duration || row.duration, 80),
      format: clean(meta.format || row.format, 80),
      media,
    });
  }

  const ids = (linksResult.data || [])
    .map((row: any) => clean(row.product_id, 100))
    .filter(Boolean);
  if (ids.length) {
    const partners = await service
      .from("waouh_partners")
      .select("id")
      .eq("user_id", userId);
    if (partners.error) throw partners.error;
    const partnerIds = (partners.data || []).map((row: any) => row.id).filter(Boolean);
    if (partnerIds.length) {
      const products = await service
        .from("waouh_partner_products")
        .select("*")
        .in("id", ids)
        .in("partner_id", partnerIds);
      if (products.error) throw products.error;
      for (const row of products.data || []) {
        entries.push({
          id: `partner:${row.id}`,
          name: clean(row.nom || row.name) || "Produit",
          kind: "product",
          description: clean(row.description, 500),
          category: clean(row.categorie || row.category, 120),
          price: row.prix_min ?? row.price ?? null,
          media: partnerPhotos(row),
        });
      }
    }
  }

  return entries
    .filter((item) => item.name)
    .sort((a, b) => Number((b.media || []).length) - Number((a.media || []).length))
    .slice(0, 8);
}

function suggestions(agent: any, featured: any[]) {
  const kinds = new Set(featured.map((item) => item.kind));
  const values = [
    kinds.has("product") ? "Voir les produits" : "Découvrir les services",
    kinds.has("training") ? "Découvrir les formations" : "Que pouvez-vous faire pour moi ?",
    kinds.has("presentation") ? "Voir les présentations" : "Présentez votre activité",
    "Parler à un conseiller",
  ];
  return [...new Set(values)].slice(0, 4);
}

function sessionId(value: unknown) {
  const cleaned = clean(value, 90);
  return /^[a-zA-Z0-9_-]{16,90}$/.test(cleaned) ? cleaned : "";
}

async function conversationFor(agentId: string, sid: string) {
  const { data, error } = await service
    .from("waouh_ai_agent_conversations")
    .select("id,messages,last_activity")
    .eq("agent_id", agentId)
    .eq("wa_contact_phone", `web:${sid}`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function enforceRateLimit(conversation: any) {
  const since = Date.now() - 60_000;
  const recent = asArray(conversation?.messages).filter((message) => {
    const item = asMap(message);
    return item.role === "user" && Number(item.ts || 0) >= since;
  }).length;
  if (recent >= 12) {
    const error = new Error("Trop de messages. Réessayez dans une minute.");
    (error as any).status = 429;
    throw error;
  }
}

async function incrementStats(agent: any, changes: Json) {
  const current = await service
    .from("waouh_ai_agents")
    .select("stats")
    .eq("id", agent.id)
    .eq("user_id", agent.user_id)
    .maybeSingle();
  if (current.error) throw current.error;

  const stats = { ...asMap(current.data?.stats) };
  for (const [key, delta] of Object.entries(changes)) {
    stats[key] = Number(stats[key] || 0) + Number(delta || 0);
  }
  const updated = await service
    .from("waouh_ai_agents")
    .update({ stats, updated_at: new Date().toISOString() })
    .eq("id", agent.id)
    .eq("user_id", agent.user_id);
  if (updated.error) throw updated.error;
}

function sanitizeAttachment(raw: unknown) {
  const item = asMap(raw);
  const mimeType = clean(item.mime_type, 120);
  const data = clean(item.data, 12_000_000);
  if (!mimeType || !data) return null;
  const allowed = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|wav|ogg|aac)|application\/pdf|text\/(plain|csv|markdown)|application\/json)$/i;
  if (!allowed.test(mimeType)) throw new Error("Format de fichier non autorisé.");
  if (data.length > 11_500_000) throw new Error("Le fichier dépasse la limite autorisée.");
  return {
    mime_type: mimeType,
    data,
    filename: clean(item.filename, 180) || "media",
    type: clean(item.type, 30),
  };
}

function publicUrl(slug: string) {
  return `${publicBaseUrl()}/${encodeURIComponent(slug)}`;
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(request.url);
  const path = url.pathname.split("/").filter(Boolean).at(-1) || "";

  try {
    if (request.method === "GET" && path === "health") {
      return json({
        ok: true,
        version: PUBLIC_WEB_VERSION,
        ai_version: STUDIO_AI_VERSION,
        function_name: "a",
      });
    }

    const slug = slugFromRequest(request);
    if (!slug) {
      return json({
        ok: false,
        error: "Lien d’agent invalide.",
        public_base_url: publicBaseUrl(),
      }, 404);
    }

    if (request.method === "GET" && url.searchParams.get("qr") === "1") {
      const agent = await publicAgent(slug);
      if (!agent) return new Response("Lien indisponible", { status: 404, headers: cors });
      const png = await QRCode.toBuffer(publicUrl(slug), {
        type: "png",
        width: 420,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#075f57", light: "#ffffff" },
      });
      return new Response(png, {
        headers: {
          ...cors,
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    if (request.method === "GET") {
      const agent = await publicAgent(slug);
      if (!agent) {
        return json({
          ok: false,
          error: "Ce Web Chat est désactivé ou introuvable.",
        }, 404);
      }

      // Les domaines Supabase partagés transforment volontairement le HTML
      // en texte brut. La vraie interface est donc servie par bot.bj.
      // Cette redirection maintient aussi la compatibilité des anciens QR codes.
      return new Response(null, {
        status: 302,
        headers: {
          ...cors,
          "Location": publicUrl(slug),
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    }

    if (request.method !== "POST") return json({ ok: false, error: "Méthode non autorisée." }, 405);
    const body = asMap(await request.json().catch(() => ({})));
    const action = clean(body.action, 40);
    const sid = sessionId(body.session_id);
    if (!sid) return json({ ok: false, error: "Session Web invalide." }, 400);

    const agent = await publicAgent(slug);
    if (!agent) return json({ ok: false, error: "Ce Web Chat est désactivé ou introuvable." }, 404);

    if (action === "bootstrap") {
      const featured = await featuredCatalog(agent);
      await incrementStats(agent, { web_views: 1 });
      const persona = asMap(agent.persona);
      const firstMedia = featured.flatMap((item) => item.media || []).slice(0, 3);
      return json({
        ok: true,
        version: PUBLIC_WEB_VERSION,
        agent: {
          name: clean(agent.name) || "Agent IA",
          subtitle: clean(persona.role || persona.description || persona.name) || "Assistant intelligent sécurisé",
        },
        suggestions: suggestions(agent, featured),
        featured,
        welcome: clean(persona.greeting, 800) || `Bonjour 👋 Je suis ${clean(persona.name) || clean(agent.name) || "votre assistant"}. Comment puis-je vous aider ?`,
        welcome_media: firstMedia,
      });
    }

    if (action === "chat") {
      const message = clean(body.message, 4000);
      const attachment = sanitizeAttachment(body.attachment);
      if (!message && !attachment) return json({ ok: false, error: "Message vide." }, 400);

      const existing = await conversationFor(String(agent.id), sid);
      enforceRateLimit(existing);
      const firstConversation = !existing;
      const result = await runAgentTurn(service, String(agent.id), message || "Analyse ce média.", {
        persist: true,
        contact_phone: `web:${sid}`,
        contact_name: "Visiteur Web",
        input_attachments: attachment ? [attachment] : [],
      });
      await incrementStats(agent, {
        web_messages: 1,
        web_conversations: firstConversation ? 1 : 0,
      });
      return json({
        ok: true,
        reply: clean(result.reply, 12_000),
        attachments: asArray(result.attachments).slice(0, 8),
        needs_handoff: result.needs_handoff === true,
      });
    }

    return json({ ok: false, error: "Action inconnue." }, 400);
  } catch (error) {
    const status = Number((error as any)?.status || 500);
    console.error("public-agent-web", error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Service temporairement indisponible.",
    }, status);
  }
});
