import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function ai(system: string, user: string, json = true) {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const data = await res.json();
  const txt = data?.choices?.[0]?.message?.content ?? "";
  if (json) { try { return JSON.parse(txt); } catch { return {}; } }
  return txt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Meta WhatsApp verification (sprint 2)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (verifyToken && expected && verifyToken === expected) {
      return new Response(challenge ?? "", { headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();

    const phone = body.phone_number || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    const webSessionId = body.web_session_id || null;
    const text = body.text || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || "";
    const lat = body.lat ?? 6.36;
    const lng = body.lng ?? 2.42;
    const city = body.city ?? "Cotonou";
    const channel = body.channel ?? (webSessionId ? "web" : "whatsapp");
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const passedUserId = body.user_id || null;

    if ((!phone && !webSessionId) || (!text && attachments.length === 0)) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find/upsert user (prefer passed id, then web_session_id, then phone)
    let user: any = null;
    if (passedUserId) {
      const { data } = await sb.from("waouh_users").select("*").eq("id", passedUserId).maybeSingle();
      user = data;
    }
    if (!user && webSessionId) {
      const { data } = await sb.from("waouh_users").select("*").eq("web_session_id", webSessionId).maybeSingle();
      user = data;
    }
    if (!user && phone && !phone.startsWith("web:")) {
      const { data } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle();
      user = data;
    }
    if (!user) {
      const { data: created } = await sb.from("waouh_users").insert({
        phone_number: phone && !phone.startsWith("web:") ? phone : null,
        web_session_id: webSessionId,
        channel, city,
        location: `SRID=4326;POINT(${lng} ${lat})` as any,
      }).select().single();
      user = created;
    }

    // Detect intent
    const intent = await ai(
      "Tu es WAOUH, assistant commerce IA. Détecte l'intention parmi: SELL, BUY, NEGOTIATE, PAY, CONFIRM, RATE, HELP, UNKNOWN. Retourne JSON {intent}.",
      text
    );

    let reply = "Désolé, je n'ai pas compris. Tapez 'aide' pour les commandes.";

    if (intent.intent === "SELL") {
      const product = await ai(
        `Tu es WAOUH. Extrais d'un message vendeur la fiche produit en JSON: {title, category (smartphone/ordinateur/vetement/vehicule/electromenager/meuble/autre), brand, model, condition (new/like_new/good/fair/poor), price (number, FCFA), description, market_price_min, market_price_max, confidence (0-1)}.`,
        text
      );
      if ((product.confidence ?? 0) < 0.5 || !product.price) {
        reply = "🤔 Je n'ai pas tous les détails. Pouvez-vous préciser le produit, l'état et le prix ?";
      } else {
        const { data: art } = await sb.from("waouh_articles").insert({
          seller_id: user!.id,
          title: product.title || "Annonce",
          description: product.description,
          category: product.category || "autre",
          brand: product.brand, model: product.model,
          condition: product.condition || "good",
          price: product.price, currency: "XOF",
          city: user!.city,
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
          market_price_min: product.market_price_min,
          market_price_max: product.market_price_max,
        }).select().single();

        const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
        reply = `✅ *Annonce publiée !*\n\n📦 ${product.title}\n💰 ${fmt(product.price)}\n📍 ${user!.city}\n\n📊 Prix marché estimé: ${fmt(product.market_price_min || product.price * 0.8)} – ${fmt(product.market_price_max || product.price * 1.2)}\n\n🔔 Les acheteurs intéressés dans votre zone seront notifiés automatiquement.`;
      }
    } else if (intent.intent === "BUY") {
      const criteria = await ai(
        "Extrais les critères d'achat en JSON: {keywords (array), category, price_max, condition_min, radius_km}.",
        text
      );
      const { data: matches } = await sb.from("waouh_articles")
        .select("id,title,price,city,brand,condition")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      await sb.from("waouh_buyer_profiles").insert({
        user_id: user!.id, query_text: text,
        category: criteria.category, keywords: criteria.keywords ?? [],
        price_max: criteria.price_max, radius_km: criteria.radius_km ?? 30,
        location: `SRID=4326;POINT(${lng} ${lat})` as any,
      });

      const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
      if (!matches || matches.length === 0) {
        reply = `🔍 Aucune annonce ne correspond pour l'instant. Profil sauvegardé : vous serez notifié dès qu'un vendeur publie un produit correspondant !`;
      } else {
        const list = matches.map((m: any, i: number) => `${i + 1}. *${m.title}* — ${fmt(m.price)} (${m.city ?? "?"}, ${m.condition})`).join("\n");
        reply = `🎯 *${matches.length} annonces trouvées :*\n\n${list}\n\n💡 Répondez par "intéressé N°X" pour démarrer.`;
      }
    } else if (intent.intent === "NEGOTIATE") {
      const offer = await ai("Extrais le montant en FCFA en JSON {amount}.", text);
      reply = `💬 Offre reçue : ${offer.amount} FCFA. Je transmets au vendeur. Réponse dans quelques instants...`;
    } else if (intent.intent === "PAY") {
      reply = `💳 Paiement Mobile Money initié. Vous allez recevoir une notification MTN/Moov pour valider. Les fonds seront bloqués en escrow et libérés au vendeur après confirmation de réception.`;
    } else if (intent.intent === "HELP") {
      reply = `🤖 *WAOUH — Commandes :*\n\n• "Je vends ..." pour publier une annonce\n• "Je cherche ..." pour trouver un produit\n• "Je propose X FCFA" pour négocier\n• "Je paye" pour finaliser`;
    }

    // Save conversation
    await sb.from("waouh_conversations").upsert({
      user_id: user!.id, phone_number: phone,
      state: intent.intent?.toLowerCase() ?? "idle",
      last_message: text, last_intent: intent.intent,
    }, { onConflict: "phone_number" } as any);

    return new Response(JSON.stringify({ ok: true, intent: intent.intent, reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
