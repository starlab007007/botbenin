// WAOUH Radar Process — pour chaque signal extrait : update profile, match avec buyer_profiles, notify
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISPATCH_URL = `${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`;

function normalizeBeninPhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("229")) return digits;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `229${digits}`;
  return digits.length > 8 ? digits : null;
}

async function ensureRadarUser(sb: any, sig: any) {
  const phone = normalizeBeninPhone(sig.contact_phone);
  if (phone) {
    const { data: existing } = await sb.from("waouh_users").select("id").eq("phone_number", phone).maybeSingle();
    if (existing?.id) return existing.id;
  }
  const { data: created } = await sb.from("waouh_users").insert({
    phone_number: phone,
    display_name: sig.contact_handle || "Contact Radar IA",
    channel: "whatsapp",
    city: sig.city,
  }).select("id").single();
  return created?.id ?? null;
}

async function promoteSignal(sb: any, sig: any) {
  const userId = sig.waouh_user_id || await ensureRadarUser(sb, sig);
  if (!userId) return null;
  const title = sig.product?.title || sig.product?.name || String(sig.raw_text || "Annonce Radar IA").slice(0, 120);
  const category = sig.category || sig.product?.category || "autre";
  if (sig.intent === "SELL" && !sig.promoted_article_id) {
    const { data: existing } = await sb.from("waouh_articles").select("id").eq("origin_signal_id", sig.id).maybeSingle();
    if (existing?.id) return { kind: "article", id: existing.id };
    const { data: art } = await sb.from("waouh_articles").insert({
      seller_id: userId,
      title,
      description: sig.raw_text,
      category,
      price: Number(sig.price || 0),
      currency: "XOF",
      city: sig.city,
      status: "active",
      origin: "radar",
      origin_signal_id: sig.id,
    }).select("id").single();
    if (art?.id) await sb.from("waouh_radar_signals").update({ promoted_article_id: art.id, waouh_user_id: userId }).eq("id", sig.id);
    return { kind: "article", id: art?.id ?? null };
  }
  if (sig.intent === "BUY" && !sig.promoted_buyer_profile_id) {
    const { data: buyer } = await sb.from("waouh_buyer_profiles").insert({
      user_id: userId,
      query_text: sig.raw_text || title,
      category,
      keywords: [title, category].filter(Boolean),
      price_max: sig.price,
      is_active: true,
      origin: "radar",
      origin_signal_id: sig.id,
    }).select("id").single();
    if (buyer?.id) await sb.from("waouh_radar_signals").update({ promoted_buyer_profile_id: buyer.id, waouh_user_id: userId }).eq("id", sig.id);
    return { kind: "buyer_profile", id: buyer?.id ?? null };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { limit = 50 } = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const { data: signals } = await sb
      .from("waouh_radar_signals")
      .select("*")
      .eq("status", "extracted")
      .order("captured_at", { ascending: true })
      .limit(limit);

    if (!signals || signals.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let matched = 0, notified = 0, promoted = 0, queued = 0;

    for (const sig of signals) {
      // 1) Upsert radar profile
      const normalizedPhone = normalizeBeninPhone(sig.contact_phone);
      const promotedSignal = await promoteSignal(sb, sig);
      if (promotedSignal?.id) promoted++;
      if (normalizedPhone) {
        const { data: prof } = await sb.from("waouh_radar_profiles").select("*").eq("contact_phone", normalizedPhone).maybeSingle();
        if (prof) {
          await sb.from("waouh_radar_profiles").update({
            signals_count: (prof.signals_count || 0) + 1,
            last_seen_at: new Date().toISOString(),
            categories: Array.from(new Set([...(prof.categories || []), sig.category].filter(Boolean))),
            cities: Array.from(new Set([...(prof.cities || []), sig.city].filter(Boolean))),
            role: prof.role === "unknown" ? (sig.intent === "SELL" ? "seller" : sig.intent === "BUY" ? "buyer" : "unknown") :
                  (prof.role === "seller" && sig.intent === "BUY") || (prof.role === "buyer" && sig.intent === "SELL") ? "both" : prof.role,
          }).eq("id", prof.id);
        } else {
          await sb.from("waouh_radar_profiles").insert({
            contact_phone: normalizedPhone,
            contact_handle: sig.contact_handle,
            display_name: sig.contact_handle,
            role: sig.intent === "SELL" ? "seller" : sig.intent === "BUY" ? "buyer" : "unknown",
            categories: sig.category ? [sig.category] : [],
            cities: sig.city ? [sig.city] : [],
            signals_count: 1,
            last_seen_at: new Date().toISOString(),
          });
        }
      }

      // 2) Match with WAOUH buyer_profiles if SELL signal
      if (sig.intent === "SELL" && sig.category) {
        const { data: buyers } = await sb
          .from("waouh_buyer_profiles")
          .select("id, user_id, category, keywords, price_max, price_min, notified_article_ids")
          .eq("is_active", true);

        for (const b of buyers || []) {
          let score = 0;
          if (b.category && sig.category && b.category.toLowerCase() === String(sig.category).toLowerCase()) score += 0.5;
          const text = `${sig.product?.title || ""} ${sig.raw_text || ""}`.toLowerCase();
          if (b.keywords?.length) {
            const hits = b.keywords.filter((k: string) => text.includes(k.toLowerCase())).length;
            score += Math.min(0.4, hits * 0.15);
          }
          if (sig.price && b.price_max && Number(sig.price) <= Number(b.price_max)) score += 0.1;
          if (score < 0.5) continue;

          // Check not already notified
          const { data: existing } = await sb.from("waouh_radar_matches").select("id").eq("signal_id", sig.id).eq("target_buyer_profile_id", b.id).maybeSingle();
          if (existing) continue;

          const { data: m } = await sb.from("waouh_radar_matches").insert({
            signal_id: sig.id,
            target_user_id: b.user_id,
            target_buyer_profile_id: b.id,
            score,
            notification_channel: "in_app",
            notified_at: new Date().toISOString(),
          }).select().single();
          matched++;

          // Insert in-app notification + push to WAOUH chat bus (cloche + message direct)
          if (b.user_id) {
            const title = `🎯 Annonce détectée : ${sig.product?.title || sig.category}`;
            const body = `${sig.price ? Number(sig.price).toLocaleString("fr-FR") + " FCFA" : "Prix non précisé"} · ${sig.city || "?"} · source: ${sig.source_type}`;
            await sb.from("waouh_notifications").insert({
              user_id: b.user_id,
              notification_type: "radar_match",
              title, body,
              meta: { signal_id: sig.id, raw_url: sig.raw_url, match_id: m?.id },
            });

            // Look up WAOUH user (web_session_id / phone) to push into chatbot bus
            const { data: wu } = await sb.from("waouh_users")
              .select("id, phone_number, web_session_id")
              .eq("auth_user_id", b.user_id).maybeSingle();
            if (wu) {
              const directText = `🎯 *Annonce détectée par le Radar IA*\n${title}\n${body}\n${sig.raw_url ? `🔗 ${sig.raw_url}\n` : ""}Répondez « intéressé » pour entrer en contact.`;
              let msgId: string | null = null;
              if (wu.web_session_id) {
                const { data: msg } = await sb.from("waouh_messages").insert({
                  user_id: wu.id, channel: "web", direction: "out",
                  text: directText, web_session_id: wu.web_session_id,
                  attachments: sig.product?.image_url ? [{ url: sig.product.image_url, type: "image/jpeg" }] : [],
                  meta: { intent: "RADAR_MATCH", signal_id: sig.id, match_id: m?.id },
                }).select("id").maybeSingle();
                msgId = msg?.id ?? null;
              }
              try {
            const { error: enqueueErr } = await sb.rpc("waouh_enqueue_outbound_v2", {
                  p_to_phone: wu.phone_number,
                  p_to_user_id: wu.id,
                  p_template: "match_buyer",
                  p_payload: { title: sig.product?.title || sig.category, price: sig.price, city: sig.city, signal_id: sig.id, match_id: m?.id, message_id: msgId },
                  p_web_session_id: wu.web_session_id,
                  p_image_url: sig.product?.image_url ?? null,
                  p_channel: wu.phone_number ? "whatsapp" : "web",
                  p_message_id: msgId,
                  p_transaction_id: null,
                });
            if (!enqueueErr) queued++;
              } catch (e) { console.warn("[radar-process] enqueue", e); }
            }
            notified++;
          }
      if (normalizedPhone) {
        try {
          const title = sig.product?.title || sig.product?.name || sig.category || "votre annonce";
          const template = sig.intent === "SELL" ? "radar_seller_outreach" : "radar_buyer_outreach";
          const text = sig.intent === "SELL"
            ? `👋 Bonjour ! WAOUH a détecté votre annonce "${title}". Répondez « OUI » pour recevoir des acheteurs et négocier avec paiement sécurisé.`
            : `👋 Bonjour ! WAOUH a détecté votre besoin "${title}". Répondez « OUI » pour recevoir des annonces fiables et payer en escrow sécurisé.`;
          const { data: recent } = await sb.from("waouh_outbound_queue")
            .select("id").eq("to_phone", normalizedPhone).eq("template", template)
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(1).maybeSingle();
          if (!recent) {
            const { error: outErr } = await sb.rpc("waouh_enqueue_outbound_v2", {
              p_to_phone: normalizedPhone,
              p_to_user_id: null,
              p_template: template,
              p_payload: { text, signal_id: sig.id, source_url: sig.raw_url, promoted_id: promotedSignal?.id ?? null },
              p_image_url: sig.product?.image_url ?? null,
              p_channel: "whatsapp",
            });
            if (!outErr) queued++;
          }
        } catch (e) { console.warn("[radar-process] direct outreach", e); }
      }
        }
      }

      await sb.from("waouh_radar_signals").update({ status: "notified" }).eq("id", sig.id);
    }

    fetch(DISPATCH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 50 }),
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, processed: signals.length, promoted, matched, notified, queued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-radar-process]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
