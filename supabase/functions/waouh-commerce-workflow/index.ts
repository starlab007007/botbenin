import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveSiblingUserIds } from "../_shared/waouh-identity.ts";
import { bindThreadState } from "../_shared/waouh-thread.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Action = { id: string; label: string; url?: string };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const money = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} FCFA`;

const normalizeAction = (raw: string) => raw
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/_/g, "-");

const actionParts = (raw: string) => {
  const separator = raw.indexOf(":");
  return {
    action: normalizeAction(separator < 0 ? raw : raw.slice(0, separator)),
    reference: separator < 0 ? "" : raw.slice(separator + 1).trim(),
  };
};

const paymentActions = (dealId: string): Action[] => [
  { id: `payer-mobile:${dealId}`, label: "💳 Mobile Money" },
  { id: `paiement-livraison:${dealId}`, label: "💵 À la livraison" },
  { id: `annuler:${dealId}`, label: "❌ Annuler" },
];

const sellerAvailabilityActions = (dealId: string): Action[] => [
  { id: `confirmer-disponibilite:${dealId}`, label: "✅ Article disponible" },
  { id: `annuler:${dealId}`, label: "❌ Indisponible" },
];

const sellerReadyActions = (dealId: string): Action[] => [
  { id: `preparer:${dealId}`, label: "📦 Article prêt" },
  { id: `annuler:${dealId}`, label: "❌ Annuler" },
];

const buyerDeliveryActions = (dealId: string): Action[] => [
  { id: `suivre-livraison:${dealId}`, label: "🛵 Suivre la livraison" },
  { id: `signaler-probleme:${dealId}`, label: "⚠️ Signaler un problème" },
];

const buyerReceptionActions = (dealId: string): Action[] => [
  { id: `confirmer-reception:${dealId}`, label: "✅ Confirmer la réception" },
  { id: `signaler-probleme:${dealId}`, label: "⚠️ Signaler un problème" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer !== SERVICE_ROLE) return json({ ok: false, error: "internal authorization required" }, 401);
  try {
    const body = await req.json().catch(() => ({}));
    const rawPayload = String(body.button_payload || body.action || body.text || "");
    const parsed = actionParts(rawPayload);
    const action = normalizeAction(body.commerce_action || parsed.action);
    const reference = String(body.commerce_reference || parsed.reference || "").trim();
    const requestedThreadId = String(body.thread_id || "").trim() || null;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    let user: any = null;
    if (body.user_id) {
      ({ data: user } = await sb.from("waouh_users").select("*").eq("id", body.user_id).maybeSingle());
    }
    if (!user && body.phone) {
      ({ data: user } = await sb.from("waouh_users").select("*").eq("phone_number", body.phone).maybeSingle());
    }
    if (!user) return json({ ok: false, error: "Utilisateur WAOUH introuvable" }, 404);
    const siblingIds = await resolveSiblingUserIds(sb, user);

    let transaction: any = null;
    if (reference) {
      ({ data: transaction } = await sb.from("waouh_transactions").select("*").eq("id", reference).maybeSingle());
    }

    let deal: any = null;
    if (reference) {
      ({ data: deal } = await sb.from("waouh_deals").select("*").eq("id", reference).maybeSingle());
    }
    if (!deal && body.deal_id) {
      ({ data: deal } = await sb.from("waouh_deals").select("*").eq("id", body.deal_id).maybeSingle());
    }
    if (!deal && requestedThreadId) {
      ({ data: deal } = await sb.from("waouh_deals")
        .select("*")
        .eq("thread_id", requestedThreadId)
        .not("status", "in", "(completed,cancelled)")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle());
    }
    if (!deal && transaction) {
      if (!transaction.thread_id) {
        return json({
          ok: false,
          code: "thread_required",
          error: "Cette transaction historique n'est liée à aucun Chat Meet autoritaire.",
        }, 409);
      }
      ({ data: deal } = await sb.from("waouh_deals")
        .select("*")
        .eq("thread_id", transaction.thread_id)
        .maybeSingle());
    }
    if (!deal) return json({ ok: false, error: "Aucun parcours commercial actif" }, 404);
    if (requestedThreadId && deal.thread_id && deal.thread_id !== requestedThreadId) {
      return json({ ok: false, error: "Ce paiement appartient à une autre discussion" }, 409);
    }
    const threadId: string | null = deal.thread_id || requestedThreadId;
    if (!threadId) {
      return json({ ok: false, code: "thread_required", error: "Ouvrez le Chat Meet lié à cet achat." }, 409);
    }
    const { data: thread } = await sb.from("waouh_chat_threads")
      .select("id,article_id,buyer_user_id,seller_user_id,status")
      .eq("id", threadId)
      .eq("thread_type", "product_meet")
      .maybeSingle();
    if (!thread || thread.article_id !== deal.article_id ||
        thread.buyer_user_id !== deal.buyer_user_id ||
        thread.seller_user_id !== deal.seller_user_id) {
      return json({ ok: false, error: "Ce deal appartient à une autre discussion ou à un autre produit" }, 409);
    }
    if (!deal.thread_id) {
      await sb.from("waouh_deals").update({ thread_id: threadId }).eq("id", deal.id);
      deal.thread_id = threadId;
    }

    const role = siblingIds.includes(deal.buyer_user_id)
      ? "buyer"
      : siblingIds.includes(deal.seller_user_id)
        ? "seller"
        : null;
    if (!role) return json({ ok: false, error: "Action non autorisée pour ce parcours" }, 403);

    if (!transaction) {
      let transactionQuery: any = sb.from("waouh_transactions")
        .select("*")
        .eq("article_id", deal.article_id)
        .eq("buyer_id", deal.buyer_user_id)
        .eq("seller_id", deal.seller_user_id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (threadId) transactionQuery = transactionQuery.eq("thread_id", threadId);
      const { data } = await transactionQuery.maybeSingle();
      transaction = data;
    }

    const { data: article } = await sb.from("waouh_articles")
      .select("id,title,description,category,condition,price,currency,photos,city,market_price_min,market_price_max,status")
      .eq("id", deal.article_id)
      .maybeSingle();
    const photos = Array.isArray(article?.photos)
      ? article.photos.filter((url: unknown) => typeof url === "string" && /^https?:\/\//i.test(url as string))
      : [];

    async function ensureTransaction(method: string) {
      if (transaction) {
        const { data } = await sb.from("waouh_transactions").update({
          payment_method: method,
          status: "payment_pending",
        }).eq("id", transaction.id).select().single();
        transaction = data;
        return;
      }
      const amount = Number(deal.amount || article?.price || 0);
      const { data, error } = await sb.from("waouh_transactions").insert({
        thread_id: threadId,
        article_id: deal.article_id,
        seller_id: deal.seller_user_id,
        buyer_id: deal.buyer_user_id,
        amount,
        currency: article?.currency || "XOF",
        commission: Math.round(amount * 0.03),
        payment_method: method,
        escrow_status: "pending",
        negotiated_price: amount,
        status: "payment_pending",
      }).select().single();
      if (error) throw error;
      transaction = data;
    }

    const product = (workflowState: string, productRole: "buyer" | "seller", actions: Action[]) => ({
      id: article?.id || deal.article_id,
      article_id: article?.id || deal.article_id,
      title: article?.title || "Article WAOUH",
      description: article?.description,
      category: article?.category,
      condition: article?.condition,
      price: Number(deal.amount || article?.price || 0),
      currency: article?.currency || "XOF",
      photos,
      city: article?.city,
      market_price_min: article?.market_price_min,
      market_price_max: article?.market_price_max,
      availability: article?.status === "sold" ? "Vendu" : "Disponible",
      workflow_state: workflowState,
      role: productRole,
      deal_id: deal.id,
      transaction_id: transaction?.id || null,
      actions,
    });

    async function notifyOther(text: string, workflowState: string, actions: Action[]) {
      const targetId = role === "buyer" ? deal.seller_user_id : deal.buyer_user_id;
      const targetRole: "buyer" | "seller" = role === "buyer" ? "seller" : "buyer";
      const { data: target } = await sb.from("waouh_users")
        .select("id,web_session_id,phone_number")
        .eq("id", targetId)
        .maybeSingle();
      if (!target) return;
      const { data: conversation } = await sb.from("waouh_conversations")
        .select("id")
        .eq("user_id", target.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const targetProduct = product(workflowState, targetRole, actions);
      const { data: mirroredMessage } = await sb.from("waouh_messages").insert({
        thread_id: threadId,
        conversation_id: conversation?.id || null,
        user_id: target.id,
        channel: target.web_session_id ? "web" : "app",
        direction: "out",
        text,
        web_session_id: target.web_session_id || null,
        phone_number: target.phone_number || null,
        article_id: deal.article_id,
        attachments: photos.slice(0, 6).map((url: string, index: number) => ({
          url,
          type: "image/jpeg",
          caption: `${article?.title || "Article"} — photo ${index + 1}/${photos.length}`,
        })),
        meta: {
          intent: workflowState,
          workflow_state: workflowState,
          role: targetRole,
          article_id: deal.article_id,
          thread_id: threadId,
          buyer_user_id: deal.buyer_user_id,
          seller_user_id: deal.seller_user_id,
          counterpart_user_id: targetRole === "seller" ? deal.buyer_user_id : deal.seller_user_id,
          deal_id: deal.id,
          transaction_id: transaction?.id || null,
          actions,
          products: [targetProduct],
        },
      }).select("id").maybeSingle();
      await sb.from("waouh_notifications").insert({
        thread_id: threadId,
        user_id: target.id,
        web_session_id: target.web_session_id || null,
        article_id: deal.article_id,
        notification_type: workflowState,
        photos,
        dedupe_key: `meet:${threadId || deal.id}:${workflowState}:${target.id}:${mirroredMessage?.id || crypto.randomUUID()}`,
        payload: {
          thread_id: threadId,
          article_id: deal.article_id,
          buyer_user_id: deal.buyer_user_id,
          seller_user_id: deal.seller_user_id,
          counterpart_user_id: targetRole === "seller" ? deal.buyer_user_id : deal.seller_user_id,
          role: targetRole,
          deal_id: deal.id,
          transaction_id: transaction?.id || null,
          text,
          actions,
          products: [targetProduct],
          photos,
        },
        channel: "waouh_app",
        delivery_status: "delivered",
        delivered_at: new Date().toISOString(),
      });
    }

    let reply = "Action enregistrée.";
    let workflowState = String(deal.status || "awaiting_payment");
    let actions: Action[] = [];

    if (["payer-mobile", "mtn", "moov", "sbin"].includes(action)) {
      if (role !== "buyer") return json({ ok: false, error: "Seul l'acheteur peut lancer le paiement" }, 403);
      const operator = ["mtn", "moov", "sbin"].includes(action) ? action : "mobile_money";
      await ensureTransaction(operator);
      workflowState = "payment_pending";
      await sb.from("waouh_deals").update({ status: workflowState }).eq("id", deal.id);
      actions = [
        { id: `paiement-effectue:${transaction.id}`, label: "✅ J'ai validé le paiement" },
        { id: `paiement-livraison:${deal.id}`, label: "💵 Payer à la livraison" },
        { id: `annuler:${deal.id}`, label: "❌ Annuler" },
      ];
      reply = `💳 Paiement Mobile Money de ${money(Number(transaction.amount))} préparé. Validez uniquement la demande officielle reçue sur votre téléphone.`;
      await notifyOther("⏳ L'acheteur a lancé le paiement Mobile Money. Attendez la confirmation sécurisée WAOUH.", workflowState, []);
    } else if (action === "paiement-effectue") {
      if (role !== "buyer") return json({ ok: false, error: "Action réservée à l'acheteur" }, 403);
      workflowState = "payment_review";
      await sb.from("waouh_deals").update({ status: workflowState }).eq("id", deal.id);
      actions = [
        { id: `suivre-livraison:${deal.id}`, label: "🛵 Suivre le statut" },
        { id: `signaler-probleme:${deal.id}`, label: "⚠️ Signaler un problème" },
      ];
      reply = "🔐 Paiement soumis pour vérification. WAOUH ne le déclarera payé qu'après confirmation du fournisseur.";
      await notifyOther("🔐 Paiement soumis pour vérification. Ne remettez pas l'article avant confirmation WAOUH.", workflowState, []);
    } else if (action === "paiement-livraison") {
      if (role !== "buyer") return json({ ok: false, error: "Action réservée à l'acheteur" }, 403);
      await ensureTransaction("cash_on_delivery");
      workflowState = "cod_confirmed";
      await sb.from("waouh_deals").update({ status: workflowState }).eq("id", deal.id);
      actions = buyerDeliveryActions(deal.id);
      reply = `💵 Paiement à la livraison confirmé pour ${money(Number(transaction.amount))}.`;
      await notifyOther("📦 L'acheteur a choisi le paiement à la livraison. Préparez l'article.", workflowState, sellerReadyActions(deal.id));
    } else if (action === "confirmer-disponibilite") {
      if (role !== "seller") return json({ ok: false, error: "Action réservée au vendeur" }, 403);
      workflowState = "seller_confirmed";
      await sb.from("waouh_deals").update({ status: workflowState }).eq("id", deal.id);
      actions = sellerReadyActions(deal.id);
      reply = "✅ Disponibilité confirmée. WAOUH attend maintenant le choix de paiement de l'acheteur.";
      await notifyOther("✅ Le vendeur confirme que l'article est disponible. Choisissez votre mode de paiement.", "awaiting_payment", paymentActions(deal.id));
    } else if (action === "preparer") {
      if (role !== "seller") return json({ ok: false, error: "Action réservée au vendeur" }, 403);
      if (!["seller_confirmed", "cod_confirmed", "paid"].includes(String(deal.status))) {
        return json({ ok: false, error: "L'article ne peut pas encore être préparé à cette étape" }, 409);
      }
      workflowState = "ready_for_pickup";
      await sb.from("waouh_deals").update({ status: workflowState }).eq("id", deal.id);
      actions = [];
      reply = "📦 Article marqué prêt pour la prise en charge WAOUH.";
      await notifyOther("📦 Le vendeur a préparé l'article. La prise en charge est en cours.", workflowState, buyerDeliveryActions(deal.id));
    } else if (action === "suivre-livraison") {
      workflowState = String(deal.status || "pending_assignment");
      actions = workflowState === "delivered" ? buyerReceptionActions(deal.id) : buyerDeliveryActions(deal.id);
      reply = `🛵 Statut actuel : ${workflowState.replaceAll("_", " ")}.`;
    } else if (action === "confirmer-reception") {
      if (role !== "buyer") return json({ ok: false, error: "Action réservée à l'acheteur" }, 403);
      if (String(deal.status) !== "delivered") {
        return json({ ok: false, error: "La livraison n'est pas encore confirmable" }, 409);
      }
      workflowState = "completed";
      await sb.from("waouh_deals").update({ status: workflowState, delivered_at: deal.delivered_at || new Date().toISOString() }).eq("id", deal.id);
      if (transaction) {
        await sb.from("waouh_transactions").update({
          buyer_confirmed: true,
          status: "completed",
          escrow_status: "released",
          completed_at: new Date().toISOString(),
        }).eq("id", transaction.id);
      }
      await sb.from("waouh_articles").update({ status: "sold" }).eq("id", deal.article_id);
      actions = [];
      reply = "🎉 Réception confirmée. Achat finalisé avec succès.";
      await notifyOther("🎉 L'acheteur a confirmé la réception. Vente finalisée.", workflowState, []);
    } else if (action === "signaler-probleme") {
      workflowState = "disputed";
      await sb.from("waouh_deals").update({ status: workflowState }).eq("id", deal.id);
      if (transaction) await sb.from("waouh_transactions").update({ status: "disputed" }).eq("id", transaction.id);
      actions = [];
      reply = "⚠️ Incident enregistré. L'équipe WAOUH va examiner le paiement et la livraison.";
      await notifyOther("⚠️ Un incident a été signalé sur ce parcours. WAOUH effectue les vérifications.", workflowState, []);
    } else if (action === "annuler") {
      if (["completed", "delivered"].includes(String(deal.status))) {
        return json({ ok: false, error: "Ce parcours ne peut plus être annulé" }, 409);
      }
      workflowState = "cancelled";
      await sb.from("waouh_deals").update({ status: workflowState, cancelled_at: new Date().toISOString() }).eq("id", deal.id);
      if (transaction) {
        await sb.from("waouh_transactions").update({
          status: "cancelled",
          escrow_status: transaction.escrow_status === "held" ? "refunded" : transaction.escrow_status,
        }).eq("id", transaction.id);
      }
      actions = [];
      reply = "❌ Parcours annulé. L'autre partie a été notifiée.";
      await notifyOther("❌ Le parcours commercial a été annulé.", workflowState, []);
    } else if (action === "payment-verified" && body.provider_verified === true && body.payment_ref) {
      if (!transaction) return json({ ok: false, error: "Transaction introuvable" }, 404);
      workflowState = "paid";
      await sb.from("waouh_transactions").update({
        status: "paid",
        escrow_status: "held",
        payment_ref: String(body.payment_ref),
      }).eq("id", transaction.id);
      await sb.from("waouh_deals").update({ status: workflowState }).eq("id", deal.id);
      actions = buyerDeliveryActions(deal.id);
      reply = "✅ Paiement confirmé et sécurisé par WAOUH.";
      await notifyOther("✅ Paiement confirmé. Vous pouvez préparer l'article.", workflowState, sellerReadyActions(deal.id));
    } else {
      return json({ ok: false, error: `Action commerciale non reconnue : ${action}` }, 400);
    }

    const currentProduct = product(workflowState, role, actions);
    await bindThreadState(sb, threadId, {
      status: workflowState,
      deal_id: deal.id,
      transaction_id: transaction?.id || null,
    });
    return json({
      ok: true,
      reply,
      intent: workflowState,
      workflow_state: workflowState,
      role,
      article_id: deal.article_id,
      deal_id: deal.id,
      transaction_id: transaction?.id || null,
      thread_id: threadId,
      actions,
      products: [currentProduct],
      attachments: photos.slice(0, 6).map((url: string, index: number) => ({
        url,
        type: "image/jpeg",
        caption: `${article?.title || "Article"} — photo ${index + 1}/${photos.length}`,
      })),
    });
  } catch (error) {
    console.error("[waouh-commerce-workflow]", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});
