// WAOUH Negotiation Router — pilote l'échange acheteur↔vendeur après un match,
// puis ouvre le workflow paiement/livraison sans partager les coordonnées.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { contactExchangeText, waouhHeader, waouhFooter, waouhSep, distanceKm, formatDistance, resolveRealPhoneE164 } from "../_shared/waouh-format.ts";
import { resolveSiblingUserIds, siblingOrFilter } from "../_shared/waouh-identity.ts";
import { geminiJson } from "../_shared/gemini.ts";
import { bindThreadState } from "../_shared/waouh-thread.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const negotiationActions = (negId: string) => [
  { id: `accepter:${negId}`, label: "✅ Accepter" },
  { id: `contre-proposition:${negId}`, label: "💬 Contre-proposer" },
  { id: `refuser:${negId}`, label: "❌ Refuser" },
];
const buyerPaymentActions = (dealId: string) => [
  { id: `payer-mobile:${dealId}`, label: "💳 Mobile Money" },
  { id: `paiement-livraison:${dealId}`, label: "💵 À la livraison" },
  { id: `annuler:${dealId}`, label: "❌ Annuler" },
];
const sellerAvailabilityActions = (dealId: string) => [
  { id: `confirmer-disponibilite:${dealId}`, label: "✅ Article disponible" },
  { id: `annuler:${dealId}`, label: "❌ Indisponible" },
];

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
  if (/^(?:non|no|refuse|refus[eé]|refuser)(?::|\b)/i.test(lower)) {
    return { kind: "no" };
  }
  if (/^(?:oui|ok|d'?accord|j'accepte|accept|accept[eé]|accepter|yes)(?::|\b)/i.test(lower) && !/propos/.test(lower)) {
    return { kind: "yes" };
  }
  const m = lower.match(/(?:proposer|propose|contre-proposition|contre proposition|counter)\s*[:=]?\s*(\d{3,9})/i)
        || lower.match(/(\d{2,3}(?:[\s.,]?\d{3})+|\d{3,9})\s*(?:f|fcfa|cfa)/i)
        || lower.match(/(?:propose|offre|prix|à|a)\s*(\d{3,9})/i);
  if (m) return { kind: "price", price: parseInt(m[1].replace(/\D/g, ""), 10) };
  try {
    return await geminiJson(
      'Classifie une réponse de négociation FR/local. JSON: {"kind":"yes"|"no"|"price"|"other","price":number?}.',
      text,
      { kind: "other" as const },
    ) as { kind: "yes"|"no"|"price"|"other"; price?: number };
  } catch {
    return { kind: "other" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer !== SERVICE_ROLE) {
    return new Response(JSON.stringify({ ok: false, error: "internal authorization required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
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
      // Canal aligné sur pushSyncedEvent : web > app > system, pour que les
      // utilisateurs App (B/C) sans session web voient bien le message dans
      // WaouhMatchChatWindow.
      const msgChannel = target.web_session_id
        ? "web"
        : (target.auth_user_id ? "app" : "system");
      try {
        const { data: msg } = await sb.from("waouh_messages").insert({
          thread_id: (payload as any)?.thread_id ?? (directMeta as any)?.thread_id ?? null,
          user_id: target.id,
          channel: msgChannel,
          direction: "out",
          text: directText,
          web_session_id: target.web_session_id ?? null,
          article_id: articleIdCol,
          attachments,
          meta: {
            ...(directMeta || {}),
            article_id: articleIdCol,
            thread_id: (payload as any)?.thread_id ?? (directMeta as any)?.thread_id ?? null,
            counterpart_user_id: (payload as any)?.from_user_id ?? (directMeta as any)?.counterpart_user_id ?? null,
            buyer_user_id: (payload as any)?.buyer_user_id ?? (directMeta as any)?.buyer_user_id ?? null,
            seller_user_id: (payload as any)?.seller_user_id ?? (directMeta as any)?.seller_user_id ?? null,
            transaction_id: transactionId ?? directMeta?.transaction_id ?? null,
            actions,
          },
        }).select("id").maybeSingle();
        insertedMsgId = msg?.id ?? null;
      } catch (e) { console.warn("[neg-router] msg", e); }
    }
    try {
      const notificationThreadId = (payload as any)?.thread_id ?? (directMeta as any)?.thread_id ?? null;
      await sb.from("waouh_notifications").insert({
        thread_id: notificationThreadId,
        user_id: target.id,
        web_session_id: target.web_session_id ?? null,
        article_id: (payload as any)?.article_id ?? (directMeta as any)?.article_id ?? null,
        notification_type: template,
        photos: attachments.map((item) => item.url).filter(Boolean),
        dedupe_key: dedupeKey || `meet:${notificationThreadId || "legacy"}:${template}:${target.id}:${insertedMsgId || crypto.randomUUID()}`,
        payload: {
          ...(payload || {}),
          ...(directMeta || {}),
          thread_id: notificationThreadId,
          text: directText,
          actions,
          message_id: insertedMsgId,
        },
        channel: "waouh_app",
        delivery_status: "delivered",
        delivered_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[neg-router] notification", e);
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
    const { phone, text, user_id, thread_id, negotiation_id } = await req.json();

    let user: any = null;
    if (user_id) ({ data: user } = await sb.from("waouh_users").select("*").eq("id", user_id).maybeSingle());
    if (!user && phone) ({ data: user } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle());
    if (!user) return new Response(JSON.stringify({ ok: false, reason: "user not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 🔑 Multi-identités : on cherche la négo via tous les waouh_users qui
    // appartiennent à la même personne (App + WA, LID + phone, doublons).
    const siblingIds = await resolveSiblingUserIds(sb, user);

    let neg: any = null;
    if (negotiation_id) {
      const { data } = await sb.from("waouh_negotiations")
        .select("*")
        .eq("id", negotiation_id)
        .or(siblingOrFilter(siblingIds))
        .in("state", ["proposed", "countered"])
        .maybeSingle();
      neg = data;
    }
    if (!neg && thread_id) {
      const { data } = await sb.from("waouh_negotiations")
        .select("*")
        .eq("thread_id", thread_id)
        .or(siblingOrFilter(siblingIds))
        .in("state", ["proposed", "countered"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      neg = data;
    }
    if (!neg && !thread_id && !negotiation_id) {
      return new Response(JSON.stringify({
        ok: false,
        code: "thread_required",
        reply: "Ouvrez le Chat Meet du produit concerné avant de répondre à cette négociation.",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!neg) {
      return new Response(JSON.stringify({ ok: true, reply: "🤔 Aucune négociation ouverte. Cherchez un produit puis dites *intéressé 1*." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const intent = await aiIntent(text || "");
    const activeThreadId: string | null = neg.thread_id ?? thread_id ?? null;
    if (thread_id && neg.thread_id && neg.thread_id !== thread_id) {
      return new Response(JSON.stringify({ ok: false, reason: "negotiation/thread mismatch" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!activeThreadId) {
      return new Response(JSON.stringify({
        ok: false,
        code: "thread_required",
        reply: "Cette négociation n'est liée à aucun Chat Meet autoritaire.",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: activeThread } = await sb.from("waouh_chat_threads")
      .select("id,article_id,buyer_user_id,seller_user_id")
      .eq("id", activeThreadId)
      .eq("thread_type", "product_meet")
      .maybeSingle();
    if (!activeThread || activeThread.article_id !== neg.article_id ||
        activeThread.buyer_user_id !== neg.buyer_user_id ||
        activeThread.seller_user_id !== neg.seller_user_id) {
      return new Response(JSON.stringify({ ok: false, reason: "negotiation/thread participants mismatch" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (activeThreadId && !neg.thread_id) {
      await sb.from("waouh_negotiations").update({ thread_id: activeThreadId }).eq("id", neg.id);
    }
    const isBuyer = siblingIds.includes(neg.buyer_user_id);
    const otherUserId = isBuyer ? neg.seller_user_id : neg.buyer_user_id;
    const amount = Number(neg.last_offer_price || 0);
    const { data: articleContext } = await sb.from("waouh_articles")
      .select("id,title,description,category,condition,price,currency,photos,city,market_price_min,market_price_max,status")
      .eq("id", neg.article_id).maybeSingle();
    const contextPhotos: string[] = Array.isArray(articleContext?.photos)
      ? articleContext.photos.filter((url: unknown) => typeof url === "string" && /^https?:\/\//i.test(url as string))
      : [];
    const contextAttachments = contextPhotos.slice(0, 6).map((url: string, index: number) => ({
      url,
      type: "image/jpeg",
      caption: `${articleContext?.title || "Article"} — photo ${index + 1}/${contextPhotos.length}`,
    }));
    const stateProduct = (workflowState: string, productRole: "buyer" | "seller", actions: any[] = [], price = amount) => ({
      id: neg.article_id,
      article_id: neg.article_id,
      title: articleContext?.title || "Article WAOUH",
      description: articleContext?.description,
      category: articleContext?.category,
      condition: articleContext?.condition,
      price: Number(price || articleContext?.price || 0),
      currency: articleContext?.currency || "XOF",
      photos: contextPhotos,
      city: articleContext?.city,
      market_price_min: articleContext?.market_price_min,
      market_price_max: articleContext?.market_price_max,
      availability: articleContext?.status === "sold" ? "Vendu" : "Disponible",
      workflow_state: workflowState,
      role: productRole,
      thread_id: activeThreadId,
      buyer_user_id: neg.buyer_user_id,
      seller_user_id: neg.seller_user_id,
      negotiation_id: neg.id,
      actions,
    });

    if (intent.kind === "yes") {
      // 🎉 Accord conclu : on crée un "deal" (livraison médiée).
      // ❌ AUCUN partage de contact entre acheteur et vendeur.
      // ✅ Un livreur WAOUH prend le relais ; l'équipe ops reçoit les contacts.

      // 🛡️ Idempotence : si un deal existe déjà pour cette négociation, on court-circuite
      // (cas typique : les deux parties confirment « oui » successivement).
      const { data: existingDeal } = await sb
        .from("waouh_deals")
        .select("*")
        .eq("negotiation_id", neg.id)
        .neq("status", "cancelled")
        .maybeSingle();

      if (existingDeal?.id || neg.state === "accepted" || neg.state === "closed") {
        const existingActions = existingDeal?.id
          ? (isBuyer ? buyerPaymentActions(existingDeal.id) : sellerAvailabilityActions(existingDeal.id))
          : [];
        const { data: existingArticle } = await sb.from("waouh_articles")
          .select("id,title,description,category,condition,price,currency,photos,city,market_price_min,market_price_max,status")
          .eq("id", neg.article_id).maybeSingle();
        const { data: existingTransaction } = existingDeal?.id
          ? await sb.from("waouh_transactions")
              .select("id,status")
              .eq("article_id", neg.article_id)
              .eq("buyer_id", neg.buyer_user_id)
              .eq("seller_id", neg.seller_user_id)
              .eq("thread_id", activeThreadId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null };
        const existingPhotos = Array.isArray(existingArticle?.photos)
          ? existingArticle.photos.filter((url: unknown) => typeof url === "string" && /^https?:\/\//i.test(url as string))
          : [];
        const existingRole = isBuyer ? "buyer" : "seller";
        const existingProduct = {
          id: neg.article_id,
          article_id: neg.article_id,
          title: existingArticle?.title || "Article WAOUH",
          description: existingArticle?.description,
          category: existingArticle?.category,
          condition: existingArticle?.condition,
          price: Number(existingDeal?.amount || existingArticle?.price || neg.last_offer_price || 0),
          currency: existingArticle?.currency || "XOF",
          photos: existingPhotos,
          city: existingArticle?.city,
          market_price_min: existingArticle?.market_price_min,
          market_price_max: existingArticle?.market_price_max,
          availability: existingArticle?.status === "sold" ? "Vendu" : "Réservé",
          workflow_state: existingDeal?.status || "awaiting_payment",
          role: existingRole,
          deal_id: existingDeal?.id ?? null,
          transaction_id: existingTransaction?.id ?? null,
          actions: existingActions,
        };
        console.log("[neg-router] yes ignoré (déjà accepté)", { neg_id: neg.id, deal_id: existingDeal?.id, state: neg.state });
        return new Response(JSON.stringify({
          ok: true,
          reply: isBuyer
            ? "✅ Accord déjà enregistré. Choisissez votre mode de paiement."
            : "✅ Accord déjà enregistré. Confirmez la disponibilité de l'article.",
          intent: "deal_already_accepted",
          workflow_state: existingDeal?.status || "awaiting_payment",
          role: existingRole,
          deal_id: existingDeal?.id ?? null,
          transaction_id: existingTransaction?.id ?? null,
          actions: existingActions,
          products: [existingProduct],
          attachments: existingPhotos.slice(0, 4).map((url: string, index: number) => ({
            url,
            type: "image/jpeg",
            caption: `${existingProduct.title} — photo ${index + 1}/${existingPhotos.length}`,
          })),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

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

      // Création du deal — protégée par UNIQUE INDEX waouh_deals_unique_per_negotiation.
      // Si une course parallèle a déjà inséré un deal, l'INSERT échoue (23505)
      // et on court-circuite proprement sans renvoyer d'event en double.
      const { data: deal, error: dealErr } = await sb.from("waouh_deals").insert({
        thread_id: activeThreadId,
        negotiation_id: neg.id,
        article_id: neg.article_id,
        buyer_user_id: neg.buyer_user_id,
        seller_user_id: neg.seller_user_id,
        amount,
        status: "awaiting_payment",
        pickup_address: (seller as any)?.city ?? null,
        dropoff_address: (buyer as any)?.city ?? null,
      }).select("id").maybeSingle();

      if (dealErr && (dealErr as any).code === "23505") {
        console.log("[neg-router] deal déjà créé en parallèle, court-circuit", { neg_id: neg.id });
        return new Response(JSON.stringify({
          ok: true,
          reply: "✅ Accord déjà enregistré. Un livreur WAOUH est en route.",
          intent: "deal_already_accepted",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Réserver l'article pendant le paiement. Il ne devient vendu qu'après
      // livraison confirmée par l'acheteur.
      try {
        await sb.from("waouh_articles").update({ status: "reserved" }).eq("id", neg.article_id);
      } catch (e) { console.warn("[neg-router] mark sold failed", e); }

      // 💼 Attribution automatique de la commission partenaire si transaction liée
      if (neg.transaction_id) {
        fetch(`${SUPABASE_URL}/functions/v1/waouh-partner-attribute-sale`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
          body: JSON.stringify({ transaction_id: neg.transaction_id }),
        }).catch((e) => console.warn("[neg-router] partner-attribute-sale failed", e));
      }

      let transaction: any = null;
      if (deal?.id) {
        const { data, error } = await sb.from("waouh_transactions").insert({
          thread_id: activeThreadId,
          article_id: neg.article_id,
          seller_id: neg.seller_user_id,
          buyer_id: neg.buyer_user_id,
          amount,
          currency: "XOF",
          commission: Math.round(amount * 0.03),
          payment_method: "pending",
          escrow_status: "pending",
          negotiated_price: amount,
          status: "initiated",
        }).select().maybeSingle();
        if (!error) transaction = data;
      }

      const product = {
        id: neg.article_id,
        article_id: neg.article_id,
        title,
        price: amount,
        photos: articlePhotos,
        availability: "Réservé",
        workflow_state: "awaiting_payment",
        deal_id: deal?.id ?? null,
        transaction_id: transaction?.id ?? null,
      };
      const myRole: "buyer" | "seller" = isBuyer ? "buyer" : "seller";
      const myActions = deal?.id
        ? (isBuyer ? buyerPaymentActions(deal.id) : sellerAvailabilityActions(deal.id))
        : [];
      const myReply = isBuyer
        ? `🎉 Accord conclu à ${fmt(amount)}. Choisissez votre mode de paiement.`
        : `🎉 Accord conclu à ${fmt(amount)}. Confirmez que l'article est disponible.`;

      if (otherUserId && deal?.id) {
        const otherIsBuyer = otherUserId === neg.buyer_user_id;
        const otherRole: "buyer" | "seller" = otherIsBuyer ? "buyer" : "seller";
        const otherActions = otherIsBuyer
          ? buyerPaymentActions(deal.id)
          : sellerAvailabilityActions(deal.id);
        const otherText = otherIsBuyer
          ? `🎉 Accord conclu à ${fmt(amount)}. Choisissez votre mode de paiement.`
          : `🎉 Accord conclu à ${fmt(amount)}. Confirmez que l'article est disponible.`;
        await pushToOther(
          otherUserId,
          "deal_accepted",
          { article_id: neg.article_id, thread_id: activeThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id, from_user_id: user.id, target_role: otherRole },
          otherText,
          {
            intent: "deal_accepted",
            workflow_state: "awaiting_payment",
            role: otherRole,
            article_id: neg.article_id,
            deal_id: deal.id,
            transaction_id: transaction?.id ?? null,
            thread_id: activeThreadId,
            buyer_user_id: neg.buyer_user_id,
            seller_user_id: neg.seller_user_id,
            products: [{ ...product, role: otherRole, actions: otherActions }],
          },
          transaction?.id ?? null,
          otherActions,
          `deal:${deal.id}:accepted:${otherUserId}`,
          "deal_accepted",
          replyAttachments,
        );
      }

      await bindThreadState(sb, activeThreadId, {
        status: "awaiting_payment",
        negotiation_id: neg.id,
        deal_id: deal?.id ?? null,
        transaction_id: transaction?.id ?? null,
      });

      fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      }).catch(() => {});

      return new Response(JSON.stringify({
        ok: true,
        reply: myReply,
        intent: "deal_created",
        workflow_state: "awaiting_payment",
        role: myRole,
        actions: myActions,
        attachments: replyAttachments,
        products: [{ ...product, role: myRole, actions: myActions }],
        article_id: neg.article_id,
        transaction_id: transaction?.id ?? null,
        deal_id: deal?.id ?? null,
        thread_id: activeThreadId,
        suppress_direct_reply: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (intent.kind === "no") {
      await sb.from("waouh_negotiations").update({ state: "closed", last_actor: isBuyer ? "buyer" : "seller" }).eq("id", neg.id);
      if (otherUserId) {
        const otherRole = isBuyer ? "seller" : "buyer";
        await pushToOther(otherUserId, "negotiation_open", { neg_id: neg.id, article_id: neg.article_id, thread_id: activeThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id, closed: true, from_user_id: user.id, target_role: otherRole }, `❌ ${isBuyer ? "L'acheteur" : "Le vendeur"} a refusé. Négociation clôturée.`, { intent: "negotiation_closed", negotiation_id: neg.id, article_id: neg.article_id, thread_id: activeThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id, products: [stateProduct("cancelled", otherRole)] }, null, [], `neg:${neg.id}:closed:${otherUserId}`, "negotiation_closed", contextAttachments);
      }
      await bindThreadState(sb, activeThreadId, { status: "cancelled", negotiation_id: neg.id });
      return new Response(JSON.stringify({ ok: true, reply: "OK, négociation fermée. Merci !", thread_id: activeThreadId, article_id: neg.article_id, products: [stateProduct("cancelled", isBuyer ? "buyer" : "seller")], attachments: contextAttachments }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
          { neg_id: neg.id, article_id: neg.article_id, thread_id: activeThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id, offer: intent.price, transaction_id: neg.transaction_id, from_user_id: user.id, target_role: isBuyer ? "seller" : "buyer" },
          `🤝 *Nouvelle ${isBuyer ? "offre acheteur" : "contre-offre vendeur"}*\n\n💰 *Montant proposé* : ${fmt(intent.price)}\n\nRépondez *OUI* pour accepter, *NON* pour refuser, ou proposez un autre montant ( Ex: je propose ${fmt(intent.price)} CFA).`,
          { intent: "negotiation_open", negotiation_id: neg.id, transaction_id: neg.transaction_id, article_id: neg.article_id, thread_id: activeThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id, products: [stateProduct("negotiating", isBuyer ? "seller" : "buyer", negotiationActions(neg.id), intent.price)] },
          neg.transaction_id,
          negotiationActions(neg.id),
          `neg:${neg.id}:offer:${intent.price}:${otherUserId}`,
          "negotiation_counter",
          contextAttachments);
      }
      // Fire-and-forget dispatch
      fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      }).catch(() => {});
      await bindThreadState(sb, activeThreadId, { status: "negotiating", negotiation_id: neg.id, transaction_id: neg.transaction_id });
      return new Response(JSON.stringify({ ok: true, reply: `Contre-offre ${fmt(intent.price)} transmise.`, thread_id: activeThreadId, article_id: neg.article_id, transaction_id: neg.transaction_id, actions: negotiationActions(neg.id), products: [stateProduct("negotiating", isBuyer ? "buyer" : "seller", negotiationActions(neg.id), intent.price)], attachments: contextAttachments }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      reply: "Choisissez Accepter, Refuser, ou saisissez un montant pour contre-proposer.",
      intent: "negotiation_decision",
      actions: negotiationActions(neg.id),
      thread_id: activeThreadId,
      article_id: neg.article_id,
      products: [stateProduct("negotiating", isBuyer ? "buyer" : "seller", negotiationActions(neg.id))],
      attachments: contextAttachments,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-negotiation-router]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
