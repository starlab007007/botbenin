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
import {
  buildSellerNewBuyerText,
  buildBuyerMatchText,
  distanceKm,
} from "../_shared/waouh-format.ts";
import { pushSyncedEvent } from "../_shared/waouh-sync.ts";
import { promoteCatalogToArticle } from "../_shared/waouh-promote.ts";

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
  // Distance best-effort (null si coords manquantes)
  const dKm = distanceKm(
    article?.lat ?? article?.latitude ?? null,
    article?.lng ?? article?.longitude ?? null,
    buyerProfile?.lat ?? buyerProfile?.latitude ?? null,
    buyerProfile?.lng ?? buyerProfile?.longitude ?? null,
  );
  if (kind === "match" && recipient === "buyer") {
    return buildBuyerMatchText({ article, distanceKmValue: dKm });
  }
  if (kind === "new_buyer" && recipient === "seller") {
    return buildSellerNewBuyerText({
      article,
      buyerCity: buyerProfile?.city ?? null,
      distanceKmValue: dKm,
    });
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
    let { kind, article_id, catalog_id, buyer_profile_id, recipient, extra_text } = body || {};
    if (!kind || !recipient || (!article_id && !catalog_id)) {
      return new Response(JSON.stringify({ error: "kind, recipient and article_id|catalog_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE);

    // 🆕 Tunnel partenaire : promouvoir catalog → article si nécessaire
    if (!article_id && catalog_id) {
      const { promoteCatalogToArticle } = await import("../_shared/waouh-promote.ts");
      const promo = await promoteCatalogToArticle(sb, catalog_id);
      if (!promo.article_id) {
        return new Response(JSON.stringify({ error: "catalog promotion failed", details: promo.reason }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      article_id = promo.article_id;
    }

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
    let notifTargetUserId = recipient === "seller" ? article.seller_id : buyerProfile?.user_id ?? target.waouhUserId;

    // Fallback: if no user resolved but we have a WhatsApp number, upsert a
    // waouh_users row so the in-app notification always lands.
    if (!notifTargetUserId && target.whatsapp) {
      try {
        const { data: existing } = await sb
          .from("waouh_users")
          .select("id")
          .eq("phone_number", target.whatsapp)
          .maybeSingle();
        if (existing?.id) {
          notifTargetUserId = existing.id;
        } else {
          const { data: created } = await sb
            .from("waouh_users")
            .insert({ phone_number: target.whatsapp })
            .select("id")
            .maybeSingle();
          notifTargetUserId = created?.id ?? null;
        }
      } catch (e) {
        console.warn("[waouh-notify-dispatch] fallback user upsert failed", e);
      }
    }


    // Anti self-notification guard: never send a buyer-side notif to the seller (or vice versa)
    if (
      notifTargetUserId &&
      article.seller_id &&
      ((recipient === "buyer" && notifTargetUserId === article.seller_id) ||
        (recipient === "seller" && buyerProfile?.user_id && buyerProfile.user_id === article.seller_id))
    ) {
      console.log("[waouh-notify-dispatch] self-notification blocked", { recipient, notifTargetUserId, seller_id: article.seller_id });
      return new Response(JSON.stringify({ success: true, skipped: "self_notification" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let waResult: any = { ok: false, skipped: true };
    let channelUsed = target.channel;

    const skipWhatsapp = !!body.skip_whatsapp;
    if (!skipWhatsapp && (target.channel === "whatsapp" || target.channel === "partner" || target.channel === "radar_ia") && target.whatsapp) {
      // 🔁 Unifié : passe par la queue (waouh_enqueue_outbound_v2 → waouh-outbound-dispatch)
      // au lieu d'un appel direct WAHA. Évite les doublons avec waouh-webhook et
      // garantit la même dédup / le même tracking que les autres évènements.
      try {
        const dayBucket = new Date().toISOString().slice(0, 10);
        const dedupeKey = `notify:${kind}:${article_id}:${target.whatsapp}:${recipient}:${dayBucket}${buyer_profile_id ? `:${buyer_profile_id}` : ""}`;
        const { error: enqErr } = await sb.rpc("waouh_enqueue_outbound_v2", {
          p_to_phone: target.whatsapp,
          p_to_user_id: notifTargetUserId,
          p_template: kind,
          p_payload: {
            text,
            actions: [],
            article_id,
            recipient,
            photos,
            buyer_profile_id: buyer_profile_id ?? null,
          },
          p_web_session_id: null,
          p_image_url: photos?.[0] ?? null,
          p_channel: "whatsapp",
          p_dedupe_key: dedupeKey,
          p_event_type: kind,
        });
        if (enqErr) {
          waResult = { ok: false, error: String(enqErr.message || enqErr) };
        } else {
          waResult = { ok: true, queued: true };
          // Fire-and-forget worker trigger
          fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
            method: "POST",
            headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
            body: JSON.stringify({ limit: 20 }),
          }).catch(() => {});
        }
      } catch (e) {
        waResult = { ok: false, error: String(e) };
      }
      channelUsed = target.channel;
    } else if (skipWhatsapp) {
      // Caller already delivered via WhatsApp (e.g. inline reply) — just log the in-app row.
      channelUsed = target.channel === "whatsapp" ? "whatsapp" : "waouh_app";
      waResult = { ok: true, skipped: true, reason: "skip_whatsapp" };
    } else {
      channelUsed = "waouh_app";
    }

    // Insert notification row (in-app card carries the same photos[])
    if (notifTargetUserId) {
      // Resolve a web_session_id so the app can pull this notif without auth
      let notifSession: string | null = null;
      try {
        const { data: u } = await sb
          .from("waouh_users")
          .select("web_session_id")
          .eq("id", notifTargetUserId)
          .maybeSingle();
        notifSession = u?.web_session_id ?? null;
      } catch {}

      // Dedupe key: 1 notif per (kind, article, recipient, day) to prevent twin emissions
      const dayBucket = new Date().toISOString().slice(0, 10);
      const dedupeKey = `${kind}:${article_id}:${notifTargetUserId}:${recipient}:${dayBucket}${buyer_profile_id ? `:${buyer_profile_id}` : ""}`;

      const { error: notifErr } = await sb.from("waouh_notifications").insert({
        user_id: notifTargetUserId,
        article_id,
        notification_type: kind,
        photos,
        web_session_id: notifSession,
        dedupe_key: dedupeKey,
        payload: {
          text,
          recipient,
          buyer_profile_id: buyer_profile_id ?? null,
          article_id,
          photos,
          contact: { channel: target.channel, whatsapp: target.whatsapp, partner_id: target.partnerId },
        },
        channel: channelUsed,
        delivered_at: waResult?.ok ? new Date().toISOString() : null,
        delivery_status: waResult?.ok ? "delivered" : (waResult?.skipped ? "queued" : "failed"),
      });
      if (notifErr) {
        // Duplicate (23505) is silently ignored — means same event already dispatched
        if ((notifErr as any).code === "23505" || /duplicate/i.test((notifErr as any).message || "")) {
          console.log("[waouh-notify-dispatch] dedup hit", dedupeKey);
        } else {
          console.error("[waouh-notify-dispatch] notif insert error", notifErr);
        }
      }
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
