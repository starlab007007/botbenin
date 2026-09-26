// waouh-deal-ops
// Single router for WAOUH deal operations.
// Deal Graph lifecycle: seller confirmation + payment preference -> delivery -> payment -> settlement.
//   action: "seller_confirm" | "payment_preference" | "cancel" | "assign" | "status" | "update_eta" | "payment"
// Consolidated from waouh-deal-{assign,status,update-eta,payment} to fit edge-function quota.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getWaouhModuleControl } from "../_shared/waouh-admin-control.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-waouh-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";
const WAOUH_OPS_WHATSAPP = Deno.env.get("WAOUH_OPS_WHATSAPP") || "";
const COMMISSION_RATE = Math.max(
  0,
  Math.min(1, Number(Deno.env.get("WAOUH_COMMISSION_RATE") || "0.05") || 0.05),
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const hhmm = (d = new Date()) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

async function sendWhatsApp(chatId: string, text: string) {
  if (!WAHA_BASE_URL) return { ok: false, skipped: "WAHA_BASE_URL missing" };
  try {
    const base = WAHA_BASE_URL.replace(/\/$/, "");
    await fetch(`${base}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
      },
      body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function insertInAppNotif(
  sb: any,
  userId: string,
  articleId: string | null,
  kind: string,
  text: string,
  payload: any,
) {
  if (!userId) return;
  let webSession: string | null = null;
  try {
    const { data: u } = await sb.from("waouh_users").select("web_session_id").eq("id", userId).maybeSingle();
    webSession = u?.web_session_id ?? null;
  } catch {}
  await sb.from("waouh_notifications").insert({
    user_id: userId,
    article_id: articleId,
    notification_type: kind,
    photos: [],
    web_session_id: webSession,
    dedupe_key: `${kind}:${payload?.deal_id || articleId || userId}:${userId}:${Date.now()}`,
    payload: { ...payload, text },
    channel: "waouh_app",
    delivery_status: "delivered",
    delivered_at: new Date().toISOString(),
  });
}

async function pushDealChatEvent(
  sb: any,
  waouhUserId: string,
  articleId: string | null,
  text: string,
  meta: Record<string, any>,
) {
  if (!waouhUserId) return;
  const { data: wu } = await sb
    .from("waouh_users")
    .select("id, web_session_id")
    .eq("id", waouhUserId)
    .maybeSingle();
  if (!wu) return;
  const { data: conv } = await sb
    .from("waouh_conversations")
    .select("id")
    .eq("user_id", wu.id)
    .limit(1)
    .maybeSingle();
  await sb.from("waouh_messages").insert({
    conversation_id: conv?.id ?? null,
    user_id: wu.id,
    web_session_id: wu.web_session_id,
    channel: wu.web_session_id ? "web" : "system",
    direction: "out",
    text,
    article_id: articleId,
    meta: { kind: "deal_event", ...meta, at: new Date().toISOString() },
  });
}

/** Resolve display_name / phone_number with fallback to profiles + auth.users. */
async function resolveContact(sb: any, waouhUserId: string | null) {
  if (!waouhUserId) return { display_name: null, phone_number: null, city: null };
  const { data: wu } = await sb
    .from("waouh_users")
    .select("display_name, phone_number, city, auth_user_id")
    .eq("id", waouhUserId)
    .maybeSingle();
  let display_name = wu?.display_name || null;
  let phone_number = wu?.phone_number || null;
  const city = wu?.city || null;
  if ((!display_name || !phone_number) && wu?.auth_user_id) {
    try {
      const { data: prof } = await sb
        .from("profiles")
        .select("full_name, phone")
        .eq("id", wu.auth_user_id)
        .maybeSingle();
      if (!display_name) display_name = prof?.full_name || null;
      if (!phone_number) phone_number = prof?.phone || null;
    } catch {}
    if (!phone_number) {
      try {
        const { data: au } = await sb.auth.admin.getUserById(wu.auth_user_id);
        const u = au?.user;
        if (!display_name) display_name = (u?.user_metadata as any)?.full_name || u?.email || null;
        if (!phone_number) phone_number = u?.phone || (u?.user_metadata as any)?.phone || null;
      } catch {}
    }
  }
  return { display_name, phone_number, city };
}

async function requireAdmin(req: Request, sb: any) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return { ok: false, status: 401, error: "Missing Authorization header" };
  try {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return { ok: false, status: 401, error: "Invalid session" };
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: u.user.id, _role_name: "admin" });
    if (!isAdmin) return { ok: false, status: 403, error: "Admin role required" };
    return { ok: true, userId: u.user.id };
  } catch (e) {
    return { ok: false, status: 401, error: String(e) };
  }
}


type DealActor = {
  ok: boolean;
  status?: number;
  error?: string;
  internal: boolean;
  isAdmin: boolean;
  authUserId: string | null;
  waouhUserIds: string[];
};

async function resolveDealActor(req: Request, sb: any, body: any): Promise<DealActor> {
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (bearer && bearer === SERVICE_ROLE) {
    const actorId = String(body?.actor_user_id || "").trim();
    return {
      ok: !!actorId,
      status: actorId ? 200 : 403,
      error: actorId ? undefined : "actor_user_id required for internal deal action",
      internal: true,
      isAdmin: false,
      authUserId: null,
      waouhUserIds: actorId ? [actorId] : [],
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing Authorization header", internal: false, isAdmin: false, authUserId: null, waouhUserIds: [] };
  }

  try {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return { ok: false, status: 401, error: "Invalid session", internal: false, isAdmin: false, authUserId: null, waouhUserIds: [] };
    }
    const [{ data: rows }, { data: isAdmin }] = await Promise.all([
      sb.from("waouh_users").select("id").eq("auth_user_id", u.user.id).limit(100),
      sb.rpc("has_role", { _user_id: u.user.id, _role_name: "admin" }),
    ]);
    return {
      ok: true,
      internal: false,
      isAdmin: !!isAdmin,
      authUserId: u.user.id,
      waouhUserIds: (rows || []).map((row: any) => String(row.id)).filter(Boolean),
    };
  } catch (e) {
    return { ok: false, status: 401, error: String(e), internal: false, isAdmin: false, authUserId: null, waouhUserIds: [] };
  }
}

const actorIsBuyer = (actor: DealActor, deal: any) =>
  actor.isAdmin || actor.waouhUserIds.includes(String(deal?.buyer_user_id || ""));

const actorIsSeller = (actor: DealActor, deal: any) =>
  actor.isAdmin || actor.waouhUserIds.includes(String(deal?.seller_user_id || ""));

const actorIsParticipant = (actor: DealActor, deal: any) =>
  actorIsBuyer(actor, deal) || actorIsSeller(actor, deal);

async function advanceReadyDeal(sb: any, dealId: string) {
  const { data: fresh } = await sb.from("waouh_deals").select("*").eq("id", dealId).maybeSingle();
  if (!fresh) return null;
  const ready = !!fresh.seller_confirmed_at && !!fresh.buyer_payment_selected_at;
  if (!ready || !["awaiting_confirmation", "awaiting_payment"].includes(fresh.status)) return fresh;

  const { data: updated } = await sb.from("waouh_deals")
    .update({ status: "pending_assignment" })
    .eq("id", dealId)
    .in("status", ["awaiting_confirmation", "awaiting_payment"])
    .select("*")
    .maybeSingle();

  if (updated) {
    fetch(`${SUPABASE_URL}/functions/v1/waouh-deal-dispatch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: dealId }),
    }).catch((e) => console.warn("[waouh-deal-ops] deal-dispatch failed", e));
    return updated;
  }
  return fresh;
}

async function findDealTransaction(sb: any, deal: any) {
  if (deal?.thread_id) {
    const { data } = await sb.from("waouh_transactions")
      .select("*")
      .eq("thread_id", deal.thread_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await sb.from("waouh_transactions")
    .select("*")
    .eq("article_id", deal.article_id)
    .eq("buyer_id", deal.buyer_user_id)
    .eq("seller_id", deal.seller_user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

// ───────── Action handlers ─────────

async function handleAssign(sb: any, body: any) {
  const { deal_id, courier_id, eta_minutes } = body;
  if (!deal_id || !courier_id || !eta_minutes) return json({ error: "deal_id, courier_id, eta_minutes required" }, 400);

  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);
  if (deal.status !== "pending_assignment") {
    return json({ error: "deal_not_ready_for_assignment", current_status: deal.status }, 409);
  }
  const { data: courier } = await sb.from("waouh_couriers").select("*").eq("id", courier_id).maybeSingle();
  if (!courier) return json({ error: "courier not found" }, 404);

  const [buyer, seller, { data: article }] = await Promise.all([
    resolveContact(sb, deal.buyer_user_id),
    resolveContact(sb, deal.seller_user_id),
    sb.from("waouh_articles").select("id, title").eq("id", deal.article_id).maybeSingle(),
  ]);

  const etaMin = Math.max(1, Number(eta_minutes));
  const etaAt = new Date(Date.now() + etaMin * 60_000).toISOString();
  const amount = Number(deal.amount || 0);
  const title = article?.title || "article";

  await sb.from("waouh_deals").update({
    status: "assigned",
    courier_user_id: courier_id,
    courier_name: courier.name,
    courier_phone: courier.phone_number,
    eta_minutes: etaMin,
    eta_at: etaAt,
    assigned_at: new Date().toISOString(),
  }).eq("id", deal_id);

  const results: Record<string, any> = {};

  const courierText =
    `🛵 *Nouvelle livraison WAOUH #${String(deal_id).slice(0, 8)}*\n\n` +
    `📦 ${title}\n💰 ${fmt(amount)} — *paiement à la livraison*\n\n` +
    `👤 *Vendeur* : ${seller.display_name || "—"}\n   📞 ${seller.phone_number || "—"}\n   📍 ${seller.city || "—"}\n\n` +
    `🛒 *Acheteur* : ${buyer.display_name || "—"}\n   📞 ${buyer.phone_number || "—"}\n   📍 ${buyer.city || "—"}\n\n` +
    `⏱️ ETA acheteur : ${etaMin} min\n\nÉtapes : appeler le vendeur → récupérer le colis → marquer « collecté » → livrer → encaisser.`;
  if (courier.phone_number) results.courier_wa = await sendWhatsApp(`${courier.phone_number}@c.us`, courierText);

  const buyerText =
    `🛵 *Livreur en route !*\n📦 ${title}\n💰 ${fmt(amount)}\n\n⏱️ Délai estimé : *~${etaMin} min*\n💵 Préparez le paiement (cash ou Mobile Money).\n\n🔒 WAOUH coordonne — vous n'avez pas besoin du contact du vendeur.\n— WAOUH ✨`;
  if (buyer.phone_number && !/@lid$/i.test(buyer.phone_number)) {
    results.buyer_wa = await sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText);
  }
  await insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_assigned", buyerText, {
    deal_id, article_id: deal.article_id, role: "buyer", eta_minutes: etaMin, eta_at: etaAt,
  });

  const sellerText =
    `🛵 *Livreur en route pour la collecte*\n📦 ${title}\n\nUn livreur WAOUH vous appellera dans ~${etaMin} min.\n🔒 Le contact de l'acheteur reste confidentiel.\n— WAOUH ✨`;
  if (seller.phone_number && !/@lid$/i.test(seller.phone_number)) {
    results.seller_wa = await sendWhatsApp(`${seller.phone_number}@c.us`, sellerText);
  }
  await insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_assigned", sellerText, {
    deal_id, article_id: deal.article_id, role: "seller", eta_minutes: etaMin,
  });

  const chatLine = `🛵 Livreur assigné — ETA ~${etaMin} min (à ${hhmm()}).`;
  await Promise.all([
    pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, chatLine, { deal_id, event: "assigned", eta_minutes: etaMin }),
    pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, chatLine, { deal_id, event: "assigned", eta_minutes: etaMin }),
  ]);

  if (WAOUH_OPS_WHATSAPP) {
    results.ops_wa = await sendWhatsApp(`${WAOUH_OPS_WHATSAPP}@c.us`,
      `✅ Deal #${String(deal_id).slice(0, 8)} assigné à *${courier.name}* (${courier.phone_number}) — ETA ${etaMin} min.`);
  }

  return json({ success: true, results, eta_at: etaAt, buyer, seller });
}

async function handleStatus(sb: any, body: any) {
  const { deal_id, status, reason } = body;
  if (!deal_id || !["picked_up", "delivered", "cancelled"].includes(status)) {
    return json({ error: "deal_id & valid status required" }, 400);
  }
  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);

  if (status === "picked_up" && deal.status !== "assigned") {
    return json({ error: "invalid_deal_transition", expected: "assigned", current_status: deal.status }, 409);
  }
  if (status === "delivered" && deal.status !== "picked_up") {
    return json({ error: "invalid_deal_transition", expected: "picked_up", current_status: deal.status }, 409);
  }
  if (status === "cancelled" && ["delivered", "completed"].includes(deal.status)) {
    return json({ error: "delivered_deal_requires_dispute", current_status: deal.status }, 409);
  }

  const now = new Date().toISOString();
  const hh = hhmm(new Date(now));
  const updates: any = { status };
  if (status === "picked_up") updates.picked_up_at = now;
  if (status === "delivered") updates.delivered_at = now;
  if (status === "cancelled") {
    updates.cancelled_at = now;
    updates.commission_status = "void";
    if (reason) updates.notes = `[Annulation ${hh}] ${reason}`;
  }
  await sb.from("waouh_deals").update(updates).eq("id", deal_id);

  const [buyer, seller, { data: article }] = await Promise.all([
    resolveContact(sb, deal.buyer_user_id),
    resolveContact(sb, deal.seller_user_id),
    sb.from("waouh_articles").select("title").eq("id", deal.article_id).maybeSingle(),
  ]);
  const title = article?.title || "votre article";
  const amount = Number(deal.amount || 0);

  const sendBoth = async (kindBuyer: string, kindSeller: string, buyerText: string, sellerText: string, chatLine: string, payloadExtra: any = {}) => {
    await Promise.all([
      insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, kindBuyer, buyerText, { deal_id, role: "buyer", ...payloadExtra }),
      insertInAppNotif(sb, deal.seller_user_id, deal.article_id, kindSeller, sellerText, { deal_id, role: "seller", ...payloadExtra }),
      pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, chatLine, { deal_id, event: status, role: "buyer", ...payloadExtra }),
      pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, chatLine, { deal_id, event: status, role: "seller", ...payloadExtra }),
      buyer.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
      seller.phone_number && !/@lid$/i.test(seller.phone_number) ? sendWhatsApp(`${seller.phone_number}@c.us`, sellerText) : Promise.resolve(),
    ]);
  };

  if (status === "picked_up") {
    await sendBoth(
      "deal_picked_up", "deal_picked_up",
      `📦 *Colis collecté !*\nLe livreur WAOUH a récupéré « ${title} » et se met en route.`,
      `✅ *Colis remis au livreur*\n« ${title} » a quitté votre point. Merci !`,
      `📦 Colis collecté par le livreur à ${hh}.`,
      { workflow_state: "picked_up" },
    );
  } else if (status === "delivered") {
    const preferred = deal.payment_method === "mobile_money" ? "mobile_money" : "cash";
    const paymentActions = preferred === "mobile_money"
      ? [{ id: `confirmer-paiement-mobile:${deal_id}`, label: "✅ Confirmer Mobile Money" }]
      : [{ id: `confirmer-paiement-cash:${deal_id}`, label: "✅ Confirmer paiement cash" }];
    const buyerText = `🎁 *Colis livré !*\n« ${title} » — ${fmt(amount)}.\n\nConfirmez maintenant le paiement effectué au livreur.`;
    const sellerText = `📬 *Colis livré à l'acheteur*\n« ${title} » a été remis. Le paiement est en cours de confirmation.`;
    await Promise.all([
      insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_payment_request", buyerText, {
        deal_id, role: "buyer", requires_confirmation: true, amount, actions: paymentActions, workflow_state: "delivered",
      }),
      insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_delivered", sellerText, {
        deal_id, role: "seller", workflow_state: "delivered",
      }),
      pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, `📬 Livraison confirmée à ${hh}. Confirmez le paiement.`, {
        deal_id, event: "delivered", role: "buyer", actions: paymentActions, workflow_state: "delivered", payment_method: preferred,
      }),
      pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, `📬 Colis livré à l'acheteur à ${hh}. Paiement en attente.`, {
        deal_id, event: "delivered", role: "seller", workflow_state: "delivered",
      }),
      buyer.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
      seller.phone_number && !/@lid$/i.test(seller.phone_number) ? sendWhatsApp(`${seller.phone_number}@c.us`, sellerText) : Promise.resolve(),
    ]);
  } else if (status === "cancelled") {
    const message = `⚠️ *Livraison annulée* pour « ${title} ».${reason ? `\nRaison : ${reason}` : ""}\nL'article redevient disponible si aucune autre réservation n'est active.`;
    await sendBoth(
      "deal_cancelled", "deal_cancelled", message, message,
      `⚠️ Livraison annulée à ${hh}${reason ? ` — ${reason}` : ""}.`,
      { reason: reason || null, workflow_state: "cancelled" },
    );
  }

  return json({ success: true, ok: true, deal_id, status, workflow_state: status });
}

async function handleUpdateEta(sb: any, body: any) {
  const { deal_id, eta_minutes } = body;
  if (!deal_id || !eta_minutes) return json({ error: "deal_id & eta_minutes required" }, 400);
  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);
  if (!["assigned", "picked_up"].includes(deal.status)) {
    return json({ error: `Cannot update ETA in status '${deal.status}'` }, 400);
  }

  const etaMin = Math.max(1, Number(eta_minutes));
  const etaAt = new Date(Date.now() + etaMin * 60_000).toISOString();
  await sb.from("waouh_deals").update({ eta_minutes: etaMin, eta_at: etaAt }).eq("id", deal_id);

  const [buyer, { data: article }] = await Promise.all([
    resolveContact(sb, deal.buyer_user_id),
    sb.from("waouh_articles").select("title").eq("id", deal.article_id).maybeSingle(),
  ]);
  const title = article?.title || "votre commande";
  const hh = hhmm();
  const buyerText = `⏱️ *ETA mise à jour* — ${title}\n\nNouveau délai estimé : *~${etaMin} min* (à partir de ${hh}).\n— WAOUH ✨`;
  const chatLine = `⏱️ ETA mise à jour à ${hh} — ~${etaMin} min.`;

  await Promise.all([
    insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_eta_updated", buyerText, { deal_id, role: "buyer", eta_minutes: etaMin, eta_at: etaAt }),
    pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, chatLine, { deal_id, event: "eta_updated", eta_minutes: etaMin }),
    pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, chatLine, { deal_id, event: "eta_updated", eta_minutes: etaMin }),
    buyer.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
  ]);

  return json({ success: true, eta_at: etaAt });
}

async function handleSellerConfirm(sb: any, body: any, actor: DealActor) {
  const { deal_id } = body;
  if (!deal_id) return json({ error: "deal_id required" }, 400);
  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);
  if (!actorIsSeller(actor, deal)) return json({ error: "forbidden" }, 403);
  if (["cancelled", "completed", "delivered"].includes(deal.status)) {
    return json({ error: "deal_not_confirmable", current_status: deal.status }, 409);
  }

  const now = new Date().toISOString();
  await sb.from("waouh_deals").update({ seller_confirmed_at: now }).eq("id", deal_id);
  const advanced = await advanceReadyDeal(sb, deal_id);
  const workflow = advanced?.status || deal.status;

  const text = workflow === "pending_assignment"
    ? "✅ Disponibilité confirmée. WAOUH peut maintenant organiser la livraison."
    : "✅ Disponibilité confirmée. En attente du choix de paiement de l'acheteur.";
  await pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, text, {
    deal_id, event: "seller_confirmed", role: "seller", workflow_state: workflow,
  });

  return json({
    success: true, ok: true, reply: text, intent: "seller_availability_confirmed",
    workflow_state: workflow, deal_id, article_id: deal.article_id, thread_id: deal.thread_id, actions: [],
  });
}

async function handlePaymentPreference(sb: any, body: any, actor: DealActor) {
  const { deal_id, method } = body;
  if (!deal_id || !["cash", "mobile_money"].includes(method)) {
    return json({ error: "deal_id & method(cash|mobile_money) required" }, 400);
  }
  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);
  if (!actorIsBuyer(actor, deal)) return json({ error: "forbidden" }, 403);
  if (["cancelled", "completed", "delivered"].includes(deal.status)) {
    return json({ error: "payment_preference_locked", current_status: deal.status }, 409);
  }

  const now = new Date().toISOString();
  await sb.from("waouh_deals").update({
    payment_method: method,
    payment_status: "pending_delivery",
    buyer_payment_selected_at: now,
  }).eq("id", deal_id);

  const tx = await findDealTransaction(sb, deal);
  if (tx?.id) {
    await sb.from("waouh_transactions").update({
      payment_method: method,
      status: "delivery_pending",
      commission_rate: deal.commission_rate ?? COMMISSION_RATE,
      commission_status: "pending",
    }).eq("id", tx.id);
  }

  const advanced = await advanceReadyDeal(sb, deal_id);
  const workflow = advanced?.status || deal.status;
  const methodLabel = method === "mobile_money" ? "Mobile Money à la livraison" : "cash à la livraison";
  const text = workflow === "pending_assignment"
    ? `✅ ${methodLabel} sélectionné. WAOUH peut maintenant organiser la livraison.`
    : `✅ ${methodLabel} sélectionné. En attente de confirmation du vendeur.`;

  await pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, text, {
    deal_id, event: "payment_preference", role: "buyer", payment_method: method, workflow_state: workflow,
  });

  return json({
    success: true, ok: true, reply: text, intent: "payment_preference_selected",
    workflow_state: workflow, deal_id, article_id: deal.article_id, thread_id: deal.thread_id,
    payment_method: method, actions: [],
  });
}

async function handleParticipantCancel(sb: any, body: any, actor: DealActor) {
  const { deal_id, reason } = body;
  if (!deal_id) return json({ error: "deal_id required" }, 400);
  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);
  if (!actorIsParticipant(actor, deal)) return json({ error: "forbidden" }, 403);
  if (["delivered", "completed"].includes(deal.status)) {
    return json({ error: "delivered_deal_requires_dispute", current_status: deal.status }, 409);
  }
  if (deal.status === "cancelled") {
    return json({ success: true, ok: true, already_cancelled: true, workflow_state: "cancelled", deal_id });
  }

  const now = new Date().toISOString();
  await sb.from("waouh_deals").update({
    status: "cancelled",
    cancelled_at: now,
    commission_status: "void",
    notes: reason ? `[Annulation utilisateur] ${reason}` : deal.notes,
  }).eq("id", deal_id);

  const text = "❌ Accord annulé. L'article est libéré et peut redevenir disponible.";
  await Promise.all([
    insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_cancelled", text, { deal_id, role: "buyer", workflow_state: "cancelled" }),
    insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_cancelled", text, { deal_id, role: "seller", workflow_state: "cancelled" }),
    pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, text, { deal_id, event: "cancelled", role: "buyer", workflow_state: "cancelled" }),
    pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, text, { deal_id, event: "cancelled", role: "seller", workflow_state: "cancelled" }),
  ]);

  return json({
    success: true, ok: true, reply: text, intent: "deal_cancelled",
    workflow_state: "cancelled", deal_id, article_id: deal.article_id, thread_id: deal.thread_id, actions: [],
  });
}

async function handlePayment(sb: any, body: any, actor: DealActor) {
  const { deal_id, method } = body;
  if (!deal_id || !["cash", "mobile_money"].includes(method)) {
    return json({ error: "deal_id & method(cash|mobile_money) required" }, 400);
  }
  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);
  if (!actorIsBuyer(actor, deal)) return json({ error: "forbidden" }, 403);
  if (deal.payment_status === "paid") {
    return json({ success: true, ok: true, already_paid: true, workflow_state: "completed", deal_id });
  }
  if (!deal.delivered_at || deal.status !== "delivered") {
    return json({
      error: "payment_confirmation_requires_delivery",
      current_status: deal.status,
      delivered_at: deal.delivered_at ?? null,
    }, 409);
  }

  const now = new Date().toISOString();
  const amount = Number(deal.amount || 0);
  const rate = Number(deal.commission_rate ?? COMMISSION_RATE) || COMMISSION_RATE;
  const commission = Math.round(amount * rate);

  await sb.from("waouh_deals").update({
    payment_status: "paid",
    payment_method: method,
    paid_at: now,
    status: "completed",
    commission_rate: rate,
    commission_amount: commission,
    commission_status: "earned",
    settlement_completed_at: now,
  }).eq("id", deal_id);

  const tx = await findDealTransaction(sb, deal);
  if (tx?.id) {
    await sb.from("waouh_transactions").update({
      amount,
      negotiated_price: amount,
      commission,
      commission_rate: rate,
      commission_status: "earned",
      payment_method: method,
      escrow_status: "settled",
      seller_confirmed: true,
      buyer_confirmed: true,
      status: "completed",
      completed_at: now,
      settled_at: now,
    }).eq("id", tx.id);

    fetch(`${SUPABASE_URL}/functions/v1/waouh-partner-attribute-sale`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: tx.id }),
    }).catch((e) => console.warn("[waouh-deal-ops] partner attribution failed", e));
  }

  const [buyer, seller, { data: article }] = await Promise.all([
    resolveContact(sb, deal.buyer_user_id),
    resolveContact(sb, deal.seller_user_id),
    sb.from("waouh_articles").select("title").eq("id", deal.article_id).maybeSingle(),
  ]);
  const title = article?.title || "votre article";
  const methodLbl = method === "cash" ? "espèces" : "Mobile Money";
  const buyerText = `✅ *Paiement confirmé* (${methodLbl}) — ${fmt(amount)}.\nTransaction WAOUH terminée.`;
  const sellerText = `💰 *Vente finalisée* — ${fmt(amount)} pour « ${title} ». Commission WAOUH : ${fmt(commission)}.`;
  const opsText = `💸 Deal #${String(deal_id).slice(0, 8)} terminé — ${fmt(amount)} · commission ${fmt(commission)}.`;

  await Promise.all([
    insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_paid", buyerText, { deal_id, method, amount, commission, workflow_state: "completed" }),
    insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_paid", sellerText, { deal_id, method, amount, commission, workflow_state: "completed" }),
    pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, "✅ Paiement confirmé. Transaction terminée.", { deal_id, event: "completed", role: "buyer", workflow_state: "completed" }),
    pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, "✅ Paiement confirmé. Vente terminée.", { deal_id, event: "completed", role: "seller", workflow_state: "completed" }),
    buyer.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
    seller.phone_number && !/@lid$/i.test(seller.phone_number) ? sendWhatsApp(`${seller.phone_number}@c.us`, sellerText) : Promise.resolve(),
    WAOUH_OPS_WHATSAPP ? sendWhatsApp(`${WAOUH_OPS_WHATSAPP}@c.us`, opsText) : Promise.resolve(),
  ]);

  return json({
    success: true, ok: true, reply: "✅ Livraison et paiement confirmés. Transaction WAOUH terminée.",
    intent: "deal_completed", workflow_state: "completed", deal_id,
    article_id: deal.article_id, thread_id: deal.thread_id, transaction_id: tx?.id ?? null,
    commission, commission_rate: rate, actions: [],
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (!action) return json({ error: "action required" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const adminActions = ["assign", "status", "update_eta"];
    if (adminActions.includes(action)) {
      const guard = await requireAdmin(req, sb);
      if (!guard.ok) return json({ error: guard.error }, guard.status);
    }

    const dealControl = await getWaouhModuleControl(sb, "deals");
    if (!dealControl.enabled && !adminActions.includes(action)) {
      return json({
        error: "deals_paused",
        message: dealControl.maintenance_message || "Le Deal Graph WAOUH est temporairement suspendu.",
      }, 503);
    }

    if (["seller_confirm", "payment_preference", "cancel", "payment"].includes(action)) {
      const actor = await resolveDealActor(req, sb, body);
      if (!actor.ok) return json({ error: actor.error || "unauthorized" }, actor.status || 401);
      switch (action) {
        case "seller_confirm":     return await handleSellerConfirm(sb, body, actor);
        case "payment_preference": return await handlePaymentPreference(sb, body, actor);
        case "cancel":             return await handleParticipantCancel(sb, body, actor);
        case "payment":            return await handlePayment(sb, body, actor);
      }
    }

    switch (action) {
      case "assign":      return await handleAssign(sb, body);
      case "status":      return await handleStatus(sb, body);
      case "update_eta":  return await handleUpdateEta(sb, body);
      default:            return json({ error: `unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[waouh-deal-ops]", e);
    return json({ error: String(e) }, 500);
  }
});
