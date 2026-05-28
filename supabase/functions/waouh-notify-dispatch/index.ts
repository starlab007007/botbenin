// waouh-notify-dispatch
// Unified notification dispatcher for the WAOUH cycle.
// Always carries the same photos[] across channels (WhatsApp + in-app),
// and resolves the right contact (WhatsApp / waouh_app / partner / radar_ia).
//
// Input:
//   {
//     kind: 'match' | 'new_buyer' | 'sale_published',
//     article_id: string,                  // required
//     buyer_profile_id?: string,           // required for 'match' / 'new_buyer'
//     recipient: 'seller' | 'buyer',       // who to notify
//     extra_text?: string,                 // optional override
//   }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { resolveContact, normalizeBeninPhone } from "../_shared/waouhContact.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";

function wahaHeaders() {
  return { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) };
}

async function sendWhatsAppCard(chatId: string, text: string, photos: string[]) {
  if (!WAHA_BASE_URL) return { ok: false, status: 0, error: "WAHA_BASE_URL missing" };
  const base = WAHA_BASE_URL.replace(/\/$/, "");
  const first = photos[0];
  try {
    if (first) {
      const r = await fetch(`${base}/api/sendImage`, {
        method: "POST",
        headers: wahaHeaders(),
        body: JSON.stringify({ session: WAHA_SESSION, chatId, file: { url: first }, caption: text }),
      });
      if (!r.ok) {
        // Fallback: text only
        await fetch(`${base}/api/sendText`, {
          method: "POST", headers: wahaHeaders(),
          body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
        });
      }
      // Send remaining photos as plain images (no caption)
      for (const p of photos.slice(1, 4)) {
        await fetch(`${base}/api/sendImage`, {
          method: "POST", headers: wahaHeaders(),
          body: JSON.stringify({ session: WAHA_SESSION, chatId, file: { url: p }, caption: "" }),
        }).catch(() => {});
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

function buildText(kind: string, article: any, buyerProfile: any, recipient: string) {
  const price = article?.price ? `${Number(article.price).toLocaleString("fr-FR")} FCFA` : "";
  const city = article?.city ? ` · ${article.city}` : "";
  if (kind === "match" && recipient === "buyer") {
    return `🎯 Nouvelle annonce qui correspond à votre recherche !\n\n📦 ${article.title}\n💰 ${price}${city}\n\nRépondez ACHETER pour être mis en relation.`;
  }
  if (kind === "new_buyer" && recipient === "seller") {
    return `🛒 Nouvel acheteur intéressé par votre annonce !\n\n📦 ${article.title}\n💰 ${price}${city}\n\nRépondez CONTACT pour échanger.`;
  }
  if (kind === "sale_published" && recipient === "seller") {
    return `✅ Annonce publiée avec succès !\n\n📦 ${article.title}\n💰 ${price}${city}\n⏱️ Valable 7 jours`;
  }
  return `📢 ${article.title} — ${price}${city}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { kind, article_id, buyer_profile_id, recipient, extra_text } = body || {};
    if (!kind || !article_id || !recipient) {
      return new Response(JSON.stringify({ error: "kind, article_id and recipient are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE);

    const { data: article } = await sb.from("waouh_articles").select("*").eq("id", article_id).maybeSingle();
    if (!article) {
      return new Response(JSON.stringify({ error: "article not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let buyerProfile: any = null;
    if (buyer_profile_id) {
      const { data } = await sb.from("waouh_buyer_profiles").select("*").eq("id", buyer_profile_id).maybeSingle();
      buyerProfile = data;
    }

    const target = recipient === "seller"
      ? await resolveContact(sb, article, { kind: "seller" })
      : await resolveContact(sb, buyerProfile || {}, { kind: "buyer" });

    const photos: string[] = Array.isArray(article.photos) ? article.photos.filter(Boolean) : [];
    const text = extra_text || buildText(kind, article, buyerProfile, recipient);

    // Always create an in-app notification record (used both for WAOUH App users
    // and for delivery tracking when channel is WhatsApp/partner).
    const notifTargetUserId = recipient === "seller" ? article.seller_id : buyerProfile?.user_id ?? target.waouhUserId;

    let waResult: any = { ok: false, skipped: true };
    let channelUsed = target.channel;

    if ((target.channel === "whatsapp" || target.channel === "partner" || target.channel === "radar_ia") && target.whatsapp) {
      const chatId = `${target.whatsapp}@c.us`;
      waResult = await sendWhatsAppCard(chatId, text, photos);
      channelUsed = target.channel;
    } else {
      channelUsed = "waouh_app";
    }

    // Insert notification row (in-app card carries the same photos[])
    if (notifTargetUserId) {
      await sb.from("waouh_notifications").insert({
        user_id: notifTargetUserId,
        article_id,
        notification_type: kind,
        photos,
        payload: {
          text,
          recipient,
          buyer_profile_id: buyer_profile_id ?? null,
          contact: { channel: target.channel, whatsapp: target.whatsapp, partner_id: target.partnerId },
        },
        channel: channelUsed,
        delivered_at: waResult?.ok ? new Date().toISOString() : null,
        delivery_status: waResult?.ok ? "delivered" : (waResult?.skipped ? "queued" : "failed"),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      channel: channelUsed,
      whatsapp: target.whatsapp,
      waouh_user_id: target.waouhUserId,
      partner_id: target.partnerId,
      photos_count: photos.length,
      wa_result: waResult,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[waouh-notify-dispatch] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
