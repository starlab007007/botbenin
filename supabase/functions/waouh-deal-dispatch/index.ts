// waouh-deal-dispatch
// Envoie les notifications de livraison médiée pour un deal conclu :
//  - vendeur : "un livreur va vous contacter"
//  - acheteur : "vous recevrez bientôt le délai, paiement à la livraison"
//  - équipe ops WAOUH : récap complet avec contacts des 2 parties
// Aucun numéro de téléphone n'est partagé entre acheteur et vendeur.
//
// 🔁 Acheteur + vendeur passent par `pushSyncedEvent` qui résout le numéro
// WhatsApp via TOUTES les sources (chat / partenaire / radar IA) et garantit
// le miroir chat + WhatsApp + trace + dedup.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pushSyncedEvent } from "../_shared/waouh-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";
const WAOUH_OPS_WHATSAPP = Deno.env.get("WAOUH_OPS_WHATSAPP") || "";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

function wahaHeaders() {
  return {
    "Content-Type": "application/json",
    ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
  };
}

async function sendWhatsApp(chatId: string, text: string, photoUrl?: string | null) {
  if (!WAHA_BASE_URL) return { ok: false, skipped: "WAHA_BASE_URL missing" };
  const base = WAHA_BASE_URL.replace(/\/$/, "");
  try {
    if (photoUrl) {
      const r = await fetch(`${base}/api/sendImage`, {
        method: "POST",
        headers: wahaHeaders(),
        body: JSON.stringify({ session: WAHA_SESSION, chatId, file: { url: photoUrl }, caption: text }),
      });
      if (!r.ok) {
        await fetch(`${base}/api/sendText`, {
          method: "POST", headers: wahaHeaders(),
          body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
        });
      }
    } else {
      await fetch(`${base}/api/sendText`, {
        method: "POST", headers: wahaHeaders(),
        body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function buildSellerText(title: string, amount: number) {
  return (
    `🎉 *Vente conclue !*\n` +
    `📦 ${title}\n` +
    `💰 ${fmt(amount)}\n\n` +
    `🛵 Un *livreur WAOUH* vous contactera dans quelques minutes au numéro associé à ce compte pour convenir de la collecte du colis.\n\n` +
    `🔒 *Confidentialité* : pour votre sécurité, le contact de l'acheteur n'est pas partagé. WAOUH coordonne la livraison.\n\n` +
    `⏱️ Préparez le colis dès maintenant.\n\n` +
    `— WAOUH ✨`
  );
}

function buildBuyerText(title: string, amount: number) {
  return (
    `🎉 *Achat confirmé !*\n` +
    `📦 ${title}\n` +
    `💰 ${fmt(amount)}\n\n` +
    `🛵 Un *livreur WAOUH* a été assigné. Vous recevrez sous peu une notification avec le *délai estimé de livraison*.\n` +
    `💵 *Paiement à la livraison* (cash ou Mobile Money au livreur).\n\n` +
    `🔒 Le contact du vendeur n'est pas partagé : WAOUH s'occupe de tout.\n\n` +
    `— WAOUH ✨`
  );
}

function buildOpsText(deal: any, article: any, buyer: any, seller: any) {
  const distancePart = deal.distance_km != null ? ` — 📍 ${deal.distance_km} km` : "";
  return (
    `🆕 *Nouveau deal #${String(deal.id).slice(0, 8)}*\n` +
    `📦 ${article?.title || "—"}\n` +
    `💰 ${fmt(Number(deal.amount || 0))}${distancePart}\n\n` +
    `👤 *Vendeur* : ${seller?.display_name || "—"}\n` +
    `   📞 ${seller?.phone_number || "—"}\n` +
    `   📍 ${seller?.city || "—"}\n\n` +
    `🛒 *Acheteur* : ${buyer?.display_name || "—"}\n` +
    `   📞 ${buyer?.phone_number || "—"}\n` +
    `   📍 ${buyer?.city || "—"}\n\n` +
    `▶️ Assigner un livreur depuis le dashboard WAOUH.`
  );
}

async function insertInAppNotif(
  sb: any,
  userId: string,
  articleId: string | null,
  kind: string,
  text: string,
  photos: string[],
  payload: any,
) {
  // Résout web_session_id pour permettre l'affichage in-app sans auth
  let webSession: string | null = null;
  try {
    const { data: u } = await sb
      .from("waouh_users")
      .select("web_session_id")
      .eq("id", userId)
      .maybeSingle();
    webSession = u?.web_session_id ?? null;
  } catch {}

  const dedupeKey = `${kind}:${payload?.deal_id || articleId || userId}:${userId}`;
  const { error } = await sb.from("waouh_notifications").insert({
    user_id: userId,
    article_id: articleId,
    notification_type: kind,
    photos,
    web_session_id: webSession,
    dedupe_key: dedupeKey,
    payload: { ...payload, text },
    channel: "waouh_app",
    delivery_status: "delivered",
    delivered_at: new Date().toISOString(),
  });
  if (error && (error as any).code !== "23505") {
    console.error("[waouh-deal-dispatch] notif insert error", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { deal_id } = await req.json();
    if (!deal_id) {
      return new Response(JSON.stringify({ error: "deal_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: deal } = await sb.from("waouh_deals").select("*").eq("id", deal_id).maybeSingle();
    if (!deal) {
      return new Response(JSON.stringify({ error: "deal not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: buyer }, { data: seller }, { data: article }] = await Promise.all([
      sb.from("waouh_users").select("id, display_name, phone_number, city, web_session_id, auth_user_id").eq("id", deal.buyer_user_id).maybeSingle(),
      sb.from("waouh_users").select("id, display_name, phone_number, city, web_session_id, auth_user_id").eq("id", deal.seller_user_id).maybeSingle(),
      sb.from("waouh_articles").select("id, title, photos").eq("id", deal.article_id).maybeSingle(),
    ]);

    // Distance live (optionnelle, on lit la valeur stockée si présente ou via RPC)
    let distanceKm: number | null = null;
    try {
      const { data } = await sb.rpc("waouh_user_pair_distance_km", {
        p_user_a: deal.buyer_user_id,
        p_user_b: deal.seller_user_id,
      });
      if (typeof data === "number") distanceKm = Math.round(data * 10) / 10;
    } catch {}

    const title = article?.title || "votre article";
    const amount = Number(deal.amount || 0);
    const photos: string[] = Array.isArray((article as any)?.photos)
      ? (article as any).photos.filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u))
      : [];
    const firstPhoto = photos[0] || null;

    const sellerText = buildSellerText(title, amount);
    const buyerText = buildBuyerText(title, amount);
    const opsText = buildOpsText({ ...deal, distance_km: distanceKm }, article, buyer, seller);

    const results: Record<string, any> = {};

    // Build attachments[] for both parties (photos with type/caption).
    const attachments = photos.slice(0, 4).map((url: string, k: number) => ({
      url, type: "image/jpeg",
      caption: `${title}${photos.length > 1 ? ` — photo ${k + 1}/${photos.length}` : ""}`,
    }));

    // 1) Vendeur — sync chat + WhatsApp (résolution multi-sources : chat / partenaire / radar IA)
    if (seller?.id) {
      try {
        results.seller_sync = await pushSyncedEvent({
          sb,
          user: seller as any,
          role: "seller",
          articleId: deal.article_id,
          text: sellerText,
          intent: "deal_dispatch",
          template: "deal_seller",
          eventType: "deal_dispatch",
          dealId: deal_id,
          attachments,
          imageUrl: firstPhoto,
          dedupSuffix: "seller",
          payloadExtra: { deal_id, article_id: deal.article_id, role: "seller" },
        });
      } catch (e) { results.seller_sync = { ok: false, error: String(e) }; }
    }
    await insertInAppNotif(sb, deal.seller_user_id, deal.article_id, "deal_seller", sellerText, photos, {
      deal_id, article_id: deal.article_id, role: "seller",
    });

    // 2) Acheteur — sync chat + WhatsApp (résolution multi-sources)
    if (buyer?.id) {
      try {
        results.buyer_sync = await pushSyncedEvent({
          sb,
          user: buyer as any,
          role: "buyer",
          articleId: deal.article_id,
          text: buyerText,
          intent: "deal_dispatch",
          template: "deal_buyer",
          eventType: "deal_dispatch",
          dealId: deal_id,
          attachments,
          imageUrl: firstPhoto,
          dedupSuffix: "buyer",
          payloadExtra: { deal_id, article_id: deal.article_id, role: "buyer" },
        });
      } catch (e) { results.buyer_sync = { ok: false, error: String(e) }; }
    }
    await insertInAppNotif(sb, deal.buyer_user_id, deal.article_id, "deal_buyer", buyerText, photos, {
      deal_id, article_id: deal.article_id, role: "buyer",
    });

    // 3) Équipe ops WAOUH — WhatsApp uniquement (le numéro vient d'un secret)
    if (WAOUH_OPS_WHATSAPP) {
      results.ops_wa = await sendWhatsApp(`${WAOUH_OPS_WHATSAPP}@c.us`, opsText, firstPhoto);
    } else {
      results.ops_wa = { ok: false, skipped: "WAOUH_OPS_WHATSAPP not configured" };
    }

    return new Response(JSON.stringify({
      success: true,
      deal_id,
      distance_km: distanceKm,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-deal-dispatch] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
