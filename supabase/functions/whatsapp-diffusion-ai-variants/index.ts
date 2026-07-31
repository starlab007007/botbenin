// Génère N variantes naturelles d'un message WhatsApp via Lovable AI Gateway.
// Anti-spam : on évite que tous les destinataires reçoivent le même texte.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: corsHeaders });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return new Response(JSON.stringify({ error: "invalid" }), { status: 401, headers: corsHeaders });

    const { body, count = 4 } = await req.json();
    if (!body || typeof body !== "string") {
      return new Response(JSON.stringify({ error: "body required" }), { status: 400, headers: corsHeaders });
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "no LOVABLE_API_KEY" }), { status: 500, headers: corsHeaders });

    const sys = `Tu es un rédacteur WhatsApp pour le marché béninois.
Reformule le message fourni en ${count} variantes naturelles, ton chaleureux et local (FR du Bénin).
RÈGLES STRICTES :
- Garde l'intention et toutes les variables {nom}, {prenom}, {tag} EXACTEMENT.
- Max 900 caractères par variante.
- Pas d'emoji ajouté en dehors de ceux déjà présents.
- Pas de salutation supplémentaire si l'original n'en a pas.
- Réponds UNIQUEMENT en JSON: {"variants":["...","..."]}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: body },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI ${r.status}: ${t}` }), { status: r.status, headers: corsHeaders });
    }
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content ?? "{}";
    let variants: string[] = [];
    try { variants = JSON.parse(txt).variants ?? []; } catch { variants = [body]; }
    if (!Array.isArray(variants) || variants.length === 0) variants = [body];
    // Toujours inclure l'original en variante 0
    variants = [body, ...variants.filter((v) => v && v !== body)].slice(0, count + 1);

    return new Response(JSON.stringify({ variants }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: corsHeaders });
  }
});
