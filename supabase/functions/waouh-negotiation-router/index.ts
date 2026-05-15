// WAOUH Negotiation Router — pilote l'échange acheteur↔vendeur après un match
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function aiIntent(text: string): Promise<{ kind: "yes"|"no"|"price"|"other"; price?: number }> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: 'Classifie une réponse de négociation en français/local. JSON: {"kind":"yes"|"no"|"price"|"other","price":number?}.' },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const d = await r.json();
    return JSON.parse(d.choices[0].message.content);
  } catch {
    const m = text.match(/(\d{3,9})/);
    if (m) return { kind: "price", price: Number(m[1]) };
    if (/oui|ok|d'?accord|yes/i.test(text)) return { kind: "yes" };
    if (/non|no|refuse/i.test(text)) return { kind: "no" };
    return { kind: "other" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone, text, user_id } = await req.json();
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Trouve l'utilisateur via phone ou user_id
    let user: any = null;
    if (user_id) ({ data: user } = await sb.from("waouh_users").select("*").eq("id", user_id).maybeSingle());
    if (!user && phone) ({ data: user } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle());
    if (!user) return new Response(JSON.stringify({ ok: false, reason: "user not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Trouve une négociation ouverte où il participe
    const { data: neg } = await sb
      .from("waouh_negotiations")
      .select("*")
      .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
      .in("state", ["proposed", "countered"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!neg) {
      // Aucune négo ouverte : tente de la créer depuis le dernier match récent ciblant cet user
      const { data: lastMatch } = await sb
        .from("waouh_radar_matches")
        .select("*, waouh_radar_signals!inner(*)")
        .eq("target_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!lastMatch) return new Response(JSON.stringify({ ok: false, reason: "no open negotiation" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const sig: any = (lastMatch as any).waouh_radar_signals;
      const intent = await aiIntent(text || "");
      if (intent.kind === "no") {
        return new Response(JSON.stringify({ ok: true, reply: "OK, on note. À bientôt sur WAOUH." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const price = intent.kind === "price" ? intent.price : sig.price;
      const { data: created } = await sb.from("waouh_negotiations").insert({
        match_id: lastMatch.id,
        article_id: sig.promoted_article_id,
        buyer_user_id: user.id,
        seller_user_id: sig.waouh_user_id,
        state: "proposed",
        last_offer_price: price,
        last_actor: "buyer",
      }).select().single();

      // Notifie vendeur
      if (sig.contact_phone) {
        await sb.rpc("waouh_enqueue_outbound", {
          p_to_phone: sig.contact_phone, p_to_user_id: sig.waouh_user_id,
          p_template: "negotiation_open",
          p_payload: { price, title: sig.product?.title || sig.category, negotiation_id: created?.id },
        });
      }
      return new Response(JSON.stringify({ ok: true, reply: `🤝 Offre transmise au vendeur (${price} FCFA). On vous tient au courant.` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Négo ouverte : interprète la réponse
    const intent = await aiIntent(text || "");
    const isBuyer = neg.buyer_user_id === user.id;
    const otherUserId = isBuyer ? neg.seller_user_id : neg.buyer_user_id;
    const { data: other } = otherUserId ? await sb.from("waouh_users").select("phone_number").eq("id", otherUserId).maybeSingle() : { data: null } as any;

    if (intent.kind === "yes") {
      await sb.from("waouh_negotiations").update({ state: "accepted", last_actor: isBuyer ? "buyer" : "seller" }).eq("id", neg.id);
      // Génère paiement Qosic
      try {
        const payRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-payment`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: neg.last_offer_price,
            buyer_user_id: neg.buyer_user_id,
            seller_user_id: neg.seller_user_id,
            article_id: neg.article_id,
          }),
        });
        const pay = await payRes.json().catch(() => ({}));
        if (pay?.url && other?.phone_number) {
          await sb.rpc("waouh_enqueue_outbound", {
            p_to_phone: other.phone_number, p_to_user_id: otherUserId,
            p_template: "payment_link", p_payload: { amount: neg.last_offer_price, url: pay.url },
          });
        }
        return new Response(JSON.stringify({ ok: true, reply: `✅ Accord ! Lien de paiement envoyé.${pay?.url ? "\n🔗 " + pay.url : ""}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ ok: true, reply: "✅ Accord enregistré. Le vendeur sera notifié." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (intent.kind === "no") {
      await sb.from("waouh_negotiations").update({ state: "closed", last_actor: isBuyer ? "buyer" : "seller" }).eq("id", neg.id);
      return new Response(JSON.stringify({ ok: true, reply: "OK, négociation fermée. Merci !" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (intent.kind === "price" && intent.price) {
      await sb.from("waouh_negotiations").update({
        state: "countered", last_offer_price: intent.price, last_actor: isBuyer ? "buyer" : "seller",
      }).eq("id", neg.id);
      if (other?.phone_number) {
        await sb.rpc("waouh_enqueue_outbound", {
          p_to_phone: other.phone_number, p_to_user_id: otherUserId,
          p_template: "negotiation_open", p_payload: { price: intent.price, negotiation_id: neg.id },
        });
      }
      return new Response(JSON.stringify({ ok: true, reply: `Contre-offre ${intent.price} FCFA transmise.` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, reply: "Répondez OUI pour accepter, NON pour refuser, ou un montant pour contre-proposer." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-negotiation-router]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
