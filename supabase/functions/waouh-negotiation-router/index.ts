// WAOUH Negotiation Router — pilote l'échange acheteur↔vendeur après un match
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const paymentCard = (amount: number, txId?: string | null) =>
  `\n\n💳 *Carte de paiement WAOUH*\n• *Montant* : ${fmt(amount)}\n• *Sécurité* : escrow WAOUH\n• *Statut* : en attente\n• *Référence* : ${txId ? txId.slice(0, 8).toUpperCase() : "créée"}\n\n👉 Appuyez sur *Payer* ou envoyez : *payer 0165653468*`;
const paymentActions = [{ id: "payer 0165653468", label: "Payer" }, { id: "mtn", label: "MTN" }, { id: "moov", label: "Moov" }];

async function aiIntent(text: string): Promise<{ kind: "yes"|"no"|"price"|"other"; price?: number }> {
  const lower = (text || "").toLowerCase();
  // Déterministe d'abord
  if (/\b(non|no|refuse|refus[eé])\b/i.test(lower)) return { kind: "no" };
  if (/\b(oui|ok|d'?accord|j'accepte|accept[eé]|yes)\b/i.test(lower) && !/propose/.test(lower)) return { kind: "yes" };
  const m = lower.match(/(\d{2,3}(?:[\s.,]?\d{3})+|\d{3,9})\s*(?:f|fcfa|cfa)/i)
        || lower.match(/(?:propose|offre|prix|à|a)\s*(\d{3,9})/i);
  if (m) return { kind: "price", price: parseInt(m[1].replace(/\D/g, ""), 10) };
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: 'Classifie une réponse de négociation FR/local. JSON: {"kind":"yes"|"no"|"price"|"other","price":number?}.' },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const d = await r.json();
    return JSON.parse(d.choices[0].message.content);
  } catch {
    return { kind: "other" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Helper: notification cloche + message direct chez l'autre partie
  async function pushToOther(toUserId: string, template: string, payload: any, directText: string, directMeta: any, transactionId: string | null = null) {
    const { data: target } = await sb.from("waouh_users")
      .select("id, phone_number, web_session_id").eq("id", toUserId).maybeSingle();
    if (!target) return;
    if (target.id === payload?.from_user_id) return;
    let insertedMsgId: string | null = null;
    if (target.web_session_id) {
      try {
        const { data: msg } = await sb.from("waouh_messages").insert({
          user_id: target.id, channel: "web", direction: "out",
          text: directText, web_session_id: target.web_session_id,
          meta: { ...(directMeta || {}), transaction_id: transactionId ?? directMeta?.transaction_id ?? null },
        }).select("id").maybeSingle();
        insertedMsgId = msg?.id ?? null;
      } catch (e) { console.warn("[neg-router] msg", e); }
    }
    try {
      await sb.rpc("waouh_enqueue_outbound_v2", {
        p_to_phone: target.phone_number,
        p_to_user_id: target.id,
        p_template: template,
        p_payload: { ...(payload || {}), text: directText, message_id: insertedMsgId, transaction_id: transactionId },
        p_web_session_id: target.web_session_id,
        p_image_url: null,
        p_channel: target.phone_number ? "whatsapp" : "web",
        p_message_id: insertedMsgId,
        p_transaction_id: transactionId,
      });
    } catch (e) { console.warn("[neg-router] enqueue", e); }
  }

  try {
    const { phone, text, user_id } = await req.json();

    let user: any = null;
    if (user_id) ({ data: user } = await sb.from("waouh_users").select("*").eq("id", user_id).maybeSingle());
    if (!user && phone) ({ data: user } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle());
    if (!user) return new Response(JSON.stringify({ ok: false, reason: "user not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: neg } = await sb
      .from("waouh_negotiations")
      .select("*")
      .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
      .in("state", ["proposed", "countered"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!neg) {
      return new Response(JSON.stringify({ ok: true, reply: "🤔 Aucune négociation ouverte. Cherchez un produit puis dites *intéressé 1*." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const intent = await aiIntent(text || "");
    const isBuyer = neg.buyer_user_id === user.id;
    const otherUserId = isBuyer ? neg.seller_user_id : neg.buyer_user_id;
    const amount = Number(neg.last_offer_price || 0);

    if (intent.kind === "yes") {
      await sb.from("waouh_negotiations").update({ state: "accepted", last_actor: isBuyer ? "buyer" : "seller" }).eq("id", neg.id);
      let txId = neg.transaction_id;
      if (!txId) {
        const { data: tx } = await sb.from("waouh_transactions").insert({
          article_id: neg.article_id, seller_id: neg.seller_user_id, buyer_id: neg.buyer_user_id,
          amount, commission: Math.round(amount * 0.05),
          payment_method: "mobile_money", negotiated_price: amount,
          status: "payment_pending", escrow_status: "pending",
        }).select().single();
        txId = tx?.id ?? null;
        if (txId) await sb.from("waouh_negotiations").update({ transaction_id: txId }).eq("id", neg.id);
      }
      // Notifie l'autre partie (généralement l'acheteur)
      if (otherUserId) {
        const targetIsBuyer = otherUserId === neg.buyer_user_id;
        const txt = targetIsBuyer
          ? `✅ *Le vendeur a accepté*\n\n💰 *Prix final* : ${fmt(amount)}\n\nVous pouvez maintenant payer en Mobile Money.` + paymentCard(amount, txId)
          : `✅ *L'acheteur a accepté*\n\n💰 *Prix final* : ${fmt(amount)}\n\nLe paiement va être lancé. Vous recevrez une notification dès que l'argent est bloqué en escrow.` + paymentCard(amount, txId);
        await pushToOther(otherUserId, "negotiation_open", { neg_id: neg.id, accepted: true, transaction_id: txId, price: amount, from_user_id: user.id }, txt, { intent: "negotiation_accepted", negotiation_id: neg.id, transaction_id: txId });
      }
      const reply = isBuyer
        ? `✅ *Accord enregistré*\n\n💰 *Prix final* : ${fmt(amount)}\n\nVous pouvez finaliser le paiement maintenant.` + paymentCard(amount, txId)
        : `✅ *Accord enregistré*\n\n💰 *Prix final* : ${fmt(amount)}\n\nL'acheteur va lancer le paiement.` + paymentCard(amount, txId);
      return new Response(JSON.stringify({ ok: true, reply, transaction_id: txId, intent: "negotiation_accepted", actions: paymentActions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (intent.kind === "no") {
      await sb.from("waouh_negotiations").update({ state: "closed", last_actor: isBuyer ? "buyer" : "seller" }).eq("id", neg.id);
      if (otherUserId) {
        await pushToOther(otherUserId, "negotiation_open", { neg_id: neg.id, closed: true }, `❌ ${isBuyer ? "L'acheteur" : "Le vendeur"} a refusé. Négociation clôturée.`, { intent: "negotiation_closed", negotiation_id: neg.id });
      }
      return new Response(JSON.stringify({ ok: true, reply: "OK, négociation fermée. Merci !" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (intent.kind === "price" && intent.price) {
      await sb.from("waouh_negotiations").update({
        state: "countered", last_offer_price: intent.price, last_actor: isBuyer ? "buyer" : "seller",
      }).eq("id", neg.id);
      if (neg.transaction_id) {
        await sb.from("waouh_transactions").update({
          amount: intent.price, negotiated_price: intent.price,
          commission: Math.round(intent.price * 0.05), status: "payment_pending",
        }).eq("id", neg.transaction_id);
      }
      if (otherUserId) {
        await pushToOther(otherUserId, "negotiation_open",
          { neg_id: neg.id, offer: intent.price, transaction_id: neg.transaction_id },
          `🤝 *Nouvelle ${isBuyer ? "offre acheteur" : "contre-offre vendeur"} : ${fmt(intent.price)}*\n\nRépondez « OUI » pour accepter, « NON » pour refuser, ou proposez un autre montant.`,
          { intent: "negotiation_open", negotiation_id: neg.id, transaction_id: neg.transaction_id });
      }
      return new Response(JSON.stringify({ ok: true, reply: `Contre-offre ${fmt(intent.price)} transmise.`, transaction_id: neg.transaction_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, reply: "Répondez « OUI » pour accepter, « NON » pour refuser, ou un montant pour contre-proposer." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-negotiation-router]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
