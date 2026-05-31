// waouh-deal-update-eta
// Ops modifies the ETA after assignment. Re-notifies buyer (in-app + WhatsApp)
// and pushes a chat-history entry visible to both parties.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin, pushDealChatEvent } from "../_shared/waouh-deal.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";

async function sendWhatsApp(chatId: string, text: string) {
  if (!WAHA_BASE_URL) return;
  const base = WAHA_BASE_URL.replace(/\/$/, "");
  try {
    await fetch(`${base}/api/sendText`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) },
      body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
    });
  } catch (e) { console.warn("[deal-update-eta] wa", e); }
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
    const { deal_id, eta_minutes } = await req.json();
    if (!deal_id || !eta_minutes) {
      return new Response(JSON.stringify({ error: "deal_id & eta_minutes required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const guard = await requireAdmin(req, sb);
    if (!guard.ok) {
      return new Response(JSON.stringify({ error: guard.error }), {
        status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
    if (!deal) return new Response(JSON.stringify({ error: "deal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!["assigned", "picked_up"].includes(deal.status)) {
      return new Response(JSON.stringify({ error: `Cannot update ETA in status '${deal.status}'` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const etaMin = Math.max(1, Number(eta_minutes));
    const etaAt = new Date(Date.now() + etaMin * 60_000).toISOString();
    await sb.from("waouh_deals").update({ eta_minutes: etaMin, eta_at: etaAt }).eq("id", deal_id);

    const [{ data: buyer }, { data: article }] = await Promise.all([
      sb.from("waouh_users").select("phone_number").eq("id", deal.buyer_user_id).maybeSingle(),
      sb.from("waouh_articles").select("title").eq("id", deal.article_id).maybeSingle(),
    ]);

    const title = article?.title || "votre commande";
    const hh = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const buyerText =
      `⏱️ *ETA mise à jour* — ${title}\n\nNouveau délai estimé : *~${etaMin} min* (à partir de ${hh}).\n— WAOUH ✨`;
    const chatLine = `⏱️ ETA mise à jour à ${hh} — ~${etaMin} min.`;

    await Promise.all([
      insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_eta_updated", buyerText, {
        deal_id, role: "buyer", eta_minutes: etaMin, eta_at: etaAt,
      }),
      pushDealChatEvent(sb, deal.buyer_user_id, deal.article_id, chatLine, { deal_id, event: "eta_updated", eta_minutes: etaMin }),
      pushDealChatEvent(sb, deal.seller_user_id, deal.article_id, chatLine, { deal_id, event: "eta_updated", eta_minutes: etaMin }),
      buyer?.phone_number && !/@lid$/i.test(buyer.phone_number) ? sendWhatsApp(`${buyer.phone_number}@c.us`, buyerText) : Promise.resolve(),
    ]);

    return new Response(JSON.stringify({ success: true, eta_at: etaAt }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-deal-update-eta]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
