// waouh-deal-assign
// Ops admin assigns a courier to a deal, locks ETA, and notifies:
//  - the courier (WhatsApp, with both buyer & seller contacts + addresses) — internal only
//  - the buyer  (WhatsApp + in-app, with ETA, no seller/courier phone)
//  - the seller (in-app, "le livreur arrive bientôt")
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin, pushDealChatEvent } from "../_shared/waouh-deal.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";
const WAOUH_OPS_WHATSAPP = Deno.env.get("WAOUH_OPS_WHATSAPP") || "";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

function wahaHeaders() {
  return {
    "Content-Type": "application/json",
    ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
  };
}

async function sendWhatsApp(chatId: string, text: string) {
  if (!WAHA_BASE_URL) return { ok: false, skipped: "WAHA_BASE_URL missing" };
  const base = WAHA_BASE_URL.replace(/\/$/, "");
  try {
    await fetch(`${base}/api/sendText`, {
      method: "POST",
      headers: wahaHeaders(),
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
  let webSession: string | null = null;
  try {
    const { data: u } = await sb.from("waouh_users").select("web_session_id").eq("id", userId).maybeSingle();
    webSession = u?.web_session_id ?? null;
  } catch {}
  const dedupeKey = `${kind}:${payload?.deal_id || articleId || userId}:${userId}:${Date.now()}`;
  await sb.from("waouh_notifications").insert({
    user_id: userId,
    article_id: articleId,
    notification_type: kind,
    photos: [],
    web_session_id: webSession,
    dedupe_key: dedupeKey,
    payload: { ...payload, text },
    channel: "waouh_app",
    delivery_status: "delivered",
    delivered_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { deal_id, courier_id, eta_minutes } = await req.json();
    if (!deal_id || !courier_id || !eta_minutes) {
      return new Response(JSON.stringify({ error: "deal_id, courier_id, eta_minutes required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
    if (!deal) return new Response(JSON.stringify({ error: "deal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: courier } = await sb.from("waouh_couriers").select("*").eq("id", courier_id).maybeSingle();
    if (!courier) return new Response(JSON.stringify({ error: "courier not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: buyer }, { data: seller }, { data: article }] = await Promise.all([
      sb.from("waouh_users").select("id, display_name, phone_number, city").eq("id", deal.buyer_user_id).maybeSingle(),
      sb.from("waouh_users").select("id, display_name, phone_number, city").eq("id", deal.seller_user_id).maybeSingle(),
      sb.from("waouh_articles").select("id, title, photos").eq("id", deal.article_id).maybeSingle(),
    ]);

    const etaMin = Math.max(1, Number(eta_minutes));
    const etaAt = new Date(Date.now() + etaMin * 60_000).toISOString();
    const amount = Number(deal.amount || 0);
    const title = article?.title || "article";

    // Update deal
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

    // 1) Courier — full info via WhatsApp (internal)
    const courierText =
      `🛵 *Nouvelle livraison WAOUH #${String(deal_id).slice(0, 8)}*\n\n` +
      `📦 ${title}\n💰 ${fmt(amount)} — *paiement à la livraison*\n\n` +
      `👤 *Vendeur* : ${seller?.display_name || "—"}\n` +
      `   📞 ${seller?.phone_number || "—"}\n   📍 ${seller?.city || "—"}\n\n` +
      `🛒 *Acheteur* : ${buyer?.display_name || "—"}\n` +
      `   📞 ${buyer?.phone_number || "—"}\n   📍 ${buyer?.city || "—"}\n\n` +
      `⏱️ ETA acheteur : ${etaMin} min\n\n` +
      `Étapes : appelez le vendeur → récupérez le colis → marquez « collecté » → livrez → encaissez.`;
    if (courier.phone_number) {
      results.courier_wa = await sendWhatsApp(`${courier.phone_number}@c.us`, courierText);
    }

    // 2) Buyer — ETA, NO courier/seller phone
    const buyerText =
      `🛵 *Livreur en route !*\n📦 ${title}\n💰 ${fmt(amount)}\n\n` +
      `⏱️ Délai estimé : *~${etaMin} min*\n💵 Préparez le paiement (cash ou Mobile Money).\n\n` +
      `🔒 WAOUH coordonne — vous n'avez pas besoin du contact du vendeur.\n— WAOUH ✨`;
    if (buyer?.phone_number && !/@lid$/i.test(buyer.phone_number)) {
      results.buyer_wa = await sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText);
    }
    await insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_assigned", buyerText, {
      deal_id, article_id: deal.article_id, role: "buyer", eta_minutes: etaMin, eta_at: etaAt,
    });

    // 3) Seller — in-app
    const sellerText =
      `🛵 *Livreur en route pour la collecte*\n📦 ${title}\n\n` +
      `Un livreur WAOUH vous appellera dans ~${etaMin} min pour récupérer le colis.\n` +
      `🔒 Le contact de l'acheteur reste confidentiel.\n— WAOUH ✨`;
    if (seller?.phone_number && !/@lid$/i.test(seller.phone_number)) {
      results.seller_wa = await sendWhatsApp(`${seller.phone_number}@c.us`, sellerText);
    }
    await insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_assigned", sellerText, {
      deal_id, article_id: deal.article_id, role: "seller", eta_minutes: etaMin,
    });

    // 4) Ops — WhatsApp recap
    if (WAOUH_OPS_WHATSAPP) {
      const opsText =
        `✅ Deal #${String(deal_id).slice(0, 8)} assigné à *${courier.name}* (${courier.phone_number}) — ETA ${etaMin} min.`;
      results.ops_wa = await sendWhatsApp(`${WAOUH_OPS_WHATSAPP}@c.us`, opsText);
    }

    return new Response(JSON.stringify({ success: true, results, eta_at: etaAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[waouh-deal-assign]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
