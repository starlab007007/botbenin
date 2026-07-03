import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { chatCompletion } from "../_shared/agent-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, code: "UNAUTHORIZED", error: "Connexion requise" }, 401);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data } = await userClient.auth.getUser();
    if (!data.user) return json({ ok: false, code: "UNAUTHORIZED", error: "Session expirée" }, 401);
    if (!Deno.env.get("LOVABLE_API_KEY")) return json({ ok: false, code: "AI_KEY_MISSING", error: "Service IA non configuré" }, 503);

    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode || "");
    let content: unknown;
    let transcript: string | null = null;
    if (mode === "text") {
      transcript = String(body.text || "").trim();
      if (!transcript) return json({ ok: false, code: "EMPTY_TEXT", error: "Aucun texte à analyser" }, 400);
      content = `Voici une dictée ou un texte de catalogue :\n${transcript}\n\nExtrait tous les produits ou services.`;
    } else if (mode === "image") {
      const image = String(body.image_base64 || "").trim();
      if (!image) return json({ ok: false, code: "EMPTY_IMAGE", error: "Image manquante" }, 400);
      const mime = String(body.image_mime || "image/jpeg");
      content = [
        { type: "text", text: "Voici une photo de catalogue, menu ou liste de prix. Extrait tous les produits ou services visibles." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${image}` } },
      ];
    } else {
      return json({ ok: false, code: "INVALID_MODE", error: "Mode non pris en charge" }, 400);
    }

    const result = await chatCompletion({
      system: `Tu es un extracteur de catalogue en français. Retourne uniquement un JSON valide : {"products":[{"name":"...","price_fcfa":5000,"description":"..."}]}. Règles : name obligatoire et court, price_fcfa entier ou null, description courte ou null, aucun doublon, aucun texte hors JSON.`,
      messages: [{ role: "user", content }],
      jsonMode: true,
      temperature: 0.15,
    });
    let parsed: any = { products: [] };
    try {
      parsed = JSON.parse(result);
    } catch (_) {
      const match = result.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    const products = Array.isArray(parsed?.products)
      ? parsed.products
          .map((item: any) => ({
            name: String(item?.name || "").trim().slice(0, 80),
            price_fcfa: Number.isFinite(Number(item?.price_fcfa)) ? Math.round(Number(item.price_fcfa)) : null,
            description: item?.description ? String(item.description).trim().slice(0, 180) : null,
          }))
          .filter((item: any) => item.name)
      : [];
    return json({ ok: true, products, transcript });
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const code = text.includes("LOVABLE_API_KEY") ? "AI_KEY_MISSING" : "AI_PROVIDER_ERROR";
    console.error("waouh-agent-parse-catalog", error);
    return json({ ok: false, code, error: text }, 400);
  }
});
