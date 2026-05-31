// waouh-deal-payment
// Buyer confirms payment-on-delivery (cash / mobile_money).
// Marks deal paid, notifies seller + ops, closes loop.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";
const WAOUH_OPS_WHATSAPP = Deno.env.get("WAOUH_OPS_WHATSAPP") || "";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

async function sendWhatsApp(chatId: string, text: string) {
  if (!WAHA_BASE_URL) return;
  const base = WAHA_BASE_URL.replace(/\/$/, "");
  try {
    await fetch(`${base}/api/sendText`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) },
      body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
    });
  } catch (e) { console.warn("[deal-payment] wa send", e); }
}

async function insertInAppNotif(sb: any, userId: string, articleId: string | null, kind: string, text: string, payload: any) {
  let webSession: string | null = null;
  try {
    const { data: u } = await sb.from("waouh_users").select("web_session_id").eq("id", userId).maybeSingle();
    webSession = u?.web_session_id ?? null;
  } catch {}
  await sb.from("waouh_notifications").insert({
    user_id: userId, article_id: articleId,
    notification_type: kind, photos: [],
    web_session_id: webSession,
    dedupe_key: `${kind}:${payload?.deal_id || userId}:${Date.now()}`,
    payload: { ...payload, text },
    channel: "waouh_app", delivery_status: "delivered",
    delivered_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { deal_id, method } = await req.json();
    if (!deal_id || !["cash", "mobile_money"].includes(method)) {
      return new Response(JSON.stringify({ error: "deal_id & method(cash|mobile_money) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Optional auth check — match buyer
    const authHeader = req.headers.get("Authorization") || "";
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
    if (!deal) return new Response(JSON.stringify({ error: "deal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (deal.payment_status === "paid") {
      return new Response(JSON.stringify({ success: true, already_paid: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (authHeader.startsWith("Bearer ")) {
      try {
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: ures } = await userClient.auth.getUser();
        const authUid = ures?.user?.id;
        if (authUid) {
          const { data: wu } = await sb.from("waouh_users").select("id").eq("auth_user_id", authUid).maybeSingle();
          if (wu?.id && wu.id !== deal.buyer_user_id) {
            return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch {}
    }

    const now = new Date().toISOString();
    await sb.from("waouh_deals").update({
      payment_status: "paid",
      payment_method: method,
      paid_at: now,
      status: "completed",
    }).eq("id", deal_id);

    const [{ data: buyer }, { data: seller }, { data: article }] = await Promise.all([
      sb.from("waouh_users").select("phone_number, display_name").eq("id", deal.buyer_user_id).maybeSingle(),
      sb.from("waouh_users").select("phone_number, display_name").eq("id", deal.seller_user_id).maybeSingle(),
      sb.from("waouh_articles").select("title").eq("id", deal.article_id).maybeSingle(),
    ]);

    const title = article?.title || "votre article";
    const amount = Number(deal.amount || 0);
    const methodLbl = method === "cash" ? "espèces" : "Mobile Money";

    const buyerText = `✅ *Paiement confirmé* (${methodLbl}) — ${fmt(amount)}.\nMerci pour votre achat sur WAOUH ! Note ton livreur ⭐`;
    const sellerText = `💰 *Fonds reçus* — ${fmt(amount)} (${methodLbl}) pour « ${title} ». WAOUH vous reversera selon le cycle convenu.`;
    const opsText = `💸 Deal #${String(deal_id).slice(0, 8)} *payé* — ${fmt(amount)} (${methodLbl}). À reverser au vendeur ${seller?.display_name || ""}.`;

    await Promise.all([
      insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_paid", buyerText, { deal_id, method, amount }),
      insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_paid", sellerText, { deal_id, method, amount }),
      buyer?.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
      seller?.phone_number && !/@lid$/i.test(seller.phone_number) ? sendWhatsApp(`${seller.phone_number}@c.us`, sellerText) : Promise.resolve(),
      WAOUH_OPS_WHATSAPP ? sendWhatsApp(`${WAOUH_OPS_WHATSAPP}@c.us`, opsText) : Promise.resolve(),
    ]);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-deal-payment]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
