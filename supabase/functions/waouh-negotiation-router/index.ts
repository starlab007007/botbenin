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

function directReachablePhone(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (/@lid$/i.test(value)) return value.replace(/[^0-9@.a-z]/gi, "");
  const digits = value.replace(/@(?:c\.us|s\.whatsapp\.net)$/i, "").replace(/\D/g, "");
  if (!digits || digits.length > 13) return null;
  if (digits.startsWith("00229")) return digits.slice(2);
  if (digits.startsWith("229")) return digits;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `229${digits}`;
  return digits.length > 8 ? digits : null;
}


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
  async function pushToOther(toUserId: string, template: string, payload: any, directText: string, directMeta: any, transactionId: string | null = null, actions: Array<{id:string;label:string;url?:string}> = [], dedupeKey: string | null = null, eventType: string | null = null, attachments: Array<{url: string; type: string; caption?: string}> = [], toPhoneE164: string | null = null) {
    const { data: target } = await sb.from("waouh_users")
      .select("id, phone_number, web_session_id, auth_user_id").eq("id", toUserId).maybeSingle();
    if (!target) return;
    if (target.id === payload?.from_user_id) return;
    let insertedMsgId: string | null = null;
    if (target.id) {
      const articleIdCol = (payload as any)?.article_id ?? (directMeta as any)?.article_id ?? null;
      try {
        const { data: msg } = await sb.from("waouh_messages").insert({
          user_id: target.id,
          channel: target.web_session_id ? "web" : "system",
          direction: "out",
          text: directText,
          web_session_id: target.web_session_id ?? null,
          article_id: articleIdCol,
          attachments,
          meta: { ...(directMeta || {}), article_id: articleIdCol, transaction_id: transactionId ?? directMeta?.transaction_id ?? null, actions },
        }).select("id").maybeSingle();
        insertedMsgId = msg?.id ?? null;
      } catch (e) { console.warn("[neg-router] msg", e); }
    }
    // 🔑 Résolution centrale du vrai numéro WhatsApp (compte app + compte
    // entreprise du produit + radar IA), même pour les contre-offres et refus.
    let outboundPhone: string | null = toPhoneE164 || null;
    if (!outboundPhone) {
      try {
        const role: "buyer" | "seller" | undefined =
          payload?.target_role === "seller" || payload?.target_role === "buyer"
            ? payload.target_role
            : undefined;
        const resolved = await resolveRealPhoneE164(sb, target as any, {
          article_id: payload?.article_id ?? null,
          role,
        });
        if (resolved) outboundPhone = resolved;
      } catch (_) { /* fallback ci-dessous */ }
    }
    if (!outboundPhone) outboundPhone = directReachablePhone(target.phone_number);
    try {
      await sb.rpc("waouh_enqueue_outbound_v2", {
        p_to_phone: outboundPhone,
        p_to_user_id: target.id,
        p_template: template,
        p_payload: { ...(payload || {}), text: directText, actions, message_id: insertedMsgId, transaction_id: transactionId, attachments },
        p_web_session_id: target.web_session_id,
        p_image_url: attachments?.[0]?.url ?? null,
        p_channel: outboundPhone ? "whatsapp" : "web",
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
      // 🎉 Accord conclu : on crée un "deal" (livraison médiée).
      // ❌ AUCUN partage de contact entre acheteur et vendeur.
      // ✅ Un livreur WAOUH prend le relais ; l'équipe ops reçoit les contacts.
      const nowIso = new Date().toISOString();
      await sb.from("waouh_negotiations").update({
        state: "accepted",
        last_actor: isBuyer ? "buyer" : "seller",
        closed_at: nowIso,
      }).eq("id", neg.id);

      // Charge les deux parties + article (pour photos et titre)
      const [{ data: buyer }, { data: seller }, { data: article }] = await Promise.all([
        sb.from("waouh_users").select("id, display_name, phone_number, city, web_session_id, location").eq("id", neg.buyer_user_id).maybeSingle(),
        sb.from("waouh_users").select("id, display_name, phone_number, city, web_session_id, location").eq("id", neg.seller_user_id).maybeSingle(),
        sb.from("waouh_articles").select("id, title, photos").eq("id", neg.article_id).maybeSingle(),
      ]);

      const title = article?.title || "votre annonce";
      const articlePhotos: string[] = Array.isArray((article as any)?.photos)
        ? (article as any).photos.filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u))
        : [];
      const replyAttachments = articlePhotos.slice(0, 4).map((url, k) => ({
        url, type: "image/jpeg",
        caption: `${title}${articlePhotos.length > 1 ? ` — photo ${k + 1}/${articlePhotos.length}` : ""}`,
      }));

      // Création du deal (livraison à organiser)
      const { data: deal } = await sb.from("waouh_deals").insert({
        negotiation_id: neg.id,
        article_id: neg.article_id,
        buyer_user_id: neg.buyer_user_id,
        seller_user_id: neg.seller_user_id,
        amount,
        status: "pending_assignment",
        pickup_address: (seller as any)?.city ?? null,
        dropoff_address: (buyer as any)?.city ?? null,
      }).select("id").maybeSingle();

      // 🛑 Marquer l'article comme vendu pour bloquer toute nouvelle négociation
      // (couvre les 3 parcours : C2C, partenaire, radar IA).
      try {
        await sb.from("waouh_articles").update({ status: "sold" }).eq("id", neg.article_id);
      } catch (e) { console.warn("[neg-router] mark sold failed", e); }

      // 💼 Attribution automatique de la commission partenaire si transaction liée
      if (neg.transaction_id) {
        fetch(`${SUPABASE_URL}/functions/v1/waouh-partner-attribute-sale`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
          body: JSON.stringify({ transaction_id: neg.transaction_id }),
        }).catch((e) => console.warn("[neg-router] partner-attribute-sale failed", e));
      }

      // Wording neutre, sans aucun numéro
      const buildSynthese = (heading: string) =>
        `${waouhHeader(heading)}\n\n` +
        `📦 *${title}*\n` +
        `💰 *Prix final* : ${fmt(amount)}\n\n`;

      const replyToBuyer =
        buildSynthese("🎉 Achat confirmé !") +
        `🛵 Un *livreur WAOUH* a été assigné.\n` +
        `⏱️ Vous recevrez sous peu une notification avec le *délai estimé de livraison*.\n` +
        `💵 *Paiement à la livraison* (cash ou Mobile Money au livreur).\n\n` +
        `🔒 Le contact du vendeur n'est pas partagé : WAOUH s'occupe de tout.\n\n` +
        waouhFooter("WAOUH — Merci de votre confiance ✨");

      const replyToSeller =
        buildSynthese("🎉 Vente conclue !") +
        `🛵 Un *livreur WAOUH* vous contactera dans quelques minutes pour convenir de la collecte du colis.\n` +
        `⏱️ Préparez le colis dès maintenant.\n\n` +
        `🔒 *Confidentialité* : le contact de l'acheteur n'est pas partagé. WAOUH coordonne la livraison.\n\n` +
        waouhFooter("WAOUH — Merci de votre confiance ✨");

      const targetReply = isBuyer ? replyToSeller : replyToBuyer; // l'autre partie
      const myReply = isBuyer ? replyToBuyer : replyToSeller;

      if (otherUserId) {
        await pushToOther(
          otherUserId,
          "deal_created",
          { neg_id: neg.id, deal_id: deal?.id, article_id: neg.article_id, accepted: true, price: amount, from_user_id: user.id, target_role: isBuyer ? "seller" : "buyer" },
          targetReply,
          { intent: "deal_created", negotiation_id: neg.id, deal_id: deal?.id, article_id: neg.article_id },
          null,
          [],
          `neg:${neg.id}:deal:${otherUserId}`,
          "deal_created",
          replyAttachments,
          null
        );
      }

      // Dispatch des notifications "livraison médiée" (vendeur + acheteur + équipe ops)
      if (deal?.id) {
        fetch(`${SUPABASE_URL}/functions/v1/waouh-deal-dispatch`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
          body: JSON.stringify({ deal_id: deal.id }),
        }).catch((e) => console.warn("[neg-router] deal-dispatch failed", e));
      }

      fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      }).catch(() => {});

      return new Response(JSON.stringify({ ok: true, reply: myReply, intent: "deal_created", actions: [], attachments: replyAttachments, deal_id: deal?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (intent.kind === "no") {
      await sb.from("waouh_negotiations").update({ state: "closed", last_actor: isBuyer ? "buyer" : "seller" }).eq("id", neg.id);
      if (otherUserId) {
        await pushToOther(otherUserId, "negotiation_open", { neg_id: neg.id, article_id: neg.article_id, closed: true, from_user_id: user.id, target_role: isBuyer ? "seller" : "buyer" }, `❌ ${isBuyer ? "L'acheteur" : "Le vendeur"} a refusé. Négociation clôturée.`, { intent: "negotiation_closed", negotiation_id: neg.id, article_id: neg.article_id }, null, [], `neg:${neg.id}:closed:${otherUserId}`, "negotiation_closed");
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
          { neg_id: neg.id, article_id: neg.article_id, offer: intent.price, transaction_id: neg.transaction_id, from_user_id: user.id, target_role: isBuyer ? "seller" : "buyer" },
          `🤝 *Nouvelle ${isBuyer ? "offre acheteur" : "contre-offre vendeur"}*\n\n💰 *Montant proposé* : ${fmt(intent.price)}\n\nRépondez *OUI* pour accepter, *NON* pour refuser, ou proposez un autre montant ( Ex: je propose ${fmt(intent.price)} CFA).`,
          { intent: "negotiation_open", negotiation_id: neg.id, transaction_id: neg.transaction_id, article_id: neg.article_id },
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
