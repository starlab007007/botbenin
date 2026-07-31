// Après BAC IA — OCR relevé de notes via Gemini Vision (image_url passthrough).
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { image_data_url, bac_series } = await req.json();
    if (!image_data_url) throw new Error("image_data_url requis");

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY manquant");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Tu es un OCR de relevé de notes du BAC (Bénin). Extrait uniquement les matières et notes. Réponds STRICTEMENT en JSON: {\"notes\":[{\"subject_name\":\"...\",\"score\":12.5}],\"general_average\":13.4,\"mention\":\"AB|B|TB|P\",\"bac_series\":\"A1|A2|B|C|D|E|F|G|H\"}. Si absent, mets null." },
          { role: "user", content: [
            { type: "text", text: "Extrait les notes de ce relevé." },
            { type: "image_url", image_url: { url: image_data_url } },
          ] },
        ],
      }),
    });
    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!aiRes.ok) throw new Error(`Gateway ${aiRes.status}`);
    const j = await aiRes.json();
    const text: string = j?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : text);
    } catch { parsed = { notes: [] }; }

    const series = bac_series || parsed.bac_series || null;
    const status = Array.isArray(parsed.notes) && parsed.notes.length > 0 ? "ok" : "failed";

    await supabase.from("apresbac_ocr_extractions").insert({
      user_id: user.id,
      bac_series: series,
      extracted_text: text.slice(0, 8000),
      detected_notes: parsed,
      extraction_status: status,
      image_retained: false,
    });

    return new Response(JSON.stringify({ ok: true, extraction: parsed, status }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("apresbac-ocr error", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
