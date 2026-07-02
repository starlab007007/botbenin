// Parse a catalog from audio (voice dictation), image (menu photo), or PDF into a list of products.
// Returns { products: [{name, price_fcfa?, description?}, ...] }
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletion } from "../_shared/agent-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

async function transcribe(audioBase64: string, format: string): Promise<string> {
  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: `audio/${format}` });
  const fd = new FormData();
  fd.append("model", "openai/gpt-4o-mini-transcribe");
  fd.append("file", blob, `rec.${format}`);
  const r = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}` },
    body: fd,
  });
  if (!r.ok) throw new Error(`STT ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { mode, audio_base64, audio_format, image_base64, image_mime, text } = await req.json();

    let source = "";
    let userContent: any = null;

    if (mode === "voice") {
      if (!audio_base64) throw new Error("audio requis");
      source = await transcribe(audio_base64, audio_format || "webm");
      userContent = `Voici la description vocale d'un catalogue : "${source}"\n\nExtrait TOUS les produits/services mentionnés.`;
    } else if (mode === "image") {
      if (!image_base64) throw new Error("image requise");
      userContent = [
        { type: "text", text: "Voici la photo d'un catalogue, menu ou liste de prix. Extrait TOUS les produits/services visibles." },
        { type: "image_url", image_url: { url: `data:${image_mime || "image/jpeg"};base64,${image_base64}` } },
      ];
    } else if (mode === "text") {
      source = String(text || "");
      userContent = `Texte fourni :\n${source}\n\nExtrait tous les produits/services.`;
    } else {
      throw new Error("mode invalide");
    }

    const system = `Tu es un extracteur de catalogue produit en français. Retourne UNIQUEMENT du JSON valide au format:
{"products":[{"name":"...", "price_fcfa": 5000, "description": "..."}]}

Règles:
- name obligatoire, court (max 60 caractères)
- price_fcfa : nombre entier en FCFA, ou null si non mentionné
- description : 1 ligne courte (max 120 caractères), ou null
- Pas de doublon, pas de commentaire hors JSON.`;

    const content = await chatCompletion({
      system,
      messages: [{ role: "user", content: userContent }],
      jsonMode: true,
      temperature: 0.2,
    });

    let parsed: any = { products: [] };
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    const products = Array.isArray(parsed.products) ? parsed.products : [];

    return new Response(JSON.stringify({ ok: true, products, transcript: source || null }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
