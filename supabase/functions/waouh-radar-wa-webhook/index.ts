// WAHA inbound webhook — capture messages from opt-in WhatsApp groups for radar analysis
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeE164 } from "../_shared/waouh-tel/phone.ts";
import { rehostMedia } from "../_shared/waouhContact.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session, x-waouh-webhook-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const WAHA_WEBHOOK_TOKEN = Deno.env.get("WAHA_WEBHOOK_TOKEN") || "";
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY_PLAIN") || Deno.env.get("WAHA_API_KEY") || "";

async function aiExtract(text: string, imageUrl?: string | null): Promise<any> {
  const userContent: any = imageUrl
    ? [
        { type: "text", text: (text || "Analyse cette image commerciale publiée dans un groupe WhatsApp autorisé.").slice(0, 1500) },
        { type: "image_url", image_url: { url: imageUrl } },
      ]
    : text.slice(0, 1500);
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Analyse un message ou une photo commerciale provenant d'un groupe WhatsApp explicitement autorisé au Bénin. Retourne JSON {intent: SELL|BUY|NEGOTIATE|UNKNOWN, title, price (FCFA), category, city, contact_phone (+22901XXXXXXXX seulement s'il est visible), whatsapp_phone (+22901XXXXXXXX seulement s'il est explicitement présenté comme WhatsApp), confidence (0-1)}. N'invente aucune donnée." },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const d = await r.json();
  try { return JSON.parse(d.choices?.[0]?.message?.content ?? "{}"); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Shared-secret auth (set WAHA webhook header: x-waouh-webhook-token)
  if (WAHA_WEBHOOK_TOKEN) {
    const provided = req.headers.get("x-waouh-webhook-token") || "";
    if (provided !== WAHA_WEBHOOK_TOKEN) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const evt = await req.json();
    const payload = evt.payload || evt;
    const from = payload.author || payload.participant || payload.from || "";
    const groupId = payload.chatId || payload.to || payload.from || "";
    const body = String(payload.body || payload.text || payload.caption || "").trim();
    if (!groupId.endsWith("@g.us")) {
      return new Response(JSON.stringify({ ok: true, skip: "not group msg" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify the source is registered & active. WAOUH never crawls arbitrary
    // WhatsApp groups: only groups explicitly allowlisted by an administrator.
    const { data: src } = await sb.from("waouh_radar_sources").select("*").eq("type", "wa_group").eq("identifier", groupId).eq("active", true).maybeSingle();
    if (!src) return new Response(JSON.stringify({ ok: true, skip: "group not opted-in" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const mediaUrl = String(
      payload.mediaUrl ?? payload.media_url ?? payload.imageUrl ??
      payload.image_url ?? payload._data?.deprecatedMms3Url ?? "",
    ).trim();
    let stablePhoto: string | null = null;
    if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) {
      stablePhoto = await rehostMedia(sb, mediaUrl, payload.mimetype || "image/jpeg", {
        wahaBaseUrl: WAHA_BASE_URL,
        wahaApiKey: WAHA_API_KEY,
      });
    }
    if (!body && !stablePhoto) {
      return new Response(JSON.stringify({ ok: true, skip: "empty commerce content" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ext = await aiExtract(body, stablePhoto);
    if (!ext || (ext.confidence ?? 0) < 0.4) {
      return new Response(JSON.stringify({ ok: true, skip: "low confidence" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const senderPhone = normalizeE164(String(from).replace(/@.*/, ""));
    const visiblePhone = normalizeE164(ext.whatsapp_phone || ext.contact_phone);
    const phone = visiblePhone || senderPhone;
    const photos = stablePhoto ? [stablePhoto] : [];
    await sb.from("waouh_radar_signals").insert({
      source_id: src.id,
      source_type: "wa_group",
      raw_text: body || ext.title || "Annonce illustrée",
      raw_url: `wa://${groupId}/${payload.id || ""}`,
      raw_payload: {
        ...payload,
        normalized_phone: phone,
        sender_phone: senderPhone,
        visible_contact_phone: visiblePhone,
        whatsapp_detected: !!ext.whatsapp_phone,
        photos,
      },
      intent: ext.intent || "UNKNOWN",
      product: {
        ...ext,
        title: ext.title || null,
        photos,
        image_url: photos[0] ?? null,
        whatsapp_detected: !!ext.whatsapp_phone,
      },
      category: ext.category,
      price: ext.price,
      city: ext.city,
      contact_phone: phone,
      contact_handle: payload.notifyName || payload.pushName || null,
      confidence: ext.confidence,
      status: "extracted",
    });

    // Trigger processing async
    fetch(`${SUPABASE_URL}/functions/v1/waouh-radar-process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 5 }),
    }).catch(console.error);

    return new Response(JSON.stringify({ ok: true, intent: ext.intent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-radar-wa-webhook]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
