import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import {
  normalizeBeninPhone,
  resolveWaouhUserByPhone,
  ensureWaouhVendorStub,
  beninPhoneCandidates,
} from "../_shared/waouh-phone.ts";
import { promoteCatalogToArticle } from "../_shared/waouh-promote.ts";
import { resolveSiblingUserIds, siblingOrFilter } from "../_shared/waouh-identity.ts";
import { findRadarOutreachContext, findRadarSellerOutreachContext } from "../_shared/waouh-radar.ts";
import { geminiJson, geminiText } from "../_shared/gemini.ts";
import { isCompleteSmartSale, parseSmartSale } from "../_shared/waouh-smart-sale.ts";
import { bindThreadState, resolveProductThread, resolveSearchThread } from "../_shared/waouh-thread.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeCategory(value: string | null | undefined) {
  const v = String(value || "").toLowerCase();
  if (/t[ée]l[ée]phone|smartphone|iphone|android/.test(v)) return "smartphone";
  if (/ordinateur|pc|laptop|macbook/.test(v)) return "ordinateur";
  if (/v[êe]tement|tissu|chaussure|mode|habit/.test(v)) return "vetement";
  if (/voiture|moto|v[ée]hicule|auto/.test(v)) return "vehicule";
  if (/frigo|cong[ée]lateur|machine|[ée]lectrom[ée]nager/.test(v)) return "electromenager";
  if (/maison|logement|immobilier|location|terrain|chambre|salon|meuble/.test(v)) return "meuble";
  return "autre";
}

function extractProductPhotos(source: any): string[] {
  const p = source?.product || source || {};
  const raw = [p.image_url, p.image, p.thumbnail_url, ...(Array.isArray(p.images) ? p.images : []), ...(Array.isArray(p.photos) ? p.photos : [])];
  return [...new Set(raw.filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u)))].slice(0, 6);
}

/**
 * Pour un produit issu du catalogue unifié, résout le numéro WhatsApp du vendeur
 * ET les sessions web du compte ayant enregistré l'entreprise (partner).
 * Source partner   → cherche dans le produit puis dans waouh_partner_businesses,
 *                    puis remonte vers waouh_partners.user_id pour trouver toutes
 *                    les waouh_users (web_session_id) liées à ce auth user.
 * Source radar     → utilise le contact_phone scrapé (déjà sur le pick).
 */
async function resolveVendorContacts(sb: any, pick: any): Promise<{ phone: string | null; phones: string[]; owner_auth_user_id: string | null; web_sessions: Array<{ user_id: string; web_session_id: string }> }> {
  // Priorité de routage : on garde UN SEUL numéro par identité destinataire.
  // Sinon un vendeur App qui a aussi un compte partner reçoit la même notif
  // 2× (cas Bug 1 du scénario B). Ordre : whatsapp business > seller direct
  // > partner > téléphones secondaires (mobile money / contact_phone).
  const candidates: Array<{ raw: string | null | undefined; rank: number }> = [
    { raw: pick?.vendeur_whatsapp, rank: 1 },
    { raw: pick?.contact_whatsapp, rank: 1 },
    { raw: pick?.vendeur_phone,    rank: 3 },
    { raw: pick?.contact_phone,    rank: 3 },
    { raw: pick?.vendeur_mobile_money, rank: 4 },
  ];
  let ownerAuthId: string | null = null;
  if (pick?.business_id) {
    const { data: biz } = await sb.from("waouh_partner_businesses")
      .select("whatsapp, telephone, mobile_money_number, partner_id")
      .eq("id", pick.business_id).maybeSingle();
    if (biz) {
      candidates.push({ raw: biz.whatsapp, rank: 1 });
      candidates.push({ raw: biz.telephone, rank: 3 });
      candidates.push({ raw: biz.mobile_money_number, rank: 4 });
      if (biz.partner_id) {
        const { data: partner } = await sb.from("waouh_partners")
          .select("user_id, whatsapp, telephone, mobile_money_number")
          .eq("id", biz.partner_id).maybeSingle();
        if (partner) {
          ownerAuthId = partner.user_id || null;
          candidates.push({ raw: partner.whatsapp, rank: 2 });
          candidates.push({ raw: partner.telephone, rank: 3 });
          candidates.push({ raw: partner.mobile_money_number, rank: 4 });
        }
      }
    }
  }
  // Normalise, dédoublonne par numéro canonique, garde l'ordre de priorité.
  const seenPhone = new Set<string>();
  const ranked: Array<{ phone: string; rank: number }> = [];
  for (const c of candidates) {
    const canon = normalizeBeninPhone(c.raw);
    if (canon && !seenPhone.has(canon)) {
      seenPhone.add(canon);
      ranked.push({ phone: canon, rank: c.rank });
    }
  }
  ranked.sort((a, b) => a.rank - b.rank);

  // 🔒 Bug 1 fix — Dédup par IDENTITÉ destinataire (waouh_users.id /
  // auth_user_id). Si plusieurs numéros mènent au même utilisateur WAOUH,
  // on ne garde que le numéro le mieux classé pour éviter les notifs doublons.
  const seenUserKey = new Set<string>();
  const phones: string[] = [];
  for (const r of ranked) {
    try {
      const cand = beninPhoneCandidates(r.phone);
      const { data: u } = cand.length
        ? await sb.from("waouh_users")
            .select("id, auth_user_id")
            .in("phone_number", cand)
            .limit(1)
            .maybeSingle()
        : { data: null };
      const key = (u as any)?.auth_user_id || (u as any)?.id || `phone:${r.phone}`;
      if (seenUserKey.has(key)) continue;
      seenUserKey.add(key);
    } catch {
      if (seenUserKey.has(`phone:${r.phone}`)) continue;
      seenUserKey.add(`phone:${r.phone}`);
    }
    phones.push(r.phone);
  }

  let webSessions: Array<{ user_id: string; web_session_id: string }> = [];
  if (ownerAuthId) {
    const { data: rows } = await sb.from("waouh_users")
      .select("id, web_session_id")
      .eq("auth_user_id", ownerAuthId)
      .not("web_session_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(20);
    const seenWs = new Set<string>();
    for (const r of (rows || [])) {
      if (!r.web_session_id || seenWs.has(r.web_session_id)) continue;
      seenWs.add(r.web_session_id);
      webSessions.push({ user_id: r.id, web_session_id: r.web_session_id });
    }
  }
  return { phone: phones[0] || null, phones, owner_auth_user_id: ownerAuthId, web_sessions: webSessions };
}

/** Compat : ancien helper renvoyant uniquement le numéro brut. */
async function resolveVendorPhone(sb: any, pick: any): Promise<string | null> {
  const r = await resolveVendorContacts(sb, pick);
  return r.phone;
}

async function promoteRadarSeller(sb: any, sig: any, fallbackCategory = "autre") {
  if (sig.promoted_article_id) {
    const { data: art } = await sb.from("waouh_articles").select("id,title,price,seller_id,photos,market_price_min,market_price_max").eq("id", sig.promoted_article_id).maybeSingle();
    if (art) return art;
  }
  const phone = normalizeBeninPhone(sig.contact_phone || sig.raw_text || sig.contact_handle);
  let sellerId: string | null = sig.waouh_user_id || null;
  if (!sellerId) {
    const { data: existing } = phone ? await sb.from("waouh_users").select("id").eq("phone_number", phone).maybeSingle() : { data: null };
    sellerId = existing?.id ?? null;
  }
  if (!sellerId) {
    const { data: created } = await sb.from("waouh_users").insert({
      phone_number: phone,
      display_name: sig.contact_handle || "Vendeur Radar IA",
      channel: "whatsapp",
      city: sig.city,
    }).select("id").single();
    sellerId = created?.id ?? null;
  }
  if (!sellerId) return null;
  const title = sig.product?.title || sig.product?.name || String(sig.raw_text || "Annonce Radar IA").slice(0, 120);
  const price = Number(sig.price || sig.product?.price || 0);
  const photos = extractProductPhotos(sig);
  const { data: existingArticle } = await sb.from("waouh_articles").select("id,title,price,seller_id,photos,market_price_min,market_price_max").eq("origin_signal_id", sig.id).maybeSingle();
  if (existingArticle) return existingArticle;
  const { data: art, error } = await sb.from("waouh_articles").insert({
    seller_id: sellerId,
    title,
    description: sig.raw_text,
    category: normalizeCategory(sig.category || sig.product?.category || fallbackCategory),
    price,
    currency: "XOF",
    city: sig.city,
    photos,
    status: "active",
    origin: "radar",
    origin_signal_id: sig.id,
  }).select("id,title,price,seller_id,photos,market_price_min,market_price_max").single();
  if (error) { console.warn("[radar promote seller]", error); return null; }
  await sb.from("waouh_radar_signals").update({ promoted_article_id: art.id, waouh_user_id: sellerId, contact_phone: phone ?? sig.contact_phone, status: "notified" }).eq("id", sig.id);
  return art;
}

/**
 * Promeut une annonce SerpAPI (`waouh_external_listings`) en `waouh_articles`,
 * en créant un stub vendeur si besoin. Idempotent via `promoted_article_id`.
 */
async function promoteExternalListing(sb: any, ext: any, fallbackCategory = "autre") {
  if (!ext?.external_listing_id) return null;
  // Source-of-truth ré-lue pour idempotence concurrente
  const { data: row } = await sb.from("waouh_external_listings")
    .select("id,title,description,category,price,city,seller_phone,seller_name,image_url,source_url,promoted_article_id,seller_user_id")
    .eq("id", ext.external_listing_id).maybeSingle();
  if (!row) return null;
  if (row.promoted_article_id) {
    const { data: art } = await sb.from("waouh_articles")
      .select("id,title,price,seller_id,photos,market_price_min,market_price_max")
      .eq("id", row.promoted_article_id).maybeSingle();
    if (art) return art;
  }
  const phone = normalizeBeninPhone(row.seller_phone);
  let sellerId: string | null = row.seller_user_id || null;
  if (!sellerId && phone) {
    const { data: existing } = await sb.from("waouh_users").select("id").eq("phone_number", phone).maybeSingle();
    sellerId = existing?.id ?? null;
  }
  if (!sellerId) {
    const { data: created } = await sb.from("waouh_users").insert({
      phone_number: phone,
      display_name: row.seller_name || "Vendeur SerpAPI",
      channel: "whatsapp",
      city: row.city,
    }).select("id").single();
    sellerId = created?.id ?? null;
  }
  if (!sellerId) return null;
  const photos = [row.image_url].filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u));
  const { data: art, error } = await sb.from("waouh_articles").insert({
    seller_id: sellerId,
    title: row.title || "Annonce SerpAPI",
    description: row.description,
    category: normalizeCategory(row.category || fallbackCategory),
    price: Number(row.price || 0),
    currency: "XOF",
    city: row.city,
    photos,
    status: "active",
    origin: "radar",
    source_channel: "radar_ia",
    contact_whatsapp: phone,
  }).select("id,title,price,seller_id,photos,market_price_min,market_price_max").single();
  if (error) { console.warn("[promote external]", error); return null; }
  await sb.from("waouh_external_listings").update({
    promoted_article_id: art.id,
    seller_user_id: sellerId,
    status: "promoted",
  }).eq("id", row.id);
  return art;
}



async function ai(system: string, user: string, json = true): Promise<any> {
  if (json) return geminiJson(system, user, {});
  try { return await geminiText({ system, user }); } catch { return ""; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Meta WhatsApp verification (sprint 2)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (verifyToken && expected && verifyToken === expected) {
      return new Response(challenge ?? "", { headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();

    const phone = body.phone_number || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    const webSessionId = body.web_session_id || null;
    const text = body.text || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || "";
    const lat = typeof body.lat === "number" && Number.isFinite(body.lat) ? body.lat : null;
    const lng = typeof body.lng === "number" && Number.isFinite(body.lng) ? body.lng : null;
    const hasCurrentLocation = lat != null && lng != null;
    const city = body.city ?? "Cotonou";
    const channel = body.channel ?? (webSessionId ? "web" : "whatsapp");
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const clientMeta = body.meta && typeof body.meta === "object" ? body.meta : {};
    const passedUserId = body.user_id || null;

    if ((!phone && !webSessionId) || (!text && attachments.length === 0)) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find/upsert user (prefer passed id, then web_session_id, then phone)
    let user: any = null;
    if (passedUserId) {
      const { data } = await sb.from("waouh_users").select("*").eq("id", passedUserId).maybeSingle();
      user = data;
    }
    if (!user && webSessionId) {
      const { data } = await sb.from("waouh_users").select("*").eq("web_session_id", webSessionId).maybeSingle();
      user = data;
    }
    if (!user && phone && !phone.startsWith("web:")) {
      const { data } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle();
      user = data;
    }
    if (!user) {
      const { data: created } = await sb.from("waouh_users").insert({
        phone_number: phone && !phone.startsWith("web:") ? phone : null,
        web_session_id: webSessionId,
        channel, city,
        location: hasCurrentLocation ? `SRID=4326;POINT(${lng} ${lat})` as any : null,
      }).select().single();
      user = created;
    }
    if (user && hasCurrentLocation) {
      await sb.from("waouh_users").update({
        location: hasCurrentLocation ? `SRID=4326;POINT(${lng} ${lat})` as any : null,
        ...(city ? { city } : {}),
      }).eq("id", user.id);
      user.location = `SRID=4326;POINT(${lng} ${lat})`;
      if (city) user.city = city;
    }

    // Pré-détection règles déterministes (avant AI)
    const lower = (text || "").toLowerCase();
    // Tolérant aux fautes : intéressé / interesse / interressé / interesé / interrese …
    const INTEREST_RE = /\bint[eé]r{1,2}[eé]ss?[eé]?[se]?\b/i;
    const interestedKw = INTEREST_RE.test(lower)
      || /\b(je\s+veux|je\s+prends|d'accord|ok|oui|acheter|contacte|contact)\b/i.test(lower);
    // Numéro associé : #1, n°1, intéressé 1, choix 1, article 1
    const numFromMarker   = lower.match(/(?:n[°o]\s*|#)(\d{1,2})/i);
    const numFromInterest = INTEREST_RE.test(lower) ? lower.match(/\b(\d{1,2})\b/) : null;
    const numFromChoice   = lower.match(/(?:choix|article)\s*(\d{1,2})/i);
    const numMatch = numFromMarker || numFromInterest || numFromChoice;
    const payKw = /(payer|paiement|payement|momo|mobile money|j'ach[èe]te maintenant|\bje paye\b|\bje paie\b)/i.test(lower);
    const receivedKw = /(j.?ai\s+(bien\s+)?re[cç]u|re[cç]u\s+l.?article|livraison\s+re[cç]ue|confirmer\s+la\s+r[ée]ception)/i.test(lower);
    const sellKw = /\b(?:je\s+)?(?:vends?|vend|vendre|vente|publier|annonce)\b/i.test(lower);
    const buyKw = /\b(?:je\s+)?(?:cherche|recherche|besoin|acheter|ach[èe]te)\b/i.test(lower);
    const negotiateKw = /\b(?:n[ée]gocier|negocier|n[ée]gociation|marchander|proposer\s+un\s+prix)\b/i.test(lower);
    const operatorKw: "mtn" | "moov" | "sbin" | null =
      /\bmtn\b/i.test(lower) ? "mtn" :
      /\bmoov\b/i.test(lower) ? "moov" :
      /\bsbin\b/i.test(lower) ? "sbin" : null;
    const operatorOnlyPay = !!operatorKw && /^(mtn|moov|sbin)$/i.test(lower.trim());
    // Détection numéro Mobile Money (à exclure du parsing montant)
    const phoneCtx = /(num[ée]ro|num[ée]ro\s*:|num\b|tel|t[ée]l|whatsapp|momo|mtn|moov|mobile money)/i.test(lower);
    let paymentPhone: string | null = null;
    if (phoneCtx || payKw) {
      const phoneMatch = text.match(/(?:\+?229\s?)?\s*(0?\d(?:[\s.\-]?\d){7,12})/);
      if (phoneMatch) {
        const digits = phoneMatch[0].replace(/\D/g, "");
        if (digits.length >= 8) paymentPhone = digits;
      }
    }
    // N'extrait un montant QUE s'il est explicitement marqué FCFA/CFA ou précédé d'un mot d'offre
    const explicitOffer = lower.match(/(?:propose|offre|offre\s+de|prix|pour|à|a)\s*(\d{2,3}(?:[\s.,]?\d{3})+|\d{3,9})\s*(?:f|fcfa|cfa)?/i);
    const fcfaOffer = lower.match(/(\d{2,3}(?:[\s.,]?\d{3})+|\d{3,9})\s*(?:fcfa|cfa|f\s*cfa)\b/i);
    const offerMatch = (!payKw && (explicitOffer || fcfaOffer)) || null;

    // Charge la conversation existante AVANT la détection d'intent (utile pour le fallback contextuel "1" seul)
    const { data: conv } = await sb.from("waouh_conversations")
      .select("*")
      .eq("phone_number", phone || `web:${webSessionId}`)
      .maybeSingle();

    // 🛰️ v10 — Hydratation Radar IA → Scénario B.
    // Si un acheteur scrapé répond à un template `radar_buyer_outreach` sans
    // contexte article (nouvelle conversation WhatsApp), on reconstruit
    // last_matches + current_article_id depuis waouh_outbound_queue pour que
    // "OUI" déclenche CONFIRM index 1 et que la négo soit créée comme en B.
    let radarHydratedContext: any = (conv?.context as any) ?? {};
    let radarBuyerContext: { signal_id: string | null; hydrated_at: string } | null = null;

    // Un clic Radar sélectionne l'article exact. Il ne doit jamais relancer
    // une recherche libre susceptible de faire choisir un autre produit.
    const clientArticleId = clientMeta?.article_id || null;
    const clientRadarIntent = String(clientMeta?.radar_intent || "").toLowerCase();
    const clientAction = String(clientMeta?.action || clientMeta?.intent || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const clientSelectsArticle = Boolean(
      clientArticleId && (
        (clientRadarIntent && !clientRadarIntent.includes("propose")) ||
        clientAction === "interested" ||
        clientAction === "interesse"
      ),
    );
    if (clientSelectsArticle) {
      let directPick: any = null;
      const { data: article } = await sb.from("waouh_articles")
        .select("id,title,description,price,city,condition,category,seller_id,photos,market_price_min,market_price_max")
        .eq("id", clientArticleId).maybeSingle();
      if (article) {
        directPick = { ...article, source: "chat" };
      } else {
        const { data: catalog } = await sb.from("waouh_unified_catalog")
          .select("id,titre,description,categorie,prix_min,prix_max,ville,quartier,photos,vendeur_nom,vendeur_phone,vendeur_whatsapp")
          .eq("id", clientArticleId).maybeSingle();
        if (catalog) {
          directPick = {
            ...catalog,
            id: catalog.id,
            title: catalog.titre,
            price: Number(catalog.prix_min || catalog.prix_max || 0),
            city: catalog.ville,
            category: catalog.categorie,
            source: "partner",
          };
        }
      }
      if (directPick) {
        radarHydratedContext = {
          ...radarHydratedContext,
          last_matches: [directPick],
          current_article_id: null,
          radar_direct_selection: {
            item_id: clientMeta?.radar_item_id || null,
            article_id: clientArticleId,
            intent: clientRadarIntent,
            selected_at: new Date().toISOString(),
          },
        };
        if (conv) {
          (conv as any).context = radarHydratedContext;
          (conv as any).current_article_id = null;
          (conv as any).last_intent = "BUY";
        }
      }
    }
    if (
      channel === "whatsapp" &&
      phone &&
      !phone.startsWith("web:") &&
      !radarHydratedContext?.current_article_id &&
      !(Array.isArray(radarHydratedContext?.last_matches) && radarHydratedContext.last_matches.length > 0)
    ) {
      try {
        const radarCtx = await findRadarOutreachContext(sb, phone);
        if (radarCtx) {
          console.log("[radar-buyer-hydrate]", {
            phone, article_id: radarCtx.article.id, signal_id: radarCtx.radarSignalId,
          });
          radarHydratedContext = {
            ...radarHydratedContext,
            last_matches: [{
              id: radarCtx.article.id,
              title: radarCtx.article.title,
              price: radarCtx.article.price,
              seller_id: radarCtx.article.seller_id,
              photos: radarCtx.article.photos,
              market_price_min: radarCtx.article.market_price_min,
              market_price_max: radarCtx.article.market_price_max,
              source: "chat",
            }],
            current_article_id: radarCtx.article.id,
            radar_buyer_context: {
              signal_id: radarCtx.radarSignalId,
              hydrated_at: new Date().toISOString(),
            },
          };
          radarBuyerContext = radarHydratedContext.radar_buyer_context;
          // Patch conv en mémoire pour que les détections aval (lastMatches,
          // current_article_id) voient l'hydratation sans round-trip DB.
          if (conv) {
            (conv as any).context = radarHydratedContext;
            (conv as any).current_article_id = radarCtx.article.id;
            (conv as any).last_intent = "BUY";
          }
        }
      } catch (e) {
        console.warn("[radar-buyer-hydrate] failed", e);
      }
    }

    // 🛰️ v11 — Hydratation Radar IA → Scénario B miroir (App buyer ↔ WA seller).
    // Si un vendeur Radar IA scrapé répond à `radar_seller_outreach` sans
    // contexte article, on reconstruit last_matches + current_article_id
    // depuis waouh_outbound_queue + waouh_radar_signals.promoted_article_id.
    // Sans ça, l'inbound "OUI" / "Je propose X" du vendeur tombe sur
    // "Aucune négociation en cours" (symétrique du bug v10 côté acheteur).
    let radarSellerContext: { signal_id: string | null; hydrated_at: string; negotiation_id: string | null } | null = null;
    if (
      channel === "whatsapp" &&
      phone &&
      !phone.startsWith("web:") &&
      !radarHydratedContext?.current_article_id &&
      !(Array.isArray(radarHydratedContext?.last_matches) && radarHydratedContext.last_matches.length > 0)
    ) {
      try {
        const sellerCtx = await findRadarSellerOutreachContext(sb, phone);
        if (sellerCtx) {
          console.log("[radar-seller-hydrate]", {
            phone,
            article_id: sellerCtx.article.id,
            signal_id: sellerCtx.radarSignalId,
            negotiation_id: sellerCtx.negotiationId,
          });
          radarHydratedContext = {
            ...radarHydratedContext,
            last_matches: [{
              id: sellerCtx.article.id,
              title: sellerCtx.article.title,
              price: sellerCtx.article.price,
              seller_id: sellerCtx.article.seller_id,
              photos: sellerCtx.article.photos,
              market_price_min: sellerCtx.article.market_price_min,
              market_price_max: sellerCtx.article.market_price_max,
              source: "chat",
            }],
            current_article_id: sellerCtx.article.id,
            radar_seller_context: {
              signal_id: sellerCtx.radarSignalId,
              hydrated_at: new Date().toISOString(),
              negotiation_id: sellerCtx.negotiationId,
            },
          };
          radarSellerContext = radarHydratedContext.radar_seller_context;
          if (conv) {
            (conv as any).context = radarHydratedContext;
            (conv as any).current_article_id = sellerCtx.article.id;
            // last_intent = "SELL" pour activer le fallback "OUI" / chiffre seul
            // côté vendeur (symétrique au "BUY" hydraté plus haut).
            (conv as any).last_intent = (conv as any).last_intent || "SELL";
          }
        }
      } catch (e) {
        console.warn("[radar-seller-hydrate] failed", e);
      }
    }

    // Détection OUI/NON simple (réponse à une négociation en cours)
    const yesKw = /^(oui|ok|d['']accord|j['']accepte|accepte|deal|ça\s+marche|ca\s+marche)\s*[.!]?$/i.test(lower.trim());
    const noKw  = /^(non|refuse|refus[ée]|pas\s+d['']accord|nope)\s*[.!]?$/i.test(lower.trim());

    let intent: any = {};
    if (clientSelectsArticle) intent = { intent: "CONFIRM", article_index: 1 };
    else if (receivedKw) intent = { intent: "CONFIRM_RECEIVED" };
    else if (payKw) intent = { intent: "PAY", operator: operatorKw };
    else if (numMatch && interestedKw) intent = { intent: "CONFIRM", article_index: parseInt(numMatch[1], 10) };
    else if (INTEREST_RE.test(lower)) intent = { intent: "CONFIRM", article_index: 1 };
    else if (sellKw) intent = { intent: "SELL" };
    else if (buyKw) intent = { intent: "BUY" };
    else if (offerMatch) intent = { intent: "NEGOTIATE" };
    else if (yesKw)  intent = { intent: "DECIDE_YES" };
    else if (noKw)   intent = { intent: "DECIDE_NO" };
    else if (negotiateKw) intent = { intent: "NEGOTIATE" };
    else {
      // Fallback contextuel : un simple "1", "2"… juste après une liste de résultats = CONFIRM
      const digitsOnly = lower.trim().match(/^(\d{1,2})$/);
      const lastMatches = Array.isArray((conv?.context as any)?.last_matches) ? (conv?.context as any).last_matches : [];
      if (digitsOnly && conv?.last_intent === "BUY" && lastMatches.length > 0) {
        intent = { intent: "CONFIRM", article_index: parseInt(digitsOnly[1], 10) };
      } else {
        intent = await ai(
          "Tu es WAOUH, assistant commerce IA. Détecte l'intention parmi: SELL, BUY, NEGOTIATE, PAY, CONFIRM, RATE, HELP, UNKNOWN. Retourne JSON {intent}.",
          text
        );
      }
    }


    let reply = "Désolé, je n'ai pas compris. Tapez 'aide' pour les commandes.";
    let returnedArticleId: string | null = null;
    let returnedTransactionId: string | null = null;
    let returnedThreadId: string | null = clientMeta?.thread_id ?? null;
    let returnedSearchThreadId: string | null = null;
    let replyAttachments: Array<{ url: string; type: string }> = [];
    let returnedActions: Array<{ id: string; label: string }> = [];
    let returnedProducts: any[] = [];
    let nextContext: any = radarHydratedContext ?? (conv?.context ?? {});

    const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
    const waouhSep = "━━━━━━━━━━━━━━━━━━";
    const waouhHeader = (t: string) => `${waouhSep}\n*${t}*\n${waouhSep}`;
    const waouhFooter = (t = "WAOUH — Achetez · Vendez · Négociez en confiance") => `${waouhSep}\n_✨ ${t}_`;
    const fmtDistance = (km: number | null) => {
      if (km == null) return "";
      if (km < 1) return `📏 *à ${Math.round(km * 1000)} m de vous*`;
      return `📏 *à ${km.toString().replace(".", ",")} km de vous*`;
    };
    // Distance Haversine côté JS (fallback si pas de RPC PostGIS)
    const haversineKm = (la1?: number | null, lo1?: number | null, la2?: number | null, lo2?: number | null) => {
      if (la1 == null || lo1 == null || la2 == null || lo2 == null) return null;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(la2 - la1);
      const dLng = toRad(lo2 - lo1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLng / 2) ** 2;
      return Math.round(2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
    };
    // Petite phrase analytique IA sur le prix (best-effort, fail-soft)
    const marketNote = async (title: string, price: number, min: number, max: number, city: string): Promise<string> => {
      try {
        const r = await ai(
          `Tu es analyste prix marché Bénin. Rends UNE SEULE phrase concise (max 22 mots) qui qualifie le prix proposé par rapport au marché local (cher/correct/bonne affaire) avec un chiffre approximatif. JSON: {"note": string}`,
          `Produit: ${title}\nPrix proposé: ${price} FCFA\nFourchette marché: ${min} – ${max} FCFA\nVille: ${city}`

        );
        return typeof r?.note === "string" ? r.note.trim() : "";
      } catch { return ""; }
    };
    const marketIntelligence = async (opts: {
      articleId?: string | null;
      title: string;
      price: number;
      city?: string | null;
      category?: string | null;
    }): Promise<any | null> => {
      if (!opts.title || !Number.isFinite(opts.price) || opts.price <= 0) {
        return null;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-price-compare`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              article_id: opts.articleId || null,
              query: opts.title,
              offered_price: opts.price,
              city: opts.city || null,
              category: opts.category || null,
            }),
          },
        );
        if (!response.ok) return null;
        const data = await response.json().catch(() => null);
        return data?.success === true ? data : null;
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    };

    const buyerDecisionActions = (suggestedPrice: number) => [
      { id: "oui", label: "✅ Accepter ce prix" },
      {
        id: `proposer:${Math.max(1, Math.round(suggestedPrice))}`,
        label: "💬 Proposer un prix",
      },
      { id: "non", label: "❌ Refuser" },
    ];

    const offerDecisionActions = (negotiationId?: string | null) => [
      { id: negotiationId ? `accepter:${negotiationId}` : "accepter", label: "✅ Accepter" },
      {
        id: negotiationId
          ? `contre-proposition:${negotiationId}`
          : "contre-proposition",
        label: "💬 Contre-proposer",
      },
      { id: negotiationId ? `refuser:${negotiationId}` : "refuser", label: "❌ Refuser" },
    ];

    // Helper : envoie une notification système ET un message direct dans le chat de l'autre partie.
    // Accepte soit to_user_id (chemin chat classique), soit to_phone (partner/radar sans compte existant).
    // Double check Bénin sur le numéro avant lookup. Si le target a phone + web_session, miroir whatsapp + web.
    async function pushToOther(opts: {
      to_user_id?: string | null;
      to_phone?: string | null;
      to_web_session_id?: string | null;
      mirror_web_sessions?: Array<{ user_id: string; web_session_id: string }>;
      source?: "chat" | "partner" | "radar" | "status";
      template: string;
      payload: any;
      image_url?: string | null;
      directText: string;
      directAtts?: Array<{ url: string; type: string }>;
      directMeta?: any;
      transaction_id?: string | null;
      dedupe_key?: string | null;
      event_type?: string | null;
    }) {
      // 1) Résoudre la cible
      let target: any = null;
      if (opts.to_user_id) {
        const { data } = await sb.from("waouh_users")
          .select("id, phone_number, web_session_id, channel")
          .eq("id", opts.to_user_id).maybeSingle();
        target = data;
      }
      if (!target && opts.to_phone) {
        const resolved = await resolveWaouhUserByPhone(sb, opts.to_phone);
        if (resolved) target = resolved;
      }
      // Fallback "vendeur invité" : pas de compte trouvé mais on a un numéro normalisable
      if (!target && opts.to_phone) {
        const canon = normalizeBeninPhone(opts.to_phone);
        if (canon) {
          target = { id: null, phone_number: canon, web_session_id: opts.to_web_session_id ?? null, channel: "whatsapp" };
        }
      }
      if (!target) return;
      // Ne pas se renvoyer le message à soi-même (par id user, par phone, OU par web_session_id)
      if (target.id && user?.id && target.id === user.id) return;
      const outboundPhone = opts.to_phone ? normalizeBeninPhone(opts.to_phone) : (target.phone_number ? normalizeBeninPhone(target.phone_number) : null);
      if (outboundPhone && phone) {
        const tgtCanon = normalizeBeninPhone(outboundPhone);
        const meCanon = normalizeBeninPhone(phone);
        if (tgtCanon && meCanon && tgtCanon === meCanon) return;
      }
      const targetWs = target.web_session_id || opts.to_web_session_id || null;
      if (targetWs && webSessionId && targetWs === webSessionId) return;


      const webSession = target.web_session_id || opts.to_web_session_id || null;
      const articleIdCol = (opts.directMeta as any)?.article_id ?? null;
      // v12 — always tag the mirrored message with the originator so the
      // seller's WaouhMatchChatWindow can split history per interested buyer.
      const counterpartForMeta = user?.id ?? (opts.directMeta as any)?.counterpart_user_id ?? null;
      let insertedMsgId: string | null = null;
      if (target.id) {
        try {
          const { data: msg } = await sb.from("waouh_messages").insert({
            thread_id: (opts.directMeta as any)?.thread_id ?? opts.payload?.thread_id ?? null,
            user_id: target.id,
            channel: webSession ? "web" : "system",
            direction: "out",
            text: opts.directText,
            web_session_id: webSession,
            article_id: articleIdCol,
            attachments: opts.directAtts ?? [],
            meta: {
              ...(opts.directMeta ?? {}),
              thread_id: (opts.directMeta as any)?.thread_id ?? opts.payload?.thread_id ?? null,
              counterpart_user_id: counterpartForMeta,
              buyer_user_id: opts.payload?.buyer_user_id ?? (opts.directMeta as any)?.buyer_user_id ?? counterpartForMeta,
              seller_user_id: opts.payload?.seller_user_id ?? (opts.directMeta as any)?.seller_user_id ?? null,
              transaction_id: opts.transaction_id ?? opts.directMeta?.transaction_id ?? null,
              source: opts.source ?? "chat",
              actions: Array.isArray(opts.payload?.actions)
                ? opts.payload.actions.slice(0, 3)
                : [],
            },
          }).select("id").maybeSingle();
          insertedMsgId = msg?.id ?? null;
        } catch (e) { console.warn("[pushToOther] msg", e); }
      }



      const quickActions: Array<{ id: string; label: string }> = Array.isArray(opts.payload?.actions)
        ? opts.payload.actions.slice(0, 3)
        : [];
      const basePayload = { ...(opts.payload || {}), text: opts.directText, actions: quickActions, message_id: insertedMsgId, transaction_id: opts.transaction_id ?? null, source: opts.source ?? "chat" };

      // 2) Enqueue WhatsApp si on a un numéro
      if (outboundPhone) {
        try {
          await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: outboundPhone,
            p_to_user_id: target.id,
            p_template: opts.template,
            p_payload: basePayload,
            p_web_session_id: webSession,
            p_image_url: opts.image_url ?? null,
            p_channel: "whatsapp",
            p_message_id: insertedMsgId,
            p_transaction_id: opts.transaction_id ?? null,
            p_dedupe_key: opts.dedupe_key ? `wa:${opts.dedupe_key}` : null,
            p_event_type: opts.event_type ?? null,
          });
        } catch (e) { console.warn("[pushToOther] enqueue wa", e); }
      }
      // 3) Enqueue web en miroir si on a une session web (et qu'on n'a pas déjà envoyé que web)
      if (webSession && outboundPhone) {
        try {
          await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: null,
            p_to_user_id: target.id,
            p_template: opts.template,
            p_payload: basePayload,
            p_web_session_id: webSession,
            p_image_url: opts.image_url ?? null,
            p_channel: "web",
            p_message_id: insertedMsgId,
            p_transaction_id: opts.transaction_id ?? null,
            p_dedupe_key: opts.dedupe_key ? `web:${opts.dedupe_key}` : null,
            p_event_type: opts.event_type ?? null,
          });
        } catch (e) { console.warn("[pushToOther] enqueue web mirror", e); }
      } else if (webSession && !target.phone_number) {
        // Cas pur web (pas de numéro) : 1 seul enqueue web pour cohérence avec le dispatcher
        try {
          await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: null,
            p_to_user_id: target.id,
            p_template: opts.template,
            p_payload: basePayload,
            p_web_session_id: webSession,
            p_image_url: opts.image_url ?? null,
            p_channel: "web",
            p_message_id: insertedMsgId,
            p_transaction_id: opts.transaction_id ?? null,
            p_dedupe_key: opts.dedupe_key ? `web:${opts.dedupe_key}` : null,
            p_event_type: opts.event_type ?? null,
          });
        } catch (e) { console.warn("[pushToOther] enqueue web", e); }
      }
      // 4) Miroir vers les sessions web supplémentaires (ex: compte partner ayant enregistré l'entreprise)
      const extras = opts.mirror_web_sessions || [];
      const alreadySent = new Set<string>();
      if (webSession) alreadySent.add(webSession);
      for (const extra of extras) {
        if (!extra?.web_session_id || alreadySent.has(extra.web_session_id)) continue;
        alreadySent.add(extra.web_session_id);
        try {
          // Insère le message dans le chat web du partner pour l'affichage immédiat
          let mirrorMsgId: string | null = null;
          try {
            const { data: msg } = await sb.from("waouh_messages").insert({
              thread_id: (opts.directMeta as any)?.thread_id ?? opts.payload?.thread_id ?? null,
              user_id: extra.user_id,
              channel: "web",
              direction: "out",
              text: opts.directText,
              web_session_id: extra.web_session_id,
              attachments: opts.directAtts ?? [],
              article_id: articleIdCol,
              meta: {
                ...(opts.directMeta ?? {}),
                thread_id: (opts.directMeta as any)?.thread_id ?? opts.payload?.thread_id ?? null,
                counterpart_user_id: counterpartForMeta,
                buyer_user_id: opts.payload?.buyer_user_id ?? (opts.directMeta as any)?.buyer_user_id ?? counterpartForMeta,
                seller_user_id: opts.payload?.seller_user_id ?? (opts.directMeta as any)?.seller_user_id ?? null,
                transaction_id: opts.transaction_id ?? null,
                source: opts.source ?? "chat",
                mirror: "partner_web",
                actions: Array.isArray(opts.payload?.actions)
                  ? opts.payload.actions.slice(0, 3)
                  : [],
              },
            }).select("id").maybeSingle();
            mirrorMsgId = msg?.id ?? null;
          } catch (e) { console.warn("[pushToOther] mirror msg", e); }
          await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: null,
            p_to_user_id: extra.user_id,
            p_template: opts.template,
            p_payload: { ...basePayload, message_id: mirrorMsgId },
            p_web_session_id: extra.web_session_id,
            p_image_url: opts.image_url ?? null,
            p_channel: "web",
            p_message_id: mirrorMsgId,
            p_transaction_id: opts.transaction_id ?? null,
            p_dedupe_key: opts.dedupe_key ? `web:${opts.dedupe_key}:${extra.web_session_id}` : null,
            p_event_type: opts.event_type ?? null,
          });
        } catch (e) { console.warn("[pushToOther] enqueue web extra", e); }
      }
    }


    if (intent.intent === "SELL") {
      const deterministicSale = parseSmartSale(text, clientMeta?.sale);
      const product = await ai(
        `Tu es WAOUH. Extrais d'un message vendeur la fiche produit en JSON: {title, category (smartphone/ordinateur/vetement/vehicule/electromenager/meuble/autre), brand, model, condition (new/like_new/good/fair/poor), price (number, FCFA), description, market_price_min, market_price_max, confidence (0-1)}.`,
        text
      );
      const productCategory = deterministicSale.category !== "autre"
        ? deterministicSale.category
        : normalizeCategory(product.category);
      // Les champs explicites du formulaire sont la source de vérité. Gemini ne
      // sert qu'à enrichir les champs absents et ne peut jamais invalider une fiche.
      let inferredPrice: number | null = deterministicSale.price
        ?? (typeof product.price === "number" && product.price > 0 ? product.price : null);
      if (!inferredPrice) {
        const m = String(text || "").match(/(\d{2,}(?:[ .]\d{3})*)\s*(?:fcfa|cfa|xof|f\b)?/i);
        if (m) {
          const n = parseInt(m[1].replace(/[ .]/g, ""), 10);
          if (!Number.isNaN(n) && n >= 100) inferredPrice = n;
        }
      }
      const fallbackTitle = deterministicSale.title || String(text || "")
        .replace(/^\s*je\s+vends?\s*:?\s*/i, "")
        .split(/[,\n]/)[0]?.trim().slice(0, 60) || "Annonce";
      const accepted = isCompleteSmartSale({ ...deterministicSale, title: deterministicSale.title || String(product.title || fallbackTitle), price: inferredPrice });
      if (!accepted) {
        reply = "🤔 Indiquez simplement le produit et un prix supérieur à 0 FCFA. L’état, la ville, le quartier et les photos peuvent être ajoutés ensuite.";
      } else {
        const photoUrls = attachments
          .filter((a: any) => /^image\//i.test(String(a?.type || "image/jpeg")))
          .map((a: any) => a?.url)
          .filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u));
        const articleTitle = deterministicSale.title || product.title || fallbackTitle;
        const articleCity = deterministicSale.city || city || user!.city || "Cotonou";
        const articleQuarter = deterministicSale.quarter;
        const saleLat = typeof clientMeta?.sale?.lat === "number" ? clientMeta.sale.lat : lat;
        const saleLng = typeof clientMeta?.sale?.lng === "number" ? clientMeta.sale.lng : lng;
        const hasSaleLocation = saleLat != null && saleLng != null;
        const descriptionParts = [
          deterministicSale.detail || product.description,
          articleQuarter ? `Quartier : ${articleQuarter}` : "",
        ].filter(Boolean);
        const { data: art } = await sb.from("waouh_articles").insert({
          seller_id: user!.id,
          title: articleTitle,
          description: descriptionParts.join("\n") || null,
          category: productCategory,
          brand: deterministicSale.brand || product.brand || null,
          model: deterministicSale.model || product.model || null,
          condition: deterministicSale.condition || product.condition || "good",
          price: inferredPrice, currency: "XOF",
          city: articleCity,
          location: hasSaleLocation ? `SRID=4326;POINT(${saleLng} ${saleLat})` as any : null,
          photos: photoUrls,
          market_price_min: null,
          market_price_max: null,
          origin: channel === "whatsapp" ? "whatsapp" : "chat",
          source_channel: channel === "whatsapp" ? "whatsapp" : "waouh_app",
          contact_whatsapp: user?.phone_number ?? null,
        }).select().single();
        returnedArticleId = art?.id ?? null;
        replyAttachments = photoUrls.map((url: string) => ({ url, type: "image/jpeg" }));
        const intelligence = await marketIntelligence({
          articleId: art?.id || null,
          title: articleTitle,
          price: inferredPrice!,
          city: articleCity,
          category: productCategory,
        });
        const min = Number(intelligence?.min || 0) || null;
        const max = Number(intelligence?.max || 0) || null;
        if (art?.id && min && max) {
          await sb.from("waouh_articles").update({ market_price_min: min, market_price_max: max }).eq("id", art.id);
        }
        const photoLine = `📸 ${photoUrls.length} photo${photoUrls.length > 1 ? "s" : ""}`;
        const locationLine = [articleCity, articleQuarter].filter(Boolean).join(" · ");
        const gpsLine = hasSaleLocation ? "\n📏 Position GPS de l’annonce enregistrée" : "";
        const marketLine = intelligence?.market_summary || "Comparables réels insuffisants pour une fourchette fiable";
        const comparativeLine = intelligence?.comparative_analysis || "Analyse prudente : vérifiez l’état et les accessoires avant de comparer";
        const recommendationLine = intelligence?.recommendation || "Ajoutez l’état exact et plusieurs photos pour améliorer la confiance des acheteurs";
        const detailLine = descriptionParts.length ? `\n📝 ${descriptionParts.join(" · ")}` : "";
        returnedProducts = [{
          id: art?.id || null,
          title: articleTitle,
          price: inferredPrice,
          city: locationLine,
          category: productCategory,
          condition: deterministicSale.condition || product.condition || "good",
          availability: "Disponible",
          details: descriptionParts.join(" · ") || null,
          photos: photoUrls,
          market_price_min: min,
          market_price_max: max,
          market_comparison: marketLine,
          comparative_analysis: comparativeLine,
          recommendation: recommendationLine,
          verified: false,
          source: "WAOUH",
          location_recorded: hasSaleLocation,
        }];
        reply = `✅ *Annonce publiée et analysée*\n\n*1. ${articleTitle}*\n💰 *${fmt(inferredPrice!)}*\n🏙️ ${locationLine}${gpsLine}\n🏷️ ${productCategory}\n${photoLine}\n🟢 Disponible${detailLine}\n📊 ${marketLine}\n⚖️ ${comparativeLine}\n💡 ${recommendationLine}\n✅ Annonce WAOUH enregistrée\n\n🔔 Les acheteurs compatibles seront notifiés automatiquement.`;
        // Une seule bulle WhatsApp pour la confirmation de publication, sans boutons.
        returnedActions = [];

        // 🔔 Dispatch in-app + WhatsApp confirmation notification (same photos)
        if (art?.id) {
          const sbUrl = Deno.env.get("SUPABASE_URL")!;
          const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          fetch(`${sbUrl}/functions/v1/waouh-notify-dispatch`, {
            method: "POST",
            headers: { Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "sale_published",
              article_id: art.id,
              recipient: "seller",
              // The chat reply is already delivered via the original channel
              // (WAHA for WhatsApp, in-chat for the app), so skip duplicate WA send.
              skip_whatsapp: true,
            }),
          }).catch((e) => console.warn("[sell] notify-dispatch failed", e));

          // 🎯 Match buyer profiles and fan-out alerts via the unified dispatcher
          fetch(`${sbUrl}/functions/v1/waouh-notify-buyers`, {
            method: "POST",
            headers: { Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ article_id: art.id }),
          }).catch((e) => console.warn("[sell] notify-buyers failed", e));
        }


        // 🛰️ Radar IA: contacter les acheteurs (signaux BUY) qui correspondent
        try {
          let bq = sb.from("waouh_radar_signals")
            .select("id,product,category,price,city,contact_phone,raw_text")
            .eq("intent", "BUY")
            .not("contact_phone", "is", null);
          if (productCategory) bq = bq.or(`category.ilike.%${productCategory}%,raw_text.ilike.%${productCategory}%`);
          const { data: buyerSignals } = await bq.order("captured_at", { ascending: false }).limit(10);
          for (const b of (buyerSignals || [])) {
            const e164 = normalizeBeninPhone(b.contact_phone || b.raw_text);
            if (!e164) continue;
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: recent } = await sb.from("waouh_outbound_queue")
              .select("id").eq("to_phone", e164).eq("template", "radar_buyer_outreach")
              .gte("created_at", since).limit(1).maybeSingle();
            if (recent) continue;
            await sb.rpc("waouh_enqueue_outbound_v2", {
              p_to_phone: e164,
              p_to_user_id: null,
              p_template: "radar_buyer_outreach",
              p_payload: {
                text: `🎯 WAOUH a trouvé pour vous : *${articleTitle}* à ${fmt(inferredPrice!)} (${articleCity}). Répondez *OUI* pour être mis en relation avec le vendeur.`,
                article_id: art?.id,
                radar_signal_id: b.id,
              },
              p_image_url: photoUrls[0] || null,
              p_channel: "whatsapp",
            });
          }
        } catch (e) { console.warn("[radar buyer outreach]", e); }
      }
    } else if (intent.intent === "BUY") {
      const criteria = await ai(
        "Extrais les critères d'achat en JSON: {keywords (array de mots-clés produit, ex: ['lenovo','ordinateur']), category (smartphone/ordinateur/vetement/vehicule/electromenager/meuble/autre), price_max (number FCFA), condition_min, radius_km}.",
        text
      );
      const searchRequestId = clientMeta?.search_request_id || crypto.randomUUID();
      const searchThread = await resolveSearchThread({
        sb,
        ownerUserId: user!.id,
        searchRequestId,
        source: channel === "whatsapp" ? "whatsapp" : "chat",
        metadata: { query_text: text },
      });
      returnedSearchThreadId = searchThread.id;
      nextContext = {
        ...nextContext,
        current_search_request_id: searchRequestId,
        current_search_thread_id: searchThread.id,
      };
      await sb.from("waouh_notifications").insert({
        thread_id: searchThread.id,
        user_id: user!.id,
        web_session_id: webSessionId,
        article_id: null,
        notification_type: "search_thread",
        photos: [],
        dedupe_key: `search_thread:${searchRequestId}:${user!.id}`,
        payload: {
          thread_id: searchThread.id,
          thread_type: "search",
          search_request_id: searchRequestId,
          recipient: "buyer",
          role: "buyer",
          title: `Recherche · ${text}`,
          text: "Historique de recherche WAOUH",
          source: channel === "whatsapp" ? "whatsapp" : "chat",
        },
        channel: "waouh_app",
        delivery_status: "delivered",
        delivered_at: new Date().toISOString(),
      });

      // --- FIX 1 : résolution de la catégorie ---
      // Si l'IA retourne "autre" (catégorie générique) ou une valeur vide, on tente
      // de déduire la catégorie depuis le texte brut de l'utilisateur plutôt que
      // de garder "autre" et risquer de ramener tous les produits non classifiés.
      const aiCategory = normalizeCategory(criteria.category);
      const textCategory = normalizeCategory(text);
      // On préfère la catégorie déduite du texte brut si l'IA n'a pas trouvé mieux.
      const criteriaCategory = (aiCategory !== "autre") ? aiCategory : textCategory;

      // --- FIX 2 : enrichissement des keywords quand l'IA retourne un tableau vide ---
      // Si Gemini renvoie keywords:[] mais que le texte contient des termes reconnus,
      // on extrait les tokens significatifs du texte brut comme filet de sécurité.
      let kws: string[] = Array.isArray(criteria.keywords)
        ? criteria.keywords.filter((k: any) => typeof k === "string" && k.length > 1)
        : [];
      if (kws.length === 0) {
        // Tokenisation basique : mots de 3+ lettres, hors mots-outils français courants
        const stopWords = new Set(["les","des","une","pour","que","qui","dans","sur","avec","pas","par","est","son","ses","leur","cette","ces","mon","mes","vous","nous","ils","elles","aussi","mais","donc","comme","plus","très","bien","tout","fois","même","alors","après","avant","chez","entre","sous","vers","sans"]);
        kws = text.toLowerCase()
          .replace(/[^\w\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !stopWords.has(w))
          .slice(0, 5); // max 5 tokens pour éviter une requête trop large
      }

      // Recherche filtrée — waouh_articles (annonces classiques)
      let q = sb.from("waouh_articles")
        .select("id,title,price,city,brand,condition,category,seller_id,photos,market_price_min,market_price_max")
        .eq("status", "active");
      // N'appliquer le filtre catégorie que si on a réussi à en déduire une concrète
      if (criteriaCategory && criteriaCategory !== "autre") q = q.eq("category", criteriaCategory);
      if (criteria.price_max) q = q.lte("price", criteria.price_max);
      if (kws.length > 0) {
        const orFilter = kws.map((k) => `title.ilike.%${k}%,brand.ilike.%${k}%,description.ilike.%${k}%`).join(",");
        q = q.or(orFilter);
      }
      const { data: matches } = await q.order("created_at", { ascending: false }).limit(5);

      // 🏪 Recherche dans le Catalogue Unifié (produits partenaires + chat + radar)
      // --- FIX 3 : les produits partenaires DOIVENT être filtrés ---
      // Avant ce correctif, si kws était vide le catalogue entier était retourné
      // (savons, nourriture, cocktails…). On exige désormais au moins un filtre
      // (catégorie OU mots-clés) avant d'interroger waouh_unified_catalog.
      let partnerMatches: any[] = [];
      const hasPartnerFilter = (criteriaCategory && criteriaCategory !== "autre") || kws.length > 0;
      if (!hasPartnerFilter) {
        console.warn("[partner catalog search] skipped — no usable filter derived from query");
      } else {
        try {
          let pq = sb.from("waouh_unified_catalog")
            .select("id,titre,description,categorie,prix_min,prix_max,ville,quartier,vendeur_nom,vendeur_phone,vendeur_whatsapp,photos,source,partner_id,business_id")
            .eq("type", "offer")
            .eq("is_active", true)
            .eq("source", "partner");
          if (criteria.price_max) pq = pq.lte("prix_min", criteria.price_max);
          // Filtre catégorie sur le catalogue partenaire
          if (criteriaCategory && criteriaCategory !== "autre") {
            pq = pq.ilike("categorie", `%${criteriaCategory}%`);
          }
          if (kws.length > 0) {
            const orFilter = kws
              .map((k) => `titre.ilike.%${k}%,description.ilike.%${k}%,categorie.ilike.%${k}%,tags.cs.{${k}}`)
              .join(",");
            pq = pq.or(orFilter);
          }
          const { data: pm } = await pq.order("priority_rank", { ascending: false }).limit(5);
          partnerMatches = pm || [];
        } catch (e) { console.warn("[partner catalog search]", e); }
      }


      // 🛰️ Radar IA: chercher aussi des signaux SELL (annonces externes captées)
      let radarSellers: any[] = [];
      try {
        let rq = sb.from("waouh_radar_signals")
          .select("id,product,category,price,city,contact_phone,contact_handle,raw_url,raw_text")
          .eq("intent", "SELL");
        if (criteriaCategory && criteriaCategory !== "autre") rq = rq.or(`category.ilike.%${criteriaCategory}%,raw_text.ilike.%${criteriaCategory}%`);
        if (criteria.price_max) rq = rq.lte("price", criteria.price_max);
        if (kws.length > 0) {
          const orFilter = kws.map((k) => `raw_text.ilike.%${k}%`).join(",");
          rq = rq.or(orFilter);
        }
        const { data: rs } = await rq.order("captured_at", { ascending: false }).limit(8);
        radarSellers = rs || [];
      } catch (e) { console.warn("[radar SELL search]", e); }

      // 🛰️ SerpAPI / annonces externes (waouh_external_listings) — non promues encore.
      // Normalisées au même schéma que radarSellers pour la suite du pipeline.
      let externalListings: any[] = [];
      try {
        let eq = sb.from("waouh_external_listings")
          .select("id,title,description,category,price,city,seller_phone,seller_name,image_url,source_url,promoted_article_id")
          .eq("status", "active")
          .is("promoted_article_id", null);
        if (criteriaCategory && criteriaCategory !== "autre") {
          eq = eq.or(`category.ilike.%${criteriaCategory}%,title.ilike.%${criteriaCategory}%`);
        }
        if (criteria.price_max) eq = eq.lte("price", criteria.price_max);
        if (kws.length > 0) {
          const orFilter = kws.map((k) => `title.ilike.%${k}%,description.ilike.%${k}%`).join(",");
          eq = eq.or(orFilter);
        }
        const { data: el } = await eq.order("scraped_at", { ascending: false }).limit(8);
        // Normalise vers la forme « radar signal » attendue par le reste du flow
        externalListings = (el || []).map((e: any) => ({
          id: `ext:${e.id}`,
          external_listing_id: e.id,
          product: { title: e.title, name: e.title, price: e.price },
          category: e.category,
          price: e.price,
          city: e.city,
          contact_phone: e.seller_phone,
          contact_handle: e.seller_name,
          raw_url: e.source_url,
          raw_text: e.description || e.title,
          image_url: e.image_url,
          _from_external: true,
        }));
      } catch (e) { console.warn("[external listings search]", e); }

      // Fusionne — radarSellers garde priorité chronologique
      radarSellers = [...radarSellers, ...externalListings].slice(0, 8);



      await sb.from("waouh_buyer_profiles").insert({
        user_id: user!.id, query_text: text,
        category: criteriaCategory, keywords: kws,
        price_max: criteria.price_max, radius_km: criteria.radius_km ?? 30,
        location: hasCurrentLocation ? `SRID=4326;POINT(${lng} ${lat})` as any : null,
        origin: channel === "whatsapp" ? "whatsapp" : "chat",
      });

      const totalCount = (matches?.length || 0) + radarSellers.length + partnerMatches.length;
      if (totalCount === 0) {
        reply = `🔍 Aucune annonce ne correspond pour l'instant. Profil sauvegardé : vous serez notifié dès qu'un vendeur publie un produit correspondant !`;
        nextContext = { ...nextContext, last_matches: [] };
      } else {
        // Limiter explicitement à top 5 cumulés (priorité: partenaires d'abord)
        const partnerTop = partnerMatches.slice(0, 5);
        const remainingAfterPartners = Math.max(0, 5 - partnerTop.length);
        const matchesTop = (matches || []).slice(0, remainingAfterPartners);
        const radarTop = radarSellers.slice(0, Math.max(0, 5 - partnerTop.length - matchesTop.length));
        // 🏪 Liste partenaires — SANS nom ni contact (échangés seulement après accord)
        const partnerList = (await Promise.all(partnerTop.map(async (p: any, i: number) => {
          const idx = i + 1;
          const photos: string[] = Array.isArray(p.photos) ? p.photos.filter((u: any) => typeof u === "string") : [];
          const photoLine = photos.length > 0 ? `\n📸 ${photos.length} photo${photos.length > 1 ? "s" : ""}` : "";
          const priceTxt = p.prix_min && p.prix_max && p.prix_min !== p.prix_max
            ? `${fmt(Number(p.prix_min))} – ${fmt(Number(p.prix_max))}`
            : fmt(Number(p.prix_min || p.prix_max || 0));
          const offeredPrice = Number(p.prix_min || p.prix_max || 0);
          const loc = [p.ville, p.quartier].filter(Boolean).join(" · ") || "?";
          const intelligence = await marketIntelligence({
            title: p.titre || "Produit",
            price: offeredPrice,
            city: p.ville || null,
            category: p.categorie || null,
          });
          p._waouh_intelligence = intelligence;
          const marketLine = intelligence?.market_summary
            ? `\n📊 ${intelligence.market_summary}`
            : "\n📊 Comparables réels en cours de consolidation";
          const comparisonLine = intelligence?.comparative_analysis
            ? `\n⚖️ ${intelligence.comparative_analysis}`
            : "";
          const recommendationLine = intelligence?.recommendation
            ? `\n💡 ${intelligence.recommendation}`
            : "";
          return `*${idx}. ${p.titre}*\n💰 *${priceTxt}*\n🏙️ ${loc}${photoLine}\n✅ Partenaire vérifié${marketLine}${comparisonLine}${recommendationLine}`;
        }))).join(`\n\n${waouhSep}\n\n`);
        // Liste officielle (chat) — avec analyse marché IA + distance live
        const officialList = (await Promise.all(matchesTop.map(async (m: any, i: number) => {
          const idx = partnerTop.length + i + 1;
          const photos: string[] = Array.isArray(m.photos) ? m.photos.filter((u: any) => typeof u === "string") : [];
          const photoLine = photos.length > 0 ? `\n📸 ${photos.length} photo${photos.length > 1 ? "s" : ""}` : "";
          const min = m.market_price_min || null;
          const max = m.market_price_max || null;
          const intelligence = await marketIntelligence({
            articleId: m.id,
            title: m.title || "Produit",
            price: Number(m.price || 0),
            city: m.city || null,
            category: m.category || null,
          });
          m._waouh_intelligence = intelligence;
          const marketText = intelligence?.market_summary ||
            (min && max
              ? `${fmt(min)} – ${fmt(max)}`
              : "Comparables réels en cours de consolidation");
          const comparison = intelligence?.comparative_analysis ||
            (min && max
              ? await marketNote(m.title || "", Number(m.price || 0), min, max, m.city || "")
              : "");
          const recommendation = intelligence?.recommendation || "";
          // Distance live vendeur ↔ acheteur via RPC PostGIS
          let distLine = "";
          if (m.id && hasCurrentLocation) {
            try {
              const { data: d } = await sb.rpc("waouh_article_distance_km", { p_article: m.id, p_lat: lat, p_lng: lng });
              if (typeof d === "number") distLine = `\n${fmtDistance(Math.round(d * 10) / 10)}`;
              if (typeof d === "number") m._waouh_distance_km = Math.round(d * 10) / 10;
            } catch {}
          }
          const locationAndCondition = [m.city, m.condition].filter(Boolean).join(" · ") || "?";
          return `*${idx}. ${m.title}*\n💰 *${fmt(m.price)}*\n🏙️ ${locationAndCondition}${distLine}${photoLine}\n📊 ${marketText}${comparison ? `\n⚖️ ${comparison}` : ""}${recommendation ? `\n💡 ${recommendation}` : ""}`;
        }))).join(`\n\n${waouhSep}\n\n`);
        const radarList = (await Promise.all(radarTop.map(async (r: any, i: number) => {
          const idx = partnerTop.length + matchesTop.length + i + 1;
          const title = r.product?.title || r.product?.name || (r.raw_text || "").slice(0, 60) || "Annonce externe";
          const price = r.price ? fmt(Number(r.price)) : "Prix à négocier";
          const city = r.city || "?";
          const photos = extractProductPhotos(r);
          const photoLine = photos.length > 0 ? `\n📸 ${photos.length} photo${photos.length > 1 ? "s" : ""}` : "";
          const intelligence = r.price
            ? await marketIntelligence({
                title,
                price: Number(r.price),
                city: r.city || null,
                category: r.category || null,
              })
            : null;
          r._waouh_intelligence = intelligence;
          const marketLine = intelligence?.market_summary
            ? `\n📊 ${intelligence.market_summary}`
            : "";
          const comparisonLine = intelligence?.comparative_analysis
            ? `\n⚖️ ${intelligence.comparative_analysis}`
            : "";
          const recommendationLine = intelligence?.recommendation
            ? `\n💡 ${intelligence.recommendation}`
            : "";
          return `*${idx}. ${title}*\n💰 *${price}*\n🏙️ ${city}${photoLine}\n📡 Source : Radar IA${marketLine}${comparisonLine}${recommendationLine}`;
        }))).join(`\n\n${waouhSep}\n\n`);
        // Envoyer TOUTES les photos publiques (jusqu'à 4 par produit, plafond 12) avec caption.
        // Toute URL http(s) est acceptée (Supabase Storage public, CDN partenaire, source externe rehébergée).
        // Le rehosting des photos WAHA est censé être fait en amont (rehostPhotos).
        const isPublicImageUrl = (u: any): u is string =>
          typeof u === "string"
          && /^https?:\/\//i.test(u)
          && !/^data:/i.test(u)
          && !/^blob:/i.test(u);
        const collectAtts = (items: any[], titleField: string) =>
          items.flatMap((p: any) => {
            const photos: string[] = Array.isArray(p.photos) ? p.photos : [];
            return photos.filter(isPublicImageUrl).slice(0, 4).map((url: string, k: number) => ({
              url,
              type: "image/jpeg",
              caption: `${p[titleField] || "Produit"}${photos.length > 1 ? ` — photo ${k + 1}/${photos.length}` : ""}`,
            }));
          });
        replyAttachments = [
          ...collectAtts(partnerTop, "titre"),
          ...collectAtts(matchesTop, "title"),
          ...radarTop.flatMap((r: any) => extractProductPhotos(r).slice(0, 4).map((url: string, k: number) => ({
            url,
            type: "image/jpeg",
            caption: `${r.product?.title || r.product?.name || "Annonce Radar IA"}${k > 0 ? ` — photo ${k + 1}` : ""}`,
          }))),
        ].slice(0, 12);
        returnedProducts = [
          ...partnerTop.map((p: any, i: number) => ({
            id: p.id,
            article_id: p.id,
            title: p.titre || "Produit partenaire",
            description: p.description,
            price: Number(p.prix_min || p.prix_max || 0),
            city: [p.ville, p.quartier].filter(Boolean).join(" · "),
            category: p.categorie,
            photos: Array.isArray(p.photos) ? p.photos : [],
            verified: true,
            source: "Partenaire WAOUH",
            market_price_min: p._waouh_intelligence?.min,
            market_price_max: p._waouh_intelligence?.max,
            market_price_median: p._waouh_intelligence?.median,
            market_comparison: p._waouh_intelligence?.market_summary,
            comparative_analysis: p._waouh_intelligence?.comparative_analysis,
            recommendation: p._waouh_intelligence?.recommendation,
            actions: [{ id: `interesse:${i + 1}`, label: "✅ Je suis intéressé" }],
          })),
          ...matchesTop.map((m: any, i: number) => ({
            id: m.id,
            article_id: m.id,
            title: m.title,
            description: m.description,
            price: Number(m.price || 0),
            city: m.city,
            category: m.category,
            condition: m.condition,
            photos: Array.isArray(m.photos) ? m.photos : [],
            source: "Annonce WAOUH",
            distance_km: m._waouh_distance_km,
            market_price_min: m._waouh_intelligence?.min ?? m.market_price_min,
            market_price_max: m._waouh_intelligence?.max ?? m.market_price_max,
            market_price_median: m._waouh_intelligence?.median,
            market_comparison: m._waouh_intelligence?.market_summary,
            comparative_analysis: m._waouh_intelligence?.comparative_analysis,
            recommendation: m._waouh_intelligence?.recommendation,
            actions: [{ id: `interesse:${partnerTop.length + i + 1}`, label: "✅ Je suis intéressé" }],
          })),
          ...radarTop.map((r: any, i: number) => ({
            id: r.promoted_article_id || r.id,
            article_id: r.promoted_article_id || null,
            title: r.product?.title || r.product?.name || (r.raw_text || "").slice(0, 60) || "Annonce Radar",
            description: r.raw_text,
            price: Number(r.price || 0),
            city: r.city,
            category: r.category,
            photos: extractProductPhotos(r),
            source: "Radar IA",
            radar_signal_id: r.id,
            market_price_min: r._waouh_intelligence?.min,
            market_price_max: r._waouh_intelligence?.max,
            market_price_median: r._waouh_intelligence?.median,
            market_comparison: r._waouh_intelligence?.market_summary,
            comparative_analysis: r._waouh_intelligence?.comparative_analysis,
            recommendation: r._waouh_intelligence?.recommendation,
            actions: [{ id: `interesse:${partnerTop.length + matchesTop.length + i + 1}`, label: "✅ Je suis intéressé" }],
          })),
        ];
        const radarHint = radarTop.length > 0
          ? `\n\n🛰️ *${radarTop.length} annonce${radarTop.length > 1 ? "s" : ""}* détectée${radarTop.length > 1 ? "s" : ""} via Radar IA. Nous contactons automatiquement ces vendeurs sur WhatsApp pour vous.`
          : "";
        const totalShown = partnerTop.length + matchesTop.length + radarTop.length;
        const interestList = Array.from({ length: totalShown }, (_, i) => `*intéressé ${i + 1}*`).join(", ");
        reply = `${waouhHeader(`🎯 Top ${totalShown} annonce${totalShown > 1 ? "s" : ""} trouvée${totalShown > 1 ? "s" : ""}`)}\n\n${[partnerList, officialList, radarList].filter(Boolean).join(`\n\n${waouhSep}\n\n`)}\n\n${waouhSep}\n\n💡 Pour discuter avec un vendeur, répondez : ${interestList}.${radarHint}\n\n${waouhFooter()}`;
        // Pas de boutons : tout passe par texte (intéressé 1, intéressé 2, …)
        returnedActions = [];
        // Promotion radar + outreach: déférés via EdgeRuntime.waitUntil pour ne PAS
        // ralentir la réponse au chat. La liste affichée (combinedMatches) reflète
        // les matches officiels + partenaires immédiatement; les promotions radar
        // arrivent en background et seront visibles au prochain message.
        const combinedMatches = [
          ...partnerTop.map((p: any) => ({ id: p.id, title: `🏪 ${p.titre}`, price: Number(p.prix_min || p.prix_max || 0), seller_id: null, partner_id: p.partner_id, business_id: p.business_id, vendeur_phone: p.vendeur_phone, vendeur_whatsapp: p.vendeur_whatsapp, photos: p.photos, source: "partner" })),
          ...(matches || []).map((m: any) => ({ id: m.id, title: m.title, price: m.price, seller_id: m.seller_id, photos: m.photos, market_price_min: m.market_price_min, market_price_max: m.market_price_max })),
        ];
        nextContext = { ...nextContext, last_matches: combinedMatches };

        // 🛰️ v11 — Promotion Radar IA synchrone + inclusion dans last_matches.
        // Sans ça, l'acheteur App ne peut pas répondre "intéressé N" sur un
        // hit Radar (CONFIRM index hors-liste → "Aucune négociation").
        const radarPromotedArticles: any[] = [];
        for (const r of radarSellers.slice(0, 3)) {
          try {
            const art = r._from_external
              ? await promoteExternalListing(sb, r, criteriaCategory)
              : await promoteRadarSeller(sb, r, criteriaCategory);
            if (art?.id) {
              radarPromotedArticles.push({
                id: art.id,
                title: art.title,
                price: art.price,
                seller_id: art.seller_id,
                photos: art.photos,
                market_price_min: art.market_price_min,
                market_price_max: art.market_price_max,
                source: "radar",
                radar_signal_id: r.id,
              });
            }
          } catch (e) { console.warn("[radar promote sync]", e); }
        }
        if (radarPromotedArticles.length > 0) {
          nextContext = { ...nextContext, last_matches: [...combinedMatches, ...radarPromotedArticles] };
        }

        // Chaque produit réel trouvé obtient immédiatement sa propre fenêtre
        // Chat Meet côté acheteur. Une recherche répétée réutilise le même
        // thread actif, mais crée une nouvelle notification qui ouvre ce thread.
        const threadByArticle = new Map<string, any>();
        const threadCandidates = [...matchesTop, ...radarPromotedArticles];
        for (const candidate of threadCandidates) {
          if (!candidate?.id || !candidate?.seller_id) continue;
          try {
            const meet = await resolveProductThread({
              sb,
              articleId: candidate.id,
              actorUser: user,
              role: "buyer",
              counterpartUserId: candidate.seller_id,
              buyerUserId: user!.id,
              sellerUserId: candidate.seller_id,
              source: candidate.source === "radar" ? "radar" : "search",
            });
            if (!meet?.id) continue;
            threadByArticle.set(candidate.id, meet);
            const candidatePhotos = Array.isArray(candidate.photos)
              ? candidate.photos.filter(Boolean)
              : [];
            await sb.from("waouh_notifications").insert({
              thread_id: meet.id,
              user_id: user!.id,
              web_session_id: webSessionId,
              article_id: candidate.id,
              notification_type: candidate.source === "radar" ? "radar_match" : "match_buyer",
              photos: candidatePhotos,
              dedupe_key: `search_match:${searchRequestId}:${candidate.id}:${user!.id}`,
              payload: {
                thread_id: meet.id,
                search_thread_id: searchThread.id,
                search_request_id: searchRequestId,
                recipient: "buyer",
                role: "buyer",
                article_id: candidate.id,
                buyer_user_id: meet.buyer_user_id,
                seller_user_id: meet.seller_user_id,
                counterpart_user_id: meet.seller_user_id,
                title: candidate.title || "Annonce WAOUH",
                price: candidate.price,
                city: candidate.city,
                photos: candidatePhotos,
                source: candidate.source === "radar" ? "radar" : "search",
                text: `Discussion produit ouverte pour ${candidate.title || "cette annonce"}.`,
              },
              channel: "waouh_app",
              delivery_status: "delivered",
              delivered_at: new Date().toISOString(),
            });
          } catch (e: any) {
            if (e?.code !== "23505" && !/duplicate/i.test(e?.message || "")) {
              console.warn("[search-chat-meet]", candidate?.id, e);
            }
          }
        }
        if (threadByArticle.size > 0) {
          returnedProducts = returnedProducts.map((product: any) => {
            let meet = threadByArticle.get(product.article_id || product.id);
            if (!meet && product.radar_signal_id) {
              const promoted = radarPromotedArticles.find(
                (item: any) => item.radar_signal_id === product.radar_signal_id,
              );
              if (promoted) {
                meet = threadByArticle.get(promoted.id);
                product = { ...product, id: promoted.id, article_id: promoted.id };
              }
            }
            return meet ? {
              ...product,
              thread_id: meet.id,
              search_thread_id: searchThread.id,
              search_request_id: searchRequestId,
              buyer_user_id: meet.buyer_user_id,
              seller_user_id: meet.seller_user_id,
              actions: [
                { id: `ouvrir-meet:${meet.id}`, label: "💬 Ouvrir la discussion" },
                ...(Array.isArray(product.actions) ? product.actions : []),
              ],
            } : product;
          });
          nextContext = {
            ...nextContext,
            last_matches: (nextContext.last_matches || []).map((item: any) => {
              const meet = threadByArticle.get(item.id);
              return meet ? {
                ...item,
                thread_id: meet.id,
                buyer_user_id: meet.buyer_user_id,
                seller_user_id: meet.seller_user_id,
              } : item;
            }),
          };
        }

        const radarAsync = (async () => {
          try {
            for (const r of radarSellers) {
              // L'article promu (si succès synchrone ci-dessus) sert à enrichir le payload
              const promoted = radarPromotedArticles.find((a: any) => a.radar_signal_id === r.id);
              // 🚀 Outreach automatique WhatsApp aux vendeurs Radar IA (anti-spam: 1/24h)
              const e164 = normalizeBeninPhone(r.contact_phone || r.raw_text || r.contact_handle);
              if (!e164) continue;
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              const { data: recent } = await sb.from("waouh_outbound_queue")
                .select("id").eq("to_phone", e164).eq("template", "radar_seller_outreach")
                .gte("created_at", since).limit(1).maybeSingle();
              if (recent) continue;
              const title = r.product?.title || (r.raw_text || "").slice(0, 60) || "votre annonce";
              const priceTxt = r.price ? ` à ${fmt(Number(r.price))}` : "";
              try {
                await sb.rpc("waouh_enqueue_outbound_v2", {
                  p_to_phone: e164,
                  p_to_user_id: null,
                  p_template: "radar_seller_outreach",
                  p_payload: {
                    text: `👋 Bonjour ! WAOUH a détecté votre annonce "${title}"${priceTxt}. Un acheteur dans ${user!.city || "votre zone"} est intéressé. Répondez *OUI* pour être mis en relation directement avec lui via WAOUH.`,
                    radar_signal_id: r.id,
                    // v11 — Inclure article_id pour que findRadarSellerOutreachContext
                    // hydrate le contexte du vendeur sans round-trip via le signal.
                    article_id: promoted?.id ?? null,
                    source_url: r.raw_url,
                  },
                  p_channel: "whatsapp",
                  p_image_url: extractProductPhotos(r)[0] ?? null,
                });
              } catch (e) { console.warn("[radar outreach]", e); }
            }
          } catch (e) { console.warn("[radar async block]", e); }
        })();
        // @ts-ignore - EdgeRuntime fourni par Supabase
        if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
          // @ts-ignore
          (EdgeRuntime as any).waitUntil(radarAsync);
        }
      }
    } else if (intent.intent === "CONFIRM" && intent.article_index) {
      const idx = intent.article_index - 1;
      const last = Array.isArray(nextContext?.last_matches) ? nextContext.last_matches : [];
      let pick: any = last[idx];
      // Fallback : si la liste est perdue, retomber sur l'article courant
      if (!pick) {
        const fallbackArticleId = nextContext?.current_article_id || conv?.current_article_id || null;
        if (fallbackArticleId) {
          const { data: art } = await sb.from("waouh_articles")
            .select("id,title,price,seller_id,photos,market_price_min,market_price_max")
            .eq("id", fallbackArticleId).maybeSingle();
          if (art) pick = art;
        }
      }
      if (!pick) {
        reply = "🤔 Je n'ai plus la liste. Refaites votre recherche : « Je cherche … »";
      } else {
        // Le fait qu'un article soit le premier résultat courant ne signifie
        // jamais qu'une relation commerciale est déjà ouverte. Chaque clic
        // « intéressé » doit passer par le thread produit+acheteur+vendeur.
        const alreadyOnArticle = false;
        const askPrice = Number(pick.price || 0);
        if (alreadyOnArticle) {
          const existingMeet = pick.seller_id
            ? await resolveProductThread({
                sb,
                articleId: pick.id,
                actorUser: user,
                role: "buyer",
                counterpartUserId: pick.seller_id,
                buyerUserId: user!.id,
                sellerUserId: pick.seller_id,
                source: "chat",
              })
            : null;
          returnedThreadId = existingMeet?.id ?? returnedThreadId;
          returnedArticleId = pick.id;
          returnedActions = buyerDecisionActions(Math.round(askPrice * 0.9));
          reply = `${waouhHeader("✅ Mise en relation déjà ouverte")}\n\n📦 *${pick.title}*\n💰 *Prix* : ${fmt(askPrice)}\n\nRépondez *OUI* pour accepter, *NON* pour refuser, ou écrivez (Ex : *Je propose ${fmt(askPrice)}*) pour négocier.\n\n${waouhFooter()}`;
        } else {
        const pickSource: "chat" | "partner" | "radar" | "status" =
          clientMeta?.status_id || pick.source === "status" ? "status" :
          clientMeta?.source === "partner" || pick.source === "partner" ? "partner" :
          clientMeta?.source === "radar" || pick.source === "radar" || pick.radar ? "radar" : "chat";
        const vendorContacts = await resolveVendorContacts(sb, pick);
        if (!pick.seller_id) {
          if (vendorContacts.phone) {
            const stub = await ensureWaouhVendorStub(sb, vendorContacts.phone, {
              display_name: pick.vendeur_nom || pick.title || "Vendeur partenaire",
              city: pick.city || pick.ville || null,
              stub_origin: pickSource,
            });
            if (stub?.id) pick.seller_id = stub.id;
          }
        }
        // 🔒 Bug 2 fix — Promotion catalog→article AVANT la création de la
        // négociation. Sans ça, pick.id est un UUID de waouh_unified_catalog
        // qui ne respecte pas la FK waouh_negotiations.article_id →
        // waouh_articles.id et fait répondre "Aucune négociation en cours"
        // à l'offre suivante (scénarios B2/C2).
        let promotionFailed = false;
        if (pickSource === "partner") {
          try {
            const promo = await promoteCatalogToArticle(sb, pick.id, {
              seller_id: pick.seller_id ?? null,
              category: pick.categorie || pick.category || null,
            });
            if (promo.article_id) {
              pick = { ...pick, id: promo.article_id };
            } else {
              console.error("[interest] catalog promotion failed", promo.reason);
              promotionFailed = true;
            }
          } catch (e) {
            console.error("[interest] catalog promotion error", e);
            promotionFailed = true;
          }
        }
        if (promotionFailed) {
          reply = "🤔 Cet article ne peut pas être négocié pour l'instant. Réessayez dans un instant.";
          returnedActions = [];
        } else {
        const { data: seller } = pick.seller_id
          ? await sb.from("waouh_users").select("id,phone_number,display_name,web_session_id,city,auth_user_id").eq("id", pick.seller_id).maybeSingle()
          : { data: null };
        // 🔒 v8 — Empêche le vendeur d'ouvrir une négociation sur son propre article
        // (cas seller WhatsApp = LID différent du compte App seller). Sans ça,
        // une néga miroir est créée avec buyer=vendeur, ce qui détourne les
        // contre-offres et le "achat conclu" vers lui au lieu du vrai acheteur.
        const buyerSiblingIds = await resolveSiblingUserIds(sb, user as any);
        if (pick.seller_id && buyerSiblingIds.includes(pick.seller_id)) {
          reply = "🤔 Vous êtes le vendeur de cet article. Vous ne pouvez pas vous y intéresser vous-même. Attendez qu'un acheteur se manifeste.";
          returnedActions = [];
        } else {
        const interestThread = await resolveProductThread({
          sb,
          articleId: pick.id,
          actorUser: user,
          role: "buyer",
          counterpartUserId: pick.seller_id,
          buyerUserId: user!.id,
          sellerUserId: pick.seller_id,
          source: pickSource,
        });
        if (!interestThread?.id) {
          throw new Error("Impossible de créer la discussion isolée pour cet article");
        }
        const interestThreadId = interestThread.id;
        returnedThreadId = interestThreadId;
        const { data: artPhoto } = pick.seller_id
          ? await sb.from("waouh_articles")
              .select("id,title,description,category,condition,price,currency,photos,city,market_price_min,market_price_max,status")
              .eq("id", pick.id).maybeSingle()
          : { data: null };
        const fallbackPhoto = Array.isArray(pick.photos) && pick.photos.length > 0 ? pick.photos[0] : null;
        const firstPhoto = Array.isArray(artPhoto?.photos) && artPhoto!.photos.length > 0 ? artPhoto!.photos[0] : fallbackPhoto;
        // Distance live acheteur ↔ vendeur (RPC PostGIS)
        let distKm: number | null = null;
        if (pick.id && hasCurrentLocation) {
          try {
            const { data: d } = await sb.rpc("waouh_article_distance_km", { p_article: pick.id, p_lat: lat, p_lng: lng });
            if (typeof d === "number") distKm = Math.round(d * 10) / 10;
          } catch {}
        }
        // 🛰️ v11 — Si le pick a été promu depuis Radar IA (côté vendeur WA),
        // on retrouve le signal source pour le marquer comme converti
        // (symétrique au v10 acheteur). Le radar_signal_id provient soit du
        // pick (synchrone promu plus haut) soit de la ligne waouh_articles
        // (origin = 'radar', origin_signal_id).
        let pickRadarSignalId: string | null = pick.radar_signal_id ?? null;
        if (!pickRadarSignalId && pickSource === "radar") {
          try {
            const { data: a } = await sb.from("waouh_articles")
              .select("origin, origin_signal_id")
              .eq("id", pick.id).maybeSingle();
            if (a?.origin === "radar" && a?.origin_signal_id) {
              pickRadarSignalId = a.origin_signal_id;
            }
          } catch {}
        }
        // Négociation seule, AUCUNE transaction n'est créée (plus de paiement)
        let { data: neg, error: negLookupError } = await sb
          .from("waouh_negotiations")
          .select("*")
          .eq("thread_id", interestThreadId)
          .in("state", ["proposed", "countered", "accepted"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (negLookupError) throw negLookupError;
        if (!neg?.id) {
          const createdNegotiation = await sb.from("waouh_negotiations").insert({
            thread_id: interestThreadId,
            article_id: pick.id, buyer_user_id: user!.id, seller_user_id: pick.seller_id,
            state: "proposed", last_offer_price: askPrice, last_actor: "system",
            meta: { source: pickSource, stage: "awaiting_buyer_decision", rounds: 0, radar_signal_id: radarBuyerContext?.signal_id ?? pickRadarSignalId ?? null },
          }).select().single();
          if (createdNegotiation.error) throw createdNegotiation.error;
          neg = createdNegotiation.data;
        }
        // 🛰️ v10 — Si la négo provient d'un outreach Radar IA, marquer le
        // signal comme converti pour éviter de re-contacter l'acheteur sur
        // la même annonce et alimenter les métriques admin.
        if (radarBuyerContext?.signal_id && neg?.id) {
          try {
            await sb.from("waouh_radar_signals")
              .update({ status: "converted", converted_negotiation_id: neg.id, thread_id: interestThreadId, updated_at: new Date().toISOString() })
              .eq("id", radarBuyerContext.signal_id);
          } catch (e) { console.warn("[radar-buyer-hydrate] mark converted failed", e); }
        }
        // 🛰️ v11 — Miroir : marquer le signal SELL converti quand l'acheteur
        // App ouvre une négo sur une annonce promue depuis Radar IA.
        if (pickRadarSignalId && neg?.id && pickRadarSignalId !== radarBuyerContext?.signal_id) {
          try {
            await sb.from("waouh_radar_signals")
              .update({ status: "converted", converted_negotiation_id: neg.id, thread_id: interestThreadId, updated_at: new Date().toISOString() })
              .eq("id", pickRadarSignalId);
            console.log("[radar-seller-hydrate] mark converted", { signal_id: pickRadarSignalId, neg_id: neg.id });
          } catch (e) { console.warn("[radar-seller-hydrate] mark converted failed", e); }
        }
        returnedArticleId = pick.id;
        returnedTransactionId = null;
        const sellerCanon = seller?.phone_number ? normalizeBeninPhone(seller.phone_number) : null;
        const phonesToPush: string[] = [];
        const seenP = new Set<string>();
        for (const p of [sellerCanon, ...vendorContacts.phones]) {
          if (p && !seenP.has(p)) { seenP.add(p); phonesToPush.push(p); }
        }
        const vendorPhoneForPush = phonesToPush[0] || null;
        const distLineSeller = distKm != null ? `\n${fmtDistance(distKm)}` : "";
        const sellerText = `${waouhHeader("📩 Nouvel acheteur intéressé")}\n\n📦 *${pick.title}*\n💰 *Prix affiché* : ${fmt(askPrice)}${distLineSeller}\n🏙️ *Acheteur* : ${user!.city || "?"}\n\nL'acheteur va indiquer s'il *accepte ce prix* ou s'il *propose un autre montant*.\n⏳ *Vous serez notifié dès qu'il aura répondu* — pas besoin d'agir pour l'instant.\n\n${waouhFooter()}`;
        if (seller?.id || phonesToPush.length > 0 || vendorContacts.web_sessions.length > 0) {
          try {
            await pushToOther({
              to_user_id: seller?.id ?? null,
              to_phone: vendorPhoneForPush,
              mirror_web_sessions: vendorContacts.web_sessions,
              source: pickSource,
              template: "match_seller",
              payload: {
                article_id: pick.id, title: pick.title, price: askPrice,
                thread_id: interestThreadId,
                buyer_user_id: user!.id, seller_user_id: pick.seller_id,
                counterpart_user_id: user!.id,
                counterpart_name: user!.display_name || user!.phone_number || "Acheteur",
                neg_id: neg?.id, photo: firstPhoto,
                actions: [],
                products: [{
                  id: pick.id, article_id: pick.id,
                  title: artPhoto?.title || pick.title,
                  description: artPhoto?.description || pick.description || null,
                  category: artPhoto?.category || pick.category || pick.categorie || null,
                  condition: artPhoto?.condition || pick.condition || null,
                  price: Number(artPhoto?.price || askPrice || 0),
                  currency: artPhoto?.currency || pick.currency || "XOF",
                  photos: Array.isArray(artPhoto?.photos) ? artPhoto.photos : (pick.photos || []),
                  city: artPhoto?.city || pick.city || pick.ville || null,
                  distance_km: distKm,
                  market_price_min: artPhoto?.market_price_min ?? pick.market_price_min ?? null,
                  market_price_max: artPhoto?.market_price_max ?? pick.market_price_max ?? null,
                  workflow_state: "negotiating", role: "seller",
                  thread_id: interestThreadId,
                  buyer_user_id: user!.id, seller_user_id: pick.seller_id,
                  negotiation_id: neg?.id ?? null, source: pickSource,
                }],
              },
              image_url: firstPhoto,
              directText: sellerText,
              directAtts: firstPhoto ? [{ url: firstPhoto, type: "image/jpeg", caption: pick.title }] : [],
              directMeta: {
                intent: "match_seller", article_id: pick.id,
                thread_id: interestThreadId, buyer_user_id: user!.id,
                seller_user_id: pick.seller_id, negotiation_id: neg?.id,
                source: pickSource, status_id: clientMeta?.status_id ?? null,
                radar_signal_id: radarBuyerContext?.signal_id ?? pickRadarSignalId ?? null,
                products: [{
                  id: pick.id, article_id: pick.id,
                  title: artPhoto?.title || pick.title,
                  description: artPhoto?.description || pick.description || null,
                  category: artPhoto?.category || pick.category || pick.categorie || null,
                  condition: artPhoto?.condition || pick.condition || null,
                  price: Number(artPhoto?.price || askPrice || 0),
                  currency: artPhoto?.currency || pick.currency || "XOF",
                  photos: Array.isArray(artPhoto?.photos) ? artPhoto.photos : (pick.photos || []),
                  city: artPhoto?.city || pick.city || pick.ville || null,
                  distance_km: distKm,
                  market_price_min: artPhoto?.market_price_min ?? pick.market_price_min ?? null,
                  market_price_max: artPhoto?.market_price_max ?? pick.market_price_max ?? null,
                  workflow_state: "negotiating", role: "seller",
                  thread_id: interestThreadId,
                  buyer_user_id: user!.id, seller_user_id: pick.seller_id,
                  negotiation_id: neg?.id ?? null, source: pickSource,
                }],
              },
              transaction_id: null,
              dedupe_key: `match:${neg?.id ?? pick.id}:${seller?.id ?? "anon"}:${pickSource}`,
              event_type: "seller_new_interest",
            });
            for (const extraPhone of phonesToPush.slice(1)) {
              try {
                await sb.rpc("waouh_enqueue_outbound_v2", {
                  p_to_phone: extraPhone,
                  p_to_user_id: null,
                  p_template: "match_seller",
                  p_payload: {
                    article_id: pick.id, title: pick.title, price: askPrice,
                    thread_id: interestThreadId,
                    buyer_user_id: user!.id, seller_user_id: pick.seller_id,
                    counterpart_user_id: user!.id, neg_id: neg?.id, photo: firstPhoto,
                    actions: [], text: sellerText,
                  },
                  p_channel: "whatsapp",
                  p_image_url: firstPhoto,
                  p_dedupe_key: `wa:match:${neg?.id ?? pick.id}:${pickSource}:${extraPhone}`,
                  p_event_type: "seller_new_interest",
                });
              } catch (e) { console.warn("[interest-push] extra phone enqueue failed", extraPhone, e); }
            }
          } catch (e) { console.error("[interest-push] enqueue failed", e); }
        } else {
          console.warn("[interest-push] no seller, no vendor phone", { pick_id: pick.id, source: pickSource });
        }
        // Inbox notification (📩 Nouvel acheteur intéressé) — affichée en tête
        // de WaouhMatchChatList et ouverte par WaouhMatchChatWindow avec
        // exactement le même texte riche + photo qu'envoyé sur WhatsApp.
        try {
          let sellerWebSession: string | null = null;
          if (seller?.id) {
            const { data: su } = await sb
              .from("waouh_users")
              .select("web_session_id")
              .eq("id", seller.id)
              .maybeSingle();
            sellerWebSession = (su as any)?.web_session_id ?? null;
          }
          const photosArr: string[] = Array.isArray(pick.photos)
            ? (pick.photos as any[]).filter(Boolean)
            : (firstPhoto ? [firstPhoto] : []);
          const dayBucket = new Date().toISOString().slice(0, 10);
          await sb.from("waouh_notifications").insert({
            thread_id: interestThreadId,
            user_id: seller?.id ?? null,
            web_session_id: sellerWebSession,
            article_id: pick.id,
            notification_type: "new_buyer",
            photos: photosArr,
            dedupe_key: `new_buyer:${pick.id}:${seller?.id ?? "anon"}:${user!.id}:${dayBucket}`,
            payload: {
              text: sellerText,
              recipient: "seller",
              title: pick.title,
              price: askPrice,
              city: pick.city ?? null,
              photos: photosArr,
              thread_id: interestThreadId,
              buyer_user_id: user!.id,
              seller_user_id: pick.seller_id,
              counterpart_user_id: user!.id,
              counterpart_name: user!.display_name || user!.phone_number || "Acheteur",
              negotiation_id: neg?.id ?? null,
              contact: { channel: "whatsapp", whatsapp: vendorPhoneForPush },
            },
            channel: vendorPhoneForPush ? "whatsapp" : "waouh_app",
            delivered_at: new Date().toISOString(),
            delivery_status: "delivered",
          });
        } catch (e: any) {
          if (e?.code !== "23505" && !/duplicate/i.test(e?.message || "")) {
            console.error("[interest] notif insert error", e);
          }
        }
        replyAttachments = firstPhoto ? [{ url: firstPhoto, type: "image/jpeg", caption: pick.title }] : [];
        await bindThreadState(sb, interestThreadId, {
          status: "negotiating",
          negotiation_id: neg?.id ?? null,
        });
        returnedActions = buyerDecisionActions(Math.round(askPrice * 0.9));
        const interestPhotos = Array.isArray(artPhoto?.photos)
          ? artPhoto.photos.filter((url: unknown) => typeof url === "string" && /^https?:\/\//i.test(url as string))
          : (Array.isArray(pick.photos) ? pick.photos.filter((url: unknown) => typeof url === "string") : []);
        const interestProduct = {
          id: pick.id,
          article_id: pick.id,
          title: artPhoto?.title || pick.title || "Article WAOUH",
          description: artPhoto?.description || pick.description || null,
          category: artPhoto?.category || pick.category || pick.categorie || null,
          condition: artPhoto?.condition || pick.condition || null,
          price: Number(artPhoto?.price || askPrice || 0),
          currency: artPhoto?.currency || pick.currency || "XOF",
          photos: interestPhotos,
          city: artPhoto?.city || pick.city || pick.ville || null,
          distance_km: distKm,
          market_price_min: artPhoto?.market_price_min ?? pick.market_price_min ?? null,
          market_price_max: artPhoto?.market_price_max ?? pick.market_price_max ?? null,
          availability: artPhoto?.status === "sold" ? "Vendu" : "Disponible",
          workflow_state: "negotiating",
          role: "buyer",
          thread_id: interestThreadId,
          buyer_user_id: user!.id,
          seller_user_id: pick.seller_id,
          negotiation_id: neg?.id ?? null,
          source: pickSource,
          status_id: clientMeta?.status_id ?? null,
          radar_signal_id: radarBuyerContext?.signal_id ?? pickRadarSignalId ?? null,
          actions: returnedActions,
        };
        returnedProducts = [interestProduct];
        try {
          await sb.from("waouh_interests").upsert({
            thread_id: interestThreadId,
            article_id: pick.id,
            buyer_user_id: user!.id,
            seller_user_id: pick.seller_id,
            source: pickSource,
            payload: {
              thread_id: interestThreadId,
              negotiation_id: neg?.id ?? null,
              status_id: clientMeta?.status_id ?? null,
              radar_signal_id: radarBuyerContext?.signal_id ?? pickRadarSignalId ?? null,
            },
          }, { onConflict: "article_id,buyer_user_id,thread_id", ignoreDuplicates: true });
        } catch (e) { console.warn("[interest] trace insert failed", e); }
        const distLineBuyer = distKm != null ? `\n${fmtDistance(distKm)}` : "";
        reply = `${waouhHeader("✅ Demande envoyée au vendeur")}\n\n📦 *${pick.title}*\n💰 *Prix du vendeur* : ${fmt(askPrice)}${distLineBuyer}\n${firstPhoto ? "📸 *Photo transmise au vendeur*\n" : ""}\n*Que souhaitez-vous faire ?*\n1️⃣ Répondez *OUI* pour accepter ce prix (${fmt(askPrice)}).\n2️⃣ Ou proposez votre prix : *Je propose ${fmt(Math.round(askPrice * 0.9))}*.\n\nLe vendeur attend votre décision.\n\n${waouhFooter()}`;
        try {
          const buyerPhotos = Array.isArray(pick.photos)
            ? (pick.photos as any[]).filter(Boolean)
            : (firstPhoto ? [firstPhoto] : []);
          await sb.from("waouh_notifications").insert({
            thread_id: interestThreadId,
            user_id: user!.id,
            web_session_id: webSessionId,
            article_id: pick.id,
            notification_type: "match_buyer",
            photos: buyerPhotos,
            dedupe_key: `buyer_interest:${neg?.id ?? interestThreadId}:${user!.id}`,
            payload: {
              text: reply,
              recipient: "buyer",
              role: "buyer",
              title: pick.title,
              price: askPrice,
              city: pick.city ?? null,
              photos: buyerPhotos,
              thread_id: interestThreadId,
              buyer_user_id: user!.id,
              seller_user_id: pick.seller_id,
              counterpart_user_id: pick.seller_id,
              counterpart_name: seller?.display_name || seller?.phone_number || "Vendeur",
              negotiation_id: neg?.id ?? null,
              source: pickSource,
              actions: returnedActions,
            },
            channel: "waouh_app",
            delivery_status: "delivered",
            delivered_at: new Date().toISOString(),
          });
        } catch (e: any) {
          if (e?.code !== "23505" && !/duplicate/i.test(e?.message || "")) {
            throw e;
          }
        }
        } // end if (!promotionFailed)
        } // end if (!seller is buyer sibling)
        }
      }

    } else if (intent.intent === "NEGOTIATE" || (offerMatch && conv?.current_article_id)) {
      const amount = offerMatch ? parseInt(offerMatch[1].replace(/[\s.,]/g, ""), 10) : null;
      // 🔒 v8 — Multi-identités : résoudre les siblings (App + WA, LID + phone)
      // pour retrouver la négo même si l'expéditeur WA n'est pas le même
      // waouh_users que celui stocké sur la négo (cas vendeur App répondant
      // depuis son WhatsApp).
      const negSiblingIds = await resolveSiblingUserIds(sb, user as any);
      let neg: any = null;
      let negAmbiguous = false;
      if (clientMeta?.negotiation_id) {
        const { data } = await sb.from("waouh_negotiations").select("*")
          .eq("id", clientMeta.negotiation_id)
          .or(siblingOrFilter(negSiblingIds))
          .in("state", ["proposed", "countered"])
          .maybeSingle();
        neg = data;
      } else if (clientMeta?.thread_id) {
        const { data } = await sb.from("waouh_negotiations").select("*")
          .eq("thread_id", clientMeta.thread_id)
          .or(siblingOrFilter(negSiblingIds))
          .in("state", ["proposed", "countered"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        neg = data;
      } else {
        const { data } = await sb.from("waouh_negotiations").select("*")
          .or(siblingOrFilter(negSiblingIds))
          .in("state", ["proposed", "countered"])
          .order("updated_at", { ascending: false })
          .limit(2);
        negAmbiguous = (data || []).length > 1;
        neg = (data || []).length === 1 ? data![0] : null;
      }
      if (negAmbiguous) {
        reply = "Plusieurs négociations sont actives. Ouvrez le Chat Meet du produit concerné.";
      } else if (!neg) {
        reply = "🤔 Aucune négociation en cours. Recherchez d'abord un produit puis dites *intéressé 1*.";
      } else if (amount) {
        returnedThreadId = neg.thread_id ?? returnedThreadId;
        const isBuyer = negSiblingIds.includes(neg.buyer_user_id);
        const otherId = isBuyer ? neg.seller_user_id : neg.buyer_user_id;
        await sb.from("waouh_negotiations").update({
          state: "countered", last_offer_price: amount, last_actor: isBuyer ? "buyer" : "seller",
        }).eq("id", neg.id);
        returnedTransactionId = null;
        if (otherId) {
          const refPrice = Number(neg.last_offer_price || 0);
          const counterText = `${waouhHeader(isBuyer ? "💬 Nouvelle offre de l'acheteur" : "💬 Contre-offre du vendeur")}\n\n💰 *Montant proposé* : ${fmt(amount)}${refPrice ? `\n📊 *Précédent* : ${fmt(refPrice)}` : ""}\n\nRépondez *OUI* pour accepter, *NON* pour refuser, ou écrivez *Je propose XXX FCFA* pour une autre offre.\n\n${waouhFooter()}`;
          await pushToOther({
            to_user_id: otherId,
            template: "negotiation_open",
            payload: {
              neg_id: neg.id,
              article_id: neg.article_id,
              thread_id: neg.thread_id ?? returnedThreadId,
              buyer_user_id: neg.buyer_user_id,
              seller_user_id: neg.seller_user_id,
              offer: amount,
              price: amount,
              actions: offerDecisionActions(neg.id),
              target_role: isBuyer ? "seller" : "buyer",
              from_user_id: user!.id,
            },
            directText: counterText,
            directMeta: { intent: "negotiation_open", negotiation_id: neg.id, article_id: neg.article_id, thread_id: neg.thread_id ?? returnedThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id },
            transaction_id: null,
            dedupe_key: `neg:${neg.id}:offer:${amount}:${otherId}`,
            event_type: "negotiation_counter",
          });
        }
        returnedArticleId = neg.article_id;
        reply = `💬 ${isBuyer ? "Offre" : "Contre-offre"} de *${fmt(amount)}* transmise. Vous serez notifié de la réponse.`;
      } else {
        returnedThreadId = neg.thread_id ?? returnedThreadId;
        reply = `💬 Indiquez votre prix : « *Je propose ${fmt(neg.last_offer_price || 0)}* »`;
      }
    } else if (intent.intent === "DECIDE_YES" || intent.intent === "DECIDE_NO") {
      // Réponse OUI/NON à une négociation en cours (acheteur OU vendeur)
      const decSiblingIds = await resolveSiblingUserIds(sb, user as any);
      let neg: any = null;
      let negAmbiguous = false;
      if (clientMeta?.negotiation_id) {
        const { data } = await sb.from("waouh_negotiations").select("*")
          .eq("id", clientMeta.negotiation_id)
          .or(siblingOrFilter(decSiblingIds))
          .in("state", ["proposed", "countered"])
          .maybeSingle();
        neg = data;
      } else if (clientMeta?.thread_id) {
        const { data } = await sb.from("waouh_negotiations").select("*")
          .eq("thread_id", clientMeta.thread_id)
          .or(siblingOrFilter(decSiblingIds))
          .in("state", ["proposed", "countered"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        neg = data;
      } else {
        const { data } = await sb.from("waouh_negotiations").select("*")
          .or(siblingOrFilter(decSiblingIds))
          .in("state", ["proposed", "countered"])
          .order("updated_at", { ascending: false })
          .limit(2);
        negAmbiguous = (data || []).length > 1;
        neg = (data || []).length === 1 ? data![0] : null;
      }
      if (negAmbiguous) {
        reply = "Plusieurs négociations sont actives. Ouvrez le Chat Meet du produit concerné.";
      } else if (!neg) {
        reply = "🤔 Aucune négociation en cours. Recherchez d'abord un produit puis dites *intéressé 1*.";
      } else {
        returnedThreadId = neg.thread_id ?? returnedThreadId;
        const isBuyer = decSiblingIds.includes(neg.buyer_user_id);
        const myRole: "buyer" | "seller" = isBuyer ? "buyer" : "seller";
        const otherId = isBuyer ? neg.seller_user_id : neg.buyer_user_id;
        // Garde-fou : on ne peut pas accepter sa propre offre
        if (neg.last_actor === myRole) {
          reply = "⏳ Vous attendez la réponse de l'autre partie. Patientez quelques instants.";
        } else if (intent.intent === "DECIDE_YES") {
          const agreed = Number(neg.last_offer_price || 0);
          await sb.from("waouh_negotiations").update({
            state: "accepted", last_offer_price: agreed, last_actor: myRole, closed_at: new Date().toISOString(),
            meta: { ...(neg.meta || {}), agreed_price: agreed, accepted_by: myRole },
          }).eq("id", neg.id);
          await bindThreadState(sb, neg.thread_id ?? returnedThreadId, {
            status: "accepted",
            negotiation_id: neg.id,
          });
          const { data: art } = await sb.from("waouh_articles").select("title,photos").eq("id", neg.article_id).maybeSingle();
          const title = art?.title || "Article";
          const photo = Array.isArray(art?.photos) && art!.photos.length ? art!.photos[0] : null;
          // Notifier l'autre partie
          if (otherId) {
            const otherIsSeller = isBuyer; // l'autre = vendeur si moi = acheteur
            const otherText = `${waouhHeader("🎉 Accord conclu")}\n\n📦 *${title}*\n💰 *Prix final* : ${fmt(agreed)}\n\n${otherIsSeller ? "L'acheteur accepte votre prix. Contactez-le pour organiser la remise." : "Le vendeur accepte votre offre. Contactez-le pour organiser la remise."}\n\n${waouhFooter()}`;
            await pushToOther({
              to_user_id: otherId,
              template: "deal_accepted",
              payload: { neg_id: neg.id, article_id: neg.article_id, thread_id: neg.thread_id ?? returnedThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id, price: agreed, actions: [] },
              directText: otherText,
              directAtts: photo ? [{ url: photo, type: "image/jpeg", caption: title }] : [],
              directMeta: { intent: "deal_accepted", negotiation_id: neg.id, article_id: neg.article_id, thread_id: neg.thread_id ?? returnedThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id },
              transaction_id: null,
              dedupe_key: `deal_accepted:${neg.id}:${otherId}`,
              event_type: "deal_accepted",
            });
          }
          reply = `${waouhHeader("🎉 Accord conclu")}\n\n📦 *${title}*\n💰 *Prix final* : ${fmt(agreed)}\n\nL'autre partie a été notifiée. Vous pouvez maintenant vous contacter pour organiser la remise.\n\n${waouhFooter()}`;
          returnedArticleId = neg.article_id;
        } else {
          // DECIDE_NO
          await sb.from("waouh_negotiations").update({
            state: "refused", last_actor: myRole, closed_at: new Date().toISOString(),
          }).eq("id", neg.id);
          await bindThreadState(sb, neg.thread_id ?? returnedThreadId, {
            status: "cancelled",
            negotiation_id: neg.id,
          });
          if (otherId) {
            const otherText = `${waouhHeader("❌ Négociation terminée")}\n\n${isBuyer ? "L'acheteur n'a pas accepté la dernière offre." : "Le vendeur n'a pas accepté votre offre."}\nVous pouvez relancer une recherche à tout moment.\n\n${waouhFooter()}`;
            await pushToOther({
              to_user_id: otherId,
              template: "deal_refused",
              payload: { neg_id: neg.id, article_id: neg.article_id, thread_id: neg.thread_id ?? returnedThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id, actions: [] },
              directText: otherText,
              directMeta: { intent: "deal_refused", negotiation_id: neg.id, article_id: neg.article_id, thread_id: neg.thread_id ?? returnedThreadId, buyer_user_id: neg.buyer_user_id, seller_user_id: neg.seller_user_id },
              transaction_id: null,
              dedupe_key: `deal_refused:${neg.id}:${otherId}`,
              event_type: "deal_refused",
            });
          }
          returnedArticleId = neg.article_id;
          reply = `❌ Négociation terminée. L'autre partie a été notifiée.`;
        }
      }
    } else if (intent.intent === "HELP") {
      reply = `${waouhHeader("🤖 WAOUH — Commandes")}\n\n• *Je vends ...* — publier une annonce\n• *Je cherche ...* — trouver un produit\n• *intéressé 1* — contacter un vendeur\n• *Je propose X FCFA* — négocier\n• *OUI* / *NON* — répondre au vendeur ou à l'acheteur\n\n${waouhFooter()}`;
    }


    // Save conversation (avec contexte)
    await sb.from("waouh_conversations").upsert({
      user_id: user!.id,
      phone_number: phone || `web:${webSessionId}`,
      state: intent.intent?.toLowerCase() ?? "idle",
      last_message: text, last_intent: intent.intent,
      channel,
      context: { ...nextContext, current_article_id: returnedArticleId ?? nextContext?.current_article_id ?? conv?.current_article_id ?? null, current_transaction_id: returnedTransactionId ?? nextContext?.current_transaction_id ?? conv?.current_transaction_id ?? null },
      current_article_id: returnedArticleId ?? conv?.current_article_id ?? null,
      current_transaction_id: returnedTransactionId ?? conv?.current_transaction_id ?? null,
    }, { onConflict: "phone_number" } as any);

    // Fire-and-forget: déclenche l'envoi immédiat des notifications en attente (WhatsApp)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-outbound-dispatch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 20 }),
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, intent: intent.intent, reply, attachments: replyAttachments, products: returnedProducts, article_id: returnedArticleId, thread_id: returnedThreadId, search_thread_id: returnedSearchThreadId, transaction_id: returnedTransactionId, actions: returnedActions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
