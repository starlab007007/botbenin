// WAHA inbound webhook — capture messages from opt-in WhatsApp groups for radar analysis
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { geminiJson } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function aiExtract(text: string): Promise<any> {
  return geminiJson(
    "Analyse un message WhatsApp (groupe vente Bénin) et retourne JSON {intent: SELL|BUY|NEGOTIATE|UNKNOWN, title, price (FCFA), category, city, confidence (0-1)}. Sinon confidence=0.",
    text.slice(0, 1500),
    { confidence: 0 },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const evt = await req.json();
    const payload = evt.payload || evt;
    const from = payload.from || payload.author || "";
    const groupId = payload.to || payload.chatId || "";
    const body = payload.body || payload.text || "";
    if (!body || !groupId.endsWith("@g.us")) {
      return new Response(JSON.stringify({ ok: true, skip: "not group msg" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify the source is registered & active (opt-in)
    const { data: src } = await sb.from("waouh_radar_sources").select("*").eq("type", "wa_group").eq("identifier", groupId).eq("active", true).maybeSingle();
    if (!src) return new Response(JSON.stringify({ ok: true, skip: "group not opted-in" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ext = await aiExtract(body);
    if (!ext || (ext.confidence ?? 0) < 0.4) {
      return new Response(JSON.stringify({ ok: true, skip: "low confidence" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phone = String(from).replace(/@.*/, "").replace(/\D/g, "");
    await sb.from("waouh_radar_signals").insert({
      source_id: src.id,
      source_type: "wa_group",
      raw_text: body,
      raw_url: `wa://${groupId}/${payload.id || ""}`,
      raw_payload: payload,
      intent: ext.intent || "UNKNOWN",
      product: ext,
      category: ext.category,
      price: ext.price,
      city: ext.city,
      contact_phone: phone,
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
