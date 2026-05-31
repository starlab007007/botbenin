// waouh-deal-ops
// Single router for WAOUH deal operations:
//   action: "assign" | "status" | "update_eta" | "payment"
// Consolidated from waouh-deal-{assign,status,update-eta,payment} to fit edge-function quota.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";
const WAOUH_OPS_WHATSAPP = Deno.env.get("WAOUH_OPS_WHATSAPP") || "";

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

// ───────── Action handlers ─────────

async function handleAssign(sb: any, body: any) {
  const { deal_id, courier_id, eta_minutes } = body;
  if (!deal_id || !courier_id || !eta_minutes) return json({ error: "deal_id, courier_id, eta_minutes required" }, 400);

  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);
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

  const now = new Date().toISOString();
  const hh = hhmm(new Date(now));
  const updates: any = { status };
  if (status === "picked_up") updates.picked_up_at = now;
  if (status === "delivered") updates.delivered_at = now;
  if (status === "cancelled") { updates.cancelled_at = now; if (reason) updates.notes = `[Annulation ${hh}] ${reason}`; }
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
      pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, chatLine, { deal_id, event: status, ...payloadExtra }),
      pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, chatLine, { deal_id, event: status, ...payloadExtra }),
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
    );
  } else if (status === "delivered") {
    await sendBoth(
      "deal_payment_request", "deal_delivered",
      `🎁 *Colis livré !*\n« ${title} » — ${fmt(amount)}.\n\n💵 *Confirmez le paiement* effectué au livreur (cash ou Mobile Money) depuis l'app.`,
      `📬 *Colis livré à l'acheteur*\n« ${title} » a été remis. Le paiement est en cours de confirmation.`,
      `📬 Colis livré à l'acheteur à ${hh}. Paiement en cours de confirmation.`,
      { requires_confirmation: true, amount },
    );
  } else if (status === "cancelled") {
    const text = `⚠️ *Livraison annulée* pour « ${title} ».${reason ? `\nRaison : ${reason}` : ""}\nL'équipe WAOUH vous recontactera.`;
    await sendBoth(
      "deal_cancelled", "deal_cancelled", text, text,
      `⚠️ Livraison annulée à ${hh}${reason ? ` — ${reason}` : ""}.`,
      { reason: reason || null },
    );
  }

  return json({ success: true });
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

async function handlePayment(sb: any, body: any, authHeader: string) {
  const { deal_id, method } = body;
  if (!deal_id || !["cash", "mobile_money"].includes(method)) {
    return json({ error: "deal_id & method(cash|mobile_money) required" }, 400);
  }
  const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
  if (!deal) return json({ error: "deal not found" }, 404);
  if (deal.payment_status === "paid") return json({ success: true, already_paid: true });

  // Optional buyer check
  if (authHeader.startsWith("Bearer ")) {
    try {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: ures } = await userClient.auth.getUser();
      const authUid = ures?.user?.id;
      if (authUid) {
        const { data: wu } = await sb.from("waouh_users").select("id").eq("auth_user_id", authUid).maybeSingle();
        // also allow admin
        const { data: isAdmin } = await sb.rpc("has_role", { _user_id: authUid, _role_name: "admin" });
        if (wu?.id && wu.id !== deal.buyer_user_id && !isAdmin) return json({ error: "forbidden" }, 403);
      }
    } catch {}
  }

  const now = new Date().toISOString();
  await sb.from("waouh_deals").update({
    payment_status: "paid", payment_method: method, paid_at: now, status: "completed",
  }).eq("id", deal_id);

  const [buyer, seller, { data: article }] = await Promise.all([
    resolveContact(sb, deal.buyer_user_id),
    resolveContact(sb, deal.seller_user_id),
    sb.from("waouh_articles").select("title").eq("id", deal.article_id).maybeSingle(),
  ]);
  const title = article?.title || "votre article";
  const amount = Number(deal.amount || 0);
  const methodLbl = method === "cash" ? "espèces" : "Mobile Money";

  const buyerText = `✅ *Paiement confirmé* (${methodLbl}) — ${fmt(amount)}.\nMerci pour votre achat sur WAOUH ! Note ton livreur ⭐`;
  const sellerText = `💰 *Fonds reçus* — ${fmt(amount)} (${methodLbl}) pour « ${title} ». WAOUH vous reversera selon le cycle convenu.`;
  const opsText = `💸 Deal #${String(deal_id).slice(0, 8)} *payé* — ${fmt(amount)} (${methodLbl}). À reverser au vendeur ${seller.display_name || ""}.`;

  await Promise.all([
    insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_paid", buyerText, { deal_id, method, amount }),
    insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_paid", sellerText, { deal_id, method, amount }),
    buyer.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
    seller.phone_number && !/@lid$/i.test(seller.phone_number) ? sendWhatsApp(`${seller.phone_number}@c.us`, sellerText) : Promise.resolve(),
    WAOUH_OPS_WHATSAPP ? sendWhatsApp(`${WAOUH_OPS_WHATSAPP}@c.us`, opsText) : Promise.resolve(),
  ]);

  return json({ success: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (!action) return json({ error: "action required (assign|status|update_eta|payment)" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const authHeader = req.headers.get("Authorization") || "";

    // Admin gate for ops actions (payment is buyer-side, optional admin check inside)
    if (["assign", "status", "update_eta"].includes(action)) {
      const guard = await requireAdmin(req, sb);
      if (!guard.ok) return json({ error: guard.error }, guard.status);
    }

    switch (action) {
      case "assign":      return await handleAssign(sb, body);
      case "status":      return await handleStatus(sb, body);
      case "update_eta":  return await handleUpdateEta(sb, body);
      case "payment":     return await handlePayment(sb, body, authHeader);
      default:            return json({ error: `unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[waouh-deal-ops]", e);
    return json({ error: String(e) }, 500);
  }
});
