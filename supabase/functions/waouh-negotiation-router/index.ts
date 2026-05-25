// WAOUH Negotiation Router — pilote l'échange acheteur↔vendeur après un match.
// Modèle: PAS DE PAIEMENT. Quand un OUI est exprimé par l'une des parties,
// les coordonnées sont automatiquement échangées et la négociation est close.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { contactExchangeText, waouhHeader, waouhFooter, waouhSep, distanceKm, formatDistance, resolveRealPhoneE164 } from "../_shared/waouh-format.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const negotiationActions = (_negId: string) => [] as Array<{ id: string; label: string }>;


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
  async function pushToOther(toUserId: string, template: string, payload: any, directText: string, directMeta: any, transactionId: string | null = null, actions: Array<{id:string;label:string;url?:string}> = [], dedupeKey: string | null = null, eventType: string | null = null, attachments: Array<{url: string; type: string; caption?: string}> = []) {
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
          attachments,
          meta: { ...(directMeta || {}), transaction_id: transactionId ?? directMeta?.transaction_id ?? null, actions },
        }).select("id").maybeSingle();
        insertedMsgId = msg?.id ?? null;
      } catch (e) { console.warn("[neg-router] msg", e); }
    }
    try {
      await sb.rpc("waouh_enqueue_outbound_v2", {
        p_to_phone: target.phone_number,
        p_to_user_id: target.id,
        p_template: template,
        p_payload: { ...(payload || {}), text: directText, actions, message_id: insertedMsgId, transaction_id: transactionId, attachments },
        p_web_session_id: target.web_session_id,
        p_image_url: attachments?.[0]?.url ?? null,
        p_channel: target.phone_number ? "whatsapp" : "web",
        p_message_id: insertedMsgId,
        p_transaction_id: transactionId,
        p_dedupe_key: dedupeKey,
        p_event_type: eventType,
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
      // 🎉 Accord conclu : on échange les coordonnées et on clôt.
      const nowIso = new Date().toISOString();
      await sb.from("waouh_negotiations").update({
        state: "accepted",
        last_actor: isBuyer ? "buyer" : "seller",
        closed_at: nowIso,
        contact_shared_at: nowIso,
      }).eq("id", neg.id);

      // Charge les deux parties + article (pour photos et titre)
      const [{ data: buyer }, { data: seller }, { data: article }] = await Promise.all([
        sb.from("waouh_users").select("id, display_name, phone_number, city, web_session_id, location, auth_user_id").eq("id", neg.buyer_user_id).maybeSingle(),
        sb.from("waouh_users").select("id, display_name, phone_number, city, web_session_id, location, auth_user_id").eq("id", neg.seller_user_id).maybeSingle(),
        sb.from("waouh_articles").select("id, title, photos").eq("id", neg.article_id).maybeSingle(),
      ]);

      // Résolution des vrais numéros WhatsApp E.164 (LID → phone, auth → phone, …)
      const [buyerPhoneE164, sellerPhoneE164] = await Promise.all([
        resolveRealPhoneE164(sb, buyer, { article_id: neg.article_id, role: "buyer" }),
        resolveRealPhoneE164(sb, seller, { article_id: neg.article_id, role: "seller" }),
      ]);

      // Distance live entre acheteur et vendeur (via RPC PostGIS)
      let distKm: number | null = null;
      try {
        const { data: distData } = await sb.rpc("waouh_user_pair_distance_km", {
          p_user_a: neg.buyer_user_id,
          p_user_b: neg.seller_user_id,
        });
        if (typeof distData === "number") distKm = Math.round(distData * 10) / 10;
      } catch {}


      const title = article?.title || "votre annonce";

      const buildSynthese = (heading: string) =>
        `${waouhHeader(heading)}\n\n` +
        `📦 *${title}*\n` +
        `💰 *Prix final* : ${fmt(amount)}\n\n`;

      const replyToBuyer =
        buildSynthese("🎉 Le vendeur a accepté !") +
        contactExchangeText("buyer_to_seller", { display_name: seller?.display_name, phone_e164: sellerPhoneE164, phone_number: seller?.phone_number, city: seller?.city, distance_km: distKm, location: (seller as any)?.location }) +
        `\n\n🎊 *Félicitations !* Vous pouvez maintenant convenir directement de la livraison avec le vendeur.\n\n` +
        waouhFooter("WAOUH — Merci de votre confiance ✨");

      const replyToSeller =
        buildSynthese("🎉 Accord conclu — Acheteur confirmé") +
        contactExchangeText("seller_to_buyer", { display_name: buyer?.display_name, phone_e164: buyerPhoneE164, phone_number: buyer?.phone_number, city: buyer?.city, distance_km: distKm, location: (buyer as any)?.location }) +
        `\n\n🎊 *Félicitations !* Convenez librement de la livraison avec l'acheteur.\n\n` +
        waouhFooter("WAOUH — Merci de votre confiance ✨");


      const targetReply = isBuyer ? replyToSeller : replyToBuyer; // l'autre partie
      const myReply = isBuyer ? replyToBuyer : replyToSeller;

      // Photos de l'article pour les deux parties (synthèse finale enrichie)
      const articlePhotos: string[] = Array.isArray((article as any)?.photos) ? (article as any).photos.filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u)) : [];
      const replyAttachments = articlePhotos.slice(0, 4).map((url, k) => ({
        url, type: "image/jpeg",
        caption: `${title}${articlePhotos.length > 1 ? ` — photo ${k + 1}/${articlePhotos.length}` : ""}`,
      }));

      if (otherUserId) {
        await pushToOther(
          otherUserId,
          "contact_exchange",
          { neg_id: neg.id, accepted: true, price: amount, from_user_id: user.id },
          targetReply,
          { intent: "contact_exchange", negotiation_id: neg.id },
          null,
          [],
          `neg:${neg.id}:contact:${otherUserId}`,
          "contact_exchange",
          replyAttachments
        );
      }

      // Note: l'insertion côté requester est faite par waouh-channel-in via les attachments retournés.

      fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      }).catch(() => {});
      return new Response(JSON.stringify({ ok: true, reply: myReply, intent: "contact_exchange", actions: [], attachments: replyAttachments }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (intent.kind === "no") {
      await sb.from("waouh_negotiations").update({ state: "closed", last_actor: isBuyer ? "buyer" : "seller" }).eq("id", neg.id);
      if (otherUserId) {
        await pushToOther(otherUserId, "negotiation_open", { neg_id: neg.id, closed: true, from_user_id: user.id }, `❌ ${isBuyer ? "L'acheteur" : "Le vendeur"} a refusé. Négociation clôturée.`, { intent: "negotiation_closed", negotiation_id: neg.id }, null, [], `neg:${neg.id}:closed:${otherUserId}`, "negotiation_closed");
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
          { neg_id: neg.id, offer: intent.price, transaction_id: neg.transaction_id, from_user_id: user.id },
          `🤝 *Nouvelle ${isBuyer ? "offre acheteur" : "contre-offre vendeur"}*\n\n💰 *Montant proposé* : ${fmt(intent.price)}\n\nRépondez *OUI* pour accepter, *NON* pour refuser, ou proposez un autre montant ( Ex: je propose ${fmt(intent.price)} CFA).`,
          { intent: "negotiation_open", negotiation_id: neg.id, transaction_id: neg.transaction_id },
          neg.transaction_id,
          negotiationActions(neg.id),
          `neg:${neg.id}:offer:${intent.price}:${otherUserId}`,
          "negotiation_counter");
      }
      // Fire-and-forget dispatch
      fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      }).catch(() => {});
      return new Response(JSON.stringify({ ok: true, reply: `Contre-offre ${fmt(intent.price)} transmise.`, transaction_id: neg.transaction_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, reply: "Répondez « OUI » pour accepter, « NON » pour refuser, ou un montant pour contre-proposer." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-negotiation-router]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
