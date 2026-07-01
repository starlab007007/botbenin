import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, limit = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function fallback({ offerName, sector, cities, objective }: {
  offerName: string;
  sector: string;
  cities: string[];
  objective: string;
}) {
  const category = sector || "{{categorie_top}}";
  const place = cities.length ? cities.join(" et ") : "{{ville}}";
  const offer = offerName || "notre nouvelle offre";
  const cta = objective === "Vente urgente"
    ? "Répondez vite pour réserver."
    : "Répondez OUI pour recevoir les détails.";
  return `Bonjour {{display_name}} 👋\n${offer} est disponible à ${place} dans la catégorie ${category}.\n${cta}`;
}

function extractText(payload: unknown) {
  const root = payload as Record<string, unknown>;
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = first?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const text = (parts[0] as Record<string, unknown> | undefined)?.text;
  return typeof text === "string" ? text.trim() : "";
}

function parseSuggestion(text: string, fallbackValue: string) {
  const normalized = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const raw = JSON.parse(normalized) as Record<string, unknown>;
    const message = clean(raw.message, 520);
    const campaignName = clean(raw.campaign_name, 96);
    if (message) return { message, campaign_name: campaignName };
  } catch (_) {
    // Gemini may occasionally return plain text. Keep a safe, constrained value.
  }
  return { message: clean(normalized, 520) || fallbackValue, campaign_name: "" };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "Méthode non autorisée." }, 405);

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ ok: false, error: "Connexion requise." }, 401);

    const body = await request.json().catch(() => ({}));
    const offerName = clean(body.offer_name, 120);
    const sector = clean(body.sector, 80) || "{{categorie_top}}";
    const cities = Array.isArray(body.cities)
      ? body.cities.map((item: unknown) => clean(item, 48)).filter(Boolean).slice(0, 4)
      : [];
    const tone = clean(body.tone, 40) || "Convivial";
    const objective = clean(body.objective, 60) || "Lancement";
    const fallbackValue = fallback({ offerName, sector, cities, objective });

    if (!GEMINI_API_KEY) {
      // Flutter already has a deterministic local fallback. Returning this explicit
      // result preserves a usable, secure flow when the secret is not set yet.
      return json({
        ok: true,
        provider: "fallback",
        suggestions: [fallbackValue],
        campaign_name: offerName || `Diffusion ${sector}`,
      });
    }

    const prompt = `Tu es WAOUH, un assistant de rédaction commerciale pour WhatsApp au Bénin.
Retourne uniquement un JSON valide, sans markdown, avec les clés exactes :
{"campaign_name":"...","message":"..."}

Contexte :
- Offre : ${offerName || "offre ciblée"}
- Catégorie : ${sector}
- Ville(s) : ${cities.length ? cities.join(", ") : "{{ville}}"}
- Ton : ${tone}
- Objectif : ${objective}

Contraintes impératives :
1. Le message est en français, clair, commercial, naturel et prêt à être soumis à validation.
2. Il contient exactement la variable {{display_name}} au début de la salutation.
3. Il conserve {{ville}} lorsqu'aucune ville précise n'est fournie.
4. Il conserve {{categorie_top}} lorsque la catégorie n'est pas précise.
5. Maximum 420 caractères, 2 ou 3 courtes lignes, une seule action finale explicite.
6. Ne promets pas de prix, de stock, de livraison ou de réduction non fournis.
7. N'invente aucune donnée personnelle.
8. La campagne a un nom court et descriptif.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.45,
            topP: 0.9,
            maxOutputTokens: 420,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("[waouh-diffusion-suggest] Gemini error", response.status, detail.slice(0, 500));
      return json({ ok: true, provider: "fallback", suggestions: [fallbackValue], campaign_name: offerName || `Diffusion ${sector}` });
    }

    const parsed = parseSuggestion(extractText(await response.json()), fallbackValue);
    return json({
      ok: true,
      provider: "gemini",
      suggestions: [parsed.message],
      campaign_name: parsed.campaign_name || offerName || `Diffusion ${sector}`,
    });
  } catch (error) {
    console.error("[waouh-diffusion-suggest]", error);
    return json({ ok: false, error: "Suggestion IA temporairement indisponible." }, 500);
  }
});
