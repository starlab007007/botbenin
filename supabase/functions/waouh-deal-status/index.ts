// waouh-deal-status
// Ops marks deal progression: picked_up | delivered | cancelled.
// On delivered → also issues a "payment_request" notification to the buyer.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin, pushDealChatEvent } from "../_shared/waouh-deal.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

async function sendWhatsApp(chatId: string, text: string) {
  if (!WAHA_BASE_URL) return { ok: false, skipped: true };
  const base = WAHA_BASE_URL.replace(/\/$/, "");
  try {
    await fetch(`${base}/api/sendText`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) },
      body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}

async function insertInAppNotif(sb: any, userId: string, articleId: string | null, kind: string, text: string, payload: any) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { deal_id, status, reason } = await req.json();
    if (!deal_id || !["picked_up", "delivered", "cancelled"].includes(status)) {
      return new Response(JSON.stringify({ error: "deal_id & valid status required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 🔒 Admin-only
    const guard = await requireAdmin(req, sb);
    if (!guard.ok) {
      return new Response(JSON.stringify({ error: guard.error }), {
        status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
    if (!deal) return new Response(JSON.stringify({ error: "deal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const updates: any = { status };
    const now = new Date().toISOString();
    const hh = new Date(now).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (status === "picked_up") updates.picked_up_at = now;
    if (status === "delivered") updates.delivered_at = now;
    if (status === "cancelled") {
      updates.cancelled_at = now;
      if (reason) updates.notes = `[Annulation ${hh}] ${reason}`;
    }

    await sb.from("waouh_deals").update(updates).eq("id", deal_id);

    const [{ data: buyer }, { data: seller }, { data: article }] = await Promise.all([
      sb.from("waouh_users").select("phone_number, display_name").eq("id", deal.buyer_user_id).maybeSingle(),
      sb.from("waouh_users").select("phone_number, display_name").eq("id", deal.seller_user_id).maybeSingle(),
      sb.from("waouh_articles").select("title").eq("id", deal.article_id).maybeSingle(),
    ]);

    const title = article?.title || "votre article";
    const amount = Number(deal.amount || 0);

    if (status === "picked_up") {
      const buyerText = `📦 *Colis collecté !*\nLe livreur WAOUH a récupéré « ${title} » et se met en route. Vous serez notifié à la livraison.`;
      const sellerText = `✅ *Colis remis au livreur*\n« ${title} » a quitté votre point. Merci !`;
      const chatLine = `📦 Colis collecté par le livreur à ${hh}.`;
      await Promise.all([
        insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_picked_up", buyerText, { deal_id, role: "buyer" }),
        insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_picked_up", sellerText, { deal_id, role: "seller" }),
        pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, chatLine, { deal_id, event: "picked_up" }),
        pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, chatLine, { deal_id, event: "picked_up" }),
        buyer?.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
        seller?.phone_number && !/@lid$/i.test(seller.phone_number) ? sendWhatsApp(`${seller.phone_number}@c.us`, sellerText) : Promise.resolve(),
      ]);
    } else if (status === "delivered") {
      const buyerText = `🎁 *Colis livré !*\n« ${title} » — ${fmt(amount)}.\n\n💵 *Confirmez le paiement* effectué au livreur (cash ou Mobile Money) depuis l'app.`;
      const sellerText = `📬 *Colis livré à l'acheteur*\n« ${title} » a été remis. Le paiement est en cours de confirmation.`;
      const chatLine = `📬 Colis livré à l'acheteur à ${hh}. Paiement en cours de confirmation.`;
      await Promise.all([
        insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_payment_request", buyerText, { deal_id, role: "buyer", requires_confirmation: true, amount }),
        insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_delivered", sellerText, { deal_id, role: "seller" }),
        pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, chatLine, { deal_id, event: "delivered" }),
        pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, chatLine, { deal_id, event: "delivered" }),
        buyer?.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
        seller?.phone_number && !/@lid$/i.test(seller.phone_number) ? sendWhatsApp(`${seller.phone_number}@c.us`, sellerText) : Promise.resolve(),
      ]);
    } else if (status === "cancelled") {
      const reasonPart = reason ? `\nRaison : ${reason}` : "";
      const text = `⚠️ *Livraison annulée* pour « ${title} ».${reasonPart}\nL'équipe WAOUH vous recontactera.`;
      const chatLine = `⚠️ Livraison annulée à ${hh}${reason ? ` — ${reason}` : ""}.`;
      await Promise.all([
        insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_cancelled", text, { deal_id, reason: reason || null }),
        insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_cancelled", text, { deal_id, reason: reason || null }),
        pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, chatLine, { deal_id, event: "cancelled", reason: reason || null }),
        pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, chatLine, { deal_id, event: "cancelled", reason: reason || null }),
        buyer?.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, text) : Promise.resolve(),
        seller?.phone_number && !/@lid$/i.test(seller.phone_number) ? sendWhatsApp(`${seller.phone_number}@c.us`, text) : Promise.resolve(),
      ]);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-deal-status]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
