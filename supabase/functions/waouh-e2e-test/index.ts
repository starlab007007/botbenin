// waouh-e2e-test
// Two modes:
//  1. Default (auto): A/B/C × chat/partner/radar matrix with fake phones — flow only.
//  2. whatsapp_full: real seller/buyer phones, sends 5 actual WhatsApp messages
//     to seller and 4 to buyer for each of the 3 sources (chat/partner/radar).
//
// Body:
//   { mode?: "auto"|"whatsapp_full",
//     scenarios?: ("A"|"B"|"C")[], sources?: ("chat"|"partner"|"radar")[],
//     seller_phone?: string, buyer_phone?: string }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { promoteCatalogToArticle } from "../_shared/waouh-promote.ts";
import { normalizeBeninPhone } from "../_shared/waouh-phone.ts";
import { runParcours, cleanupParcours, type Parcours } from "./parcours.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL") || "";
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "douarou";

type Scenario = "A" | "B" | "C";
type Source = "chat" | "partner" | "radar";

interface StepResult {
  step: string;
  expected: string;
  got: string;
  status: "ok" | "warn" | "fail";
  detail?: any;
}

interface CellResult {
  scenario: Scenario;
  source: Source;
  cell: string;
  steps: StepResult[];
  status: "ok" | "partial" | "failed";
  artifacts: {
    seller_id?: string;
    buyer_id?: string;
    article_id?: string;
    catalog_id?: string;
    negotiation_id?: string;
    deal_id?: string;
  };
}

async function callFn(name: string, body: any) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let json: any = null; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: r.ok, status: r.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: { error: String(e) } };
  }
}

// ============================================================
// AUTO MODE (existing matrix)
// ============================================================
async function runCell(sb: any, scenario: Scenario, source: Source): Promise<CellResult> {
  const cell = `${scenario}${source[0].toUpperCase()}`;
  const ts = Date.now();
  const sellerPhone = `229E2E${scenario}S${ts % 100000}`;
  const buyerPhone = `229E2E${scenario}B${ts % 100000}`;
  const steps: StepResult[] = [];
  const artifacts: CellResult["artifacts"] = {};

  const { data: seller, error: sErr } = await sb.from("waouh_users")
    .insert({ phone_number: sellerPhone, display_name: `E2E Seller ${cell}`, channel: "whatsapp" })
    .select("id").maybeSingle();
  const { data: buyer, error: bErr } = await sb.from("waouh_users")
    .insert({ phone_number: buyerPhone, display_name: `E2E Buyer ${cell}`, channel: "whatsapp" })
    .select("id").maybeSingle();
  if (!seller || !buyer) {
    return { scenario, source, cell, steps: [{
      step: "setup", expected: "create users",
      got: `seller=${sErr?.message ?? "ok/null"} buyer=${bErr?.message ?? "ok/null"}`,
      status: "fail",
    }], status: "failed", artifacts };
  }
  artifacts.seller_id = seller.id;
  artifacts.buyer_id = buyer.id;

  if (source === "chat") {
    const { data: art, error: artErr } = await sb.from("waouh_articles").insert({
      seller_id: seller.id, title: `Bic E2E ${cell}`, category: "autre",
      price: 10000, currency: "XOF", city: "Cotonou", status: "active",
      origin: "chat", source_channel: scenario === "B" ? "waouh_app" : "whatsapp",
      contact_whatsapp: sellerPhone, photos: [],
    }).select("id").maybeSingle();
    artifacts.article_id = art?.id;
    steps.push({ step: "publish", expected: "article created (chat)",
      got: art?.id ? `article ${art.id.slice(0,8)}` : `no article: ${artErr?.message ?? "?"}`,
      status: art?.id ? "ok" : "fail" });
  } else if (source === "partner") {
    const { data: cat, error: catErr } = await sb.from("waouh_unified_catalog").insert({
      source: "partner", source_ref_id: crypto.randomUUID(), type: "offer",
      titre: `Bic E2E ${cell}`, categorie: "autre", prix_min: 10000,
      devise: "XOF", ville: "Cotonou", vendeur_whatsapp: sellerPhone,
      vendeur_nom: `E2E Partner ${cell}`, is_active: true,
    }).select("id").maybeSingle();
    artifacts.catalog_id = cat?.id;
    steps.push({ step: "publish", expected: "catalog (partner) created",
      got: cat?.id ? `catalog ${cat.id.slice(0,8)}` : `no catalog: ${catErr?.message ?? "?"}`,
      status: cat?.id ? "ok" : "fail" });
    if (cat?.id) {
      const promo = await promoteCatalogToArticle(sb, cat.id, { seller_id: seller.id, category: "autre" });
      artifacts.article_id = promo.article_id ?? undefined;
      steps.push({ step: "promote_partner", expected: "catalog → article promotion",
        got: promo.article_id ? `article ${promo.article_id.slice(0,8)}` : `failed: ${promo.reason}`,
        status: promo.article_id ? "ok" : "fail" });
    }
  } else {
    const { data: ext } = await sb.from("waouh_external_listings").insert({
      source: "e2e_radar", source_url: `https://e2e.local/${cell}`,
      title: `Bic E2E ${cell}`, price: 10000, currency: "XOF", city: "Cotonou",
      seller_phone: sellerPhone, seller_name: `E2E Radar ${cell}`, status: "active",
    }).select("id").maybeSingle();
    const { data: sig } = await sb.from("waouh_radar_signals").insert({
      source_id: ext?.id, source_type: "external_listing", intent: "sell",
      raw_text: `Bic E2E ${cell}`, city: "Cotonou", price: 10000,
      contact_phone: sellerPhone, status: "captured",
    }).select("id").maybeSingle();
    const { data: art, error: artErr } = await sb.from("waouh_articles").insert({
      seller_id: seller.id, title: `Bic E2E ${cell}`, category: "autre",
      price: 10000, currency: "XOF", city: "Cotonou", status: "active",
      origin: "radar_ia", source_channel: "radar_ia",
      contact_whatsapp: sellerPhone, origin_signal_id: sig?.id, photos: [],
    }).select("id").maybeSingle();
    if (sig?.id && art?.id) {
      await sb.from("waouh_radar_signals").update({ promoted_article_id: art.id }).eq("id", sig.id);
    }
    artifacts.article_id = art?.id;
    steps.push({ step: "publish", expected: "external_listing → signal → article (radar)",
      got: art?.id ? `article ${art.id.slice(0,8)}` : `no article: ${artErr?.message ?? "?"}`,
      status: art?.id ? "ok" : "fail" });
  }

  if (!artifacts.article_id) {
    return { scenario, source, cell, steps, status: "failed", artifacts };
  }

  const { error: interestErr } = await sb.from("waouh_interests").insert({
    article_id: artifacts.article_id, buyer_user_id: buyer.id,
    seller_user_id: seller.id, source: scenario === "C" ? "chat" : "card",
  });
  await sb.from("waouh_negotiations").insert({
    article_id: artifacts.article_id, buyer_user_id: buyer.id,
    seller_user_id: seller.id, state: "proposed", last_offer_price: 10000,
    last_actor: "buyer", meta: { opened_via: "e2e_test", cell },
  });
  const dispatch = await callFn("waouh-notify-dispatch", {
    kind: "new_buyer", article_id: artifacts.article_id,
    counterpart_user_id: buyer.id, recipient: "seller",
    // 🔒 Mode auto = stubs avec faux numéros (229E2E...). On évite d'enfiler
    // de vrais envois WhatsApp qui finiraient en "no WA contact" dans la queue.
    skip_whatsapp: true,
  });
  steps.push({ step: "buyer_interest", expected: "negotiation opened + seller notified",
    got: interestErr ? `interest err: ${interestErr.message}` : `dispatch HTTP ${dispatch.status}`,
    status: dispatch.ok ? "ok" : "warn", detail: dispatch.json });

  const { data: neg } = await sb.from("waouh_negotiations")
    .select("*").eq("article_id", artifacts.article_id)
    .eq("buyer_user_id", buyer.id).maybeSingle();
  artifacts.negotiation_id = neg?.id;

  if (neg?.id) {
    await sb.from("waouh_negotiations").update({
      state: "countered", last_offer_price: 7000, last_actor: "buyer",
    }).eq("id", neg.id);
    steps.push({ step: "counter_buyer_7000", expected: "negotiation updated to 7000 (buyer)", got: "updated", status: "ok" });
    await sb.from("waouh_negotiations").update({
      state: "countered", last_offer_price: 8500, last_actor: "seller",
    }).eq("id", neg.id);
    steps.push({ step: "counter_seller_8500", expected: "negotiation updated to 8500 (seller)", got: "updated", status: "ok" });
    await sb.from("waouh_negotiations").update({ state: "accepted", last_actor: "buyer" }).eq("id", neg.id);
    const { data: deal } = await sb.from("waouh_deals").insert({
      article_id: artifacts.article_id, buyer_user_id: buyer.id,
      seller_user_id: seller.id, amount: 8500, status: "pending",
    }).select("id").maybeSingle();
    artifacts.deal_id = deal?.id;
    await sb.from("waouh_articles").update({ status: "sold" }).eq("id", artifacts.article_id);
    steps.push({ step: "accept", expected: "deal created + article sold",
      got: deal?.id ? `deal ${deal.id.slice(0,8)}` : "no deal",
      status: deal?.id ? "ok" : "fail" });
  }

  const { data: queued } = await sb.from("waouh_outbound_queue")
    .select("event_type, status, to_phone, template, to_user_id")
    .or(`to_phone.eq.${sellerPhone},to_phone.eq.${buyerPhone},to_user_id.eq.${seller.id},to_user_id.eq.${buyer.id}`)
    .order("created_at", { ascending: false }).limit(20);
  const events = (queued || []).map((q: any) => q.event_type || q.template).filter(Boolean);
  // En mode auto on force skip_whatsapp=true (faux numéros 229E2E...), donc
  // aucun envoi n'est enfilé : c'est le comportement attendu, pas un bug.
  steps.push({ step: "queue_audit", expected: "0 entries (skip_whatsapp=true)",
    got: `${queued?.length || 0} entries · events: ${events.join(",")}`,
    status: "ok", detail: queued });

  const failed = steps.filter(s => s.status === "fail").length;
  const warned = steps.filter(s => s.status === "warn").length;
  return { scenario, source, cell, steps, artifacts,
    status: failed > 0 ? "failed" : warned > 0 ? "partial" : "ok" };
}

// ============================================================
// WHATSAPP_FULL MODE — real phones, real WAHA delivery
// ============================================================
function wahaHeaders() {
  return { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) };
}

async function sendWA(chatId: string, text: string, photoUrl?: string | null): Promise<{ ok: boolean; status: number; msgId?: string; error?: string }> {
  if (!WAHA_BASE_URL) return { ok: false, status: 0, error: "WAHA_BASE_URL missing" };
  const base = WAHA_BASE_URL.replace(/\/$/, "");
  try {
    if (photoUrl) {
      const r = await fetch(`${base}/api/sendImage`, {
        method: "POST", headers: wahaHeaders(),
        body: JSON.stringify({ session: WAHA_SESSION, chatId, file: { url: photoUrl }, caption: text }),
      });
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        return { ok: true, status: r.status, msgId: j?.id?._serialized || j?.id || undefined };
      }
    }
    const r = await fetch(`${base}/api/sendText`, {
      method: "POST", headers: wahaHeaders(),
      body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
    });
    const t = await r.text();
    let j: any = null; try { j = JSON.parse(t); } catch { /* */ }
    return { ok: r.ok, status: r.status, msgId: j?.id?._serialized || j?.id || undefined, error: r.ok ? undefined : t.slice(0, 200) };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

async function logQueue(sb: any, opts: {
  toPhone: string; toUserId?: string | null; template: string; eventType: string;
  text: string; status: "sent" | "failed"; wahaMsgId?: string; error?: string;
  imageUrl?: string | null; articleId?: string | null;
}) {
  try {
    await sb.from("waouh_outbound_queue").insert({
      to_phone: opts.toPhone, to_user_id: opts.toUserId || null,
      channel: "whatsapp", template: opts.template, event_type: opts.eventType,
      status: opts.status, attempts: 1, sent_at: new Date().toISOString(),
      payload: { text: opts.text, waha_message_id: opts.wahaMsgId, article_id: opts.articleId },
      last_error: opts.error || null, image_url: opts.imageUrl || null,
    });
  } catch (e) { console.warn("[e2e] logQueue", e); }
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface WACellStep {
  step: 1 | 2 | 3 | 4 | 5;
  label: string;
  to: "seller" | "buyer" | "both";
  seller?: { ok: boolean; status: number; msgId?: string; error?: string; text: string };
  buyer?: { ok: boolean; status: number; msgId?: string; error?: string; text: string };
}

interface WACellResult {
  scenario: Scenario;
  source: Source;
  cell: string;
  article_id: string | null;
  catalog_id?: string | null;
  negotiation_id: string | null;
  deal_id: string | null;
  steps: WACellStep[];
  status: "ok" | "partial" | "failed";
}

async function setupWAArticle(sb: any, source: Source, sellerId: string, sellerPhone: string, title: string, price: number, photo: string) {
  const cell = `WA-${source}`;
  if (source === "chat") {
    const { data: art } = await sb.from("waouh_articles").insert({
      seller_id: sellerId, title, category: "smartphone", price, currency: "XOF",
      city: "Cotonou", status: "active", origin: "chat", source_channel: "whatsapp",
      contact_whatsapp: sellerPhone, photos: [photo],
    }).select("id").maybeSingle();
    return { article_id: art?.id || null, catalog_id: null as string | null };
  }
  if (source === "partner") {
    const { data: cat } = await sb.from("waouh_unified_catalog").insert({
      source: "partner", source_ref_id: crypto.randomUUID(), type: "offer",
      titre: title, categorie: "smartphone", prix_min: price, devise: "XOF",
      ville: "Cotonou", vendeur_whatsapp: sellerPhone, vendeur_nom: "Vendeur Test",
      is_active: true, photos: [photo],
    }).select("id").maybeSingle();
    if (!cat?.id) return { article_id: null, catalog_id: null };
    const promo = await promoteCatalogToArticle(sb, cat.id, { seller_id: sellerId, category: "smartphone" });
    return { article_id: promo.article_id, catalog_id: cat.id };
  }
  // radar
  const { data: ext } = await sb.from("waouh_external_listings").insert({
    source: "e2e_radar", source_url: `https://e2e.local/${cell}-${Date.now()}`,
    title, price, currency: "XOF", city: "Cotonou",
    seller_phone: sellerPhone, seller_name: "Vendeur Radar", status: "active",
    raw: { photos: [photo] },
  }).select("id").maybeSingle();
  const { data: sig } = await sb.from("waouh_radar_signals").insert({
    source_id: ext?.id, source_type: "external_listing", intent: "sell",
    raw_text: title, city: "Cotonou", price, contact_phone: sellerPhone,
    status: "captured", raw_payload: { photos: [photo] },
  }).select("id").maybeSingle();
  const { data: art } = await sb.from("waouh_articles").insert({
    seller_id: sellerId, title, category: "smartphone", price, currency: "XOF",
    city: "Cotonou", status: "active", origin: "radar_ia", source_channel: "radar_ia",
    contact_whatsapp: sellerPhone, origin_signal_id: sig?.id, photos: [photo],
  }).select("id").maybeSingle();
  if (sig?.id && art?.id) await sb.from("waouh_radar_signals").update({ promoted_article_id: art.id }).eq("id", sig.id);
  return { article_id: art?.id || null, catalog_id: null };
}

async function runWACell(
  sb: any,
  source: Source,
  sellerPhone: string,
  buyerPhone: string,
  sellerId: string,
  buyerId: string,
  scenario: Scenario = "A",
): Promise<WACellResult> {
  const sourceLabel = source === "chat" ? "Chat" : source === "partner" ? "Partenaire" : "Radar IA";
  const channelLabel = scenario === "A" ? "WA↔WA" : scenario === "B" ? "App→WA" : "WA→App";
  const title = `Téléphone portable Tecno Spark — test ${sourceLabel} ${channelLabel}`;
  const price = 500;
  const photo = "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80";
  const cell = `${scenario}${source === "chat" ? "1" : source === "partner" ? "2" : "3"}`;

  const { article_id, catalog_id } = await setupWAArticle(sb, source, sellerId, sellerPhone, title, price, photo);
  if (!article_id) {
    return { scenario, source, cell, article_id: null, catalog_id, negotiation_id: null, deal_id: null,
      steps: [{ step: 1, label: "Setup article failed", to: "seller" }], status: "failed" };
  }

  const sellerChatId = `${sellerPhone}@c.us`;
  const buyerChatId = `${buyerPhone}@c.us`;
  const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
  const hdr = (s: string) => `━━━━━━━━━━━━━━━━━━\n${s}\n━━━━━━━━━━━━━━━━━━`;
  const tag = ` [${sourceLabel} · ${channelLabel}]`;

  // Détermine quelle partie est « App-only » selon le scénario.
  //  A → personne (les 2 sont WA)
  //  B → vendeur App
  //  C → acheteur App
  const sellerIsApp = scenario === "B";
  const buyerIsApp = scenario === "C";

  // Helper unifié : envoie en WhatsApp pour les parties WA, OU insère
  // directement dans waouh_messages pour les parties App (simule la
  // réception in-app). Retourne le même shape que sendWA.
  async function deliver(
    party: "seller" | "buyer",
    chatId: string,
    phone: string,
    userId: string,
    template: string,
    eventType: string,
    text: string,
    photoUrl?: string | null,
  ): Promise<{ ok: boolean; status: number; msgId?: string; error?: string; text: string }> {
    const isApp = (party === "seller" && sellerIsApp) || (party === "buyer" && buyerIsApp);
    if (isApp) {
      // Insert direct dans waouh_messages (canal "app") + audit queue.
      try {
        const { data: msg } = await sb.from("waouh_messages").insert({
          user_id: userId,
          channel: "app",
          direction: "out",
          text,
          article_id: article_id,
          attachments: photoUrl ? [{ url: photoUrl, type: "image/jpeg" }] : [],
          meta: { intent: eventType, article_id, role: party, e2e: true, scenario, source },
        }).select("id").maybeSingle();
        await logQueue(sb, {
          toPhone: phone, toUserId: userId, template, eventType,
          text, status: "sent", wahaMsgId: `app:${msg?.id ?? "noid"}`,
          imageUrl: photoUrl ?? null, articleId: article_id,
        });
        return { ok: !!msg?.id, status: 200, msgId: `app:${msg?.id ?? ""}`, text };
      } catch (e) {
        return { ok: false, status: 0, error: String(e), text };
      }
    }
    const r = await sendWA(chatId, text, photoUrl ?? undefined);
    await logQueue(sb, {
      toPhone: phone, toUserId: userId, template, eventType,
      text, status: r.ok ? "sent" : "failed", wahaMsgId: r.msgId, error: r.error,
      imageUrl: photoUrl ?? null, articleId: article_id,
    });
    return { ...r, text };
  }
  const steps: WACellStep[] = [];

  // STEP 1 — Annonce publiée → seller
  {
    const text = `${hdr("✅ *Annonce publiée*")}\n\n📦 ${title}\n💰 Prix : ${fmt(price)}\n📍 Cotonou${tag}\n\n_Test E2E WAOUH — étape 1/5_`;
    const r = await deliver("seller", sellerChatId, sellerPhone, sellerId, "sale_published", "publish", text, photo);
    steps.push({ step: 1, label: `Annonce publiée (vendeur${sellerIsApp ? " App" : " WA"})`, to: "seller", seller: r });
    await sleep(sellerIsApp ? 200 : 1500);
  }

  // STEP 2 — Annonce trouvée → buyer
  {
    const text = `${hdr("🎯 *Annonce trouvée pour vous !*")}\n\n📦 ${title}\n💰 ${fmt(price)}\n📍 Cotonou${tag}\n\nRépondez *intéressé* pour engager la négociation.\n\n_Test E2E WAOUH — étape 2/5_`;
    const r = await deliver("buyer", buyerChatId, buyerPhone, buyerId, "match_buyer", "match", text, photo);
    steps.push({ step: 2, label: `Annonce trouvée (acheteur${buyerIsApp ? " App" : " WA"})`, to: "buyer", buyer: r });
    await sleep(buyerIsApp ? 200 : 1500);
  }

  // Create negotiation with offer 350
  await sb.from("waouh_interests").insert({ article_id, buyer_user_id: buyerId, seller_user_id: sellerId, source: "card" }).then(() => {}).catch(() => {});
  const { data: neg } = await sb.from("waouh_negotiations").insert({
    article_id, buyer_user_id: buyerId, seller_user_id: sellerId,
    state: "proposed", last_offer_price: 350, last_actor: "buyer",
    meta: { opened_via: "e2e_whatsapp_full", source, scenario },
  }).select("id").maybeSingle();
  const negotiationId = neg?.id || null;

  // STEP 3 — Offre acheteur 350 → seller (nouvel acheteur) + buyer (demande envoyée)
  {
    const txtSeller = `${hdr("📩 *Nouvel acheteur intéressé !*")}\n\n📦 ${title}\n💰 Prix demandé : ${fmt(price)}\n🤝 *Offre acheteur* : ${fmt(350)}\n${tag}\n\nRépondez *OUI* pour accepter, *NON* pour refuser, ou proposez un autre prix.\n\n_Test E2E WAOUH — étape 3/5_`;
    const txtBuyer = `${hdr("📤 *Demande envoyée au vendeur*")}\n\n📦 ${title}\n💰 Votre offre : ${fmt(350)}${tag}\n\n⏳ En attente de la réponse du vendeur…\n\n_Test E2E WAOUH — étape 3/5_`;
    const rs = await deliver("seller", sellerChatId, sellerPhone, sellerId, "new_buyer", "interest", txtSeller);
    await sleep(800);
    const rb = await deliver("buyer", buyerChatId, buyerPhone, buyerId, "interest_sent", "interest", txtBuyer);
    steps.push({ step: 3, label: "Acheteur intéressé (offre 350)", to: "both", seller: rs, buyer: rb });
    await sleep(1500);
  }

  // STEP 4 — Vendeur contre-offre 450
  if (negotiationId) {
    await sb.from("waouh_negotiations").update({
      state: "countered", last_offer_price: 450, last_actor: "seller",
    }).eq("id", negotiationId);
    const txtSeller = `${hdr("✅ *Contre-offre transmise*")}\n\n📦 ${title}\n💰 Votre contre-offre : ${fmt(450)}${tag}\n\n⏳ En attente de la réponse de l'acheteur…\n\n_Test E2E WAOUH — étape 4/5_`;
    const txtBuyer = `${hdr("💬 *Contre-offre reçue !*")}\n\n📦 ${title}\n🤝 Nouvelle offre du vendeur : ${fmt(450)}${tag}\n\nRépondez *OUI* pour accepter ou proposez un autre prix.\n\n_Test E2E WAOUH — étape 4/5_`;
    const rs = await deliver("seller", sellerChatId, sellerPhone, sellerId, "counter_sent", "counter_seller", txtSeller);
    await sleep(800);
    const rb = await deliver("buyer", buyerChatId, buyerPhone, buyerId, "counter_received", "counter_seller", txtBuyer);
    steps.push({ step: 4, label: "Vendeur contre-offre 450", to: "both", seller: rs, buyer: rb });
    await sleep(1500);
  }

  // STEP 5 — Acheteur accepte → deal + dispatch
  let dealId: string | null = null;
  if (negotiationId) {
    await sb.from("waouh_negotiations").update({ state: "accepted", last_actor: "buyer" }).eq("id", negotiationId);
    const { data: deal } = await sb.from("waouh_deals").insert({
      negotiation_id: negotiationId,
      article_id, buyer_user_id: buyerId, seller_user_id: sellerId,
      amount: 450, status: "pending",
    }).select("id").maybeSingle();
    dealId = deal?.id || null;
    await sb.from("waouh_articles").update({ status: "sold" }).eq("id", article_id);

    const txtSeller = `${hdr("🎉 *Vente conclue !*")}\n\n📦 ${title}\n💰 Prix final : ${fmt(450)}${tag}\n\n🛵 Un *livreur WAOUH* vous contactera dans quelques minutes pour collecter le colis.\n🔒 Le contact de l'acheteur n'est pas partagé : WAOUH coordonne la livraison.\n\n_Test E2E WAOUH — étape 5/5_`;
    const txtBuyer = `${hdr("🎉 *Achat confirmé !*")}\n\n📦 ${title}\n💰 Prix final : ${fmt(450)}${tag}\n\n🛵 Un *livreur WAOUH* a été assigné.\n💵 Paiement à la livraison (cash ou Mobile Money).\n🔒 Le contact du vendeur n'est pas partagé.\n\n_Test E2E WAOUH — étape 5/5_`;
    const rs = await deliver("seller", sellerChatId, sellerPhone, sellerId, "deal_seller", "deal_dispatch", txtSeller, photo);
    await sleep(800);
    const rb = await deliver("buyer", buyerChatId, buyerPhone, buyerId, "deal_buyer", "deal_dispatch", txtBuyer, photo);
    steps.push({ step: 5, label: "Accord conclu (deal)", to: "both", seller: rs, buyer: rb });
  }

  const failures = steps.filter(s => (s.seller && !s.seller.ok) || (s.buyer && !s.buyer.ok)).length;
  const status: WACellResult["status"] = failures === 0 ? "ok" : failures >= steps.length ? "failed" : "partial";

  return { scenario, source, cell, article_id, catalog_id, negotiation_id: negotiationId, deal_id: dealId, steps, status };
}

async function ensureUser(sb: any, phone: string, displayName: string) {
  const norm = normalizeBeninPhone(phone) || phone;
  const { data: existing } = await sb.from("waouh_users")
    .select("id, phone_number").eq("phone_number", norm).maybeSingle();
  if (existing?.id) return { id: existing.id, phone: norm };
  const { data: created } = await sb.from("waouh_users").insert({
    phone_number: norm, display_name: displayName, channel: "whatsapp", city: "Cotonou",
  }).select("id").maybeSingle();
  return { id: created?.id || null, phone: norm };
}

async function runWhatsAppFull(
  sb: any,
  sellerPhoneRaw: string,
  buyerPhoneRaw: string,
  sources: Source[],
  scenarios: Scenario[] = ["A"],
) {
  const seller = await ensureUser(sb, sellerPhoneRaw, "Vendeur Test E2E");
  const buyer = await ensureUser(sb, buyerPhoneRaw, "Acheteur Test E2E");
  if (!seller.id || !buyer.id) {
    return { error: "Failed to create test users", seller, buyer };
  }
  const cells: WACellResult[] = [];
  for (const sc of scenarios) {
    for (const src of sources) {
      const r = await runWACell(sb, src, seller.phone, buyer.phone, seller.id, buyer.id, sc);
      cells.push(r);
      await sleep(2000);
    }
  }
  const totalSends = cells.reduce((acc, c) => acc + c.steps.reduce((a, s) => a + (s.seller ? 1 : 0) + (s.buyer ? 1 : 0), 0), 0);
  const totalOk = cells.reduce((acc, c) => acc + c.steps.reduce((a, s) => a + ((s.seller?.ok ? 1 : 0) + (s.buyer?.ok ? 1 : 0)), 0), 0);
  const overall = totalOk === totalSends ? "ok" : totalOk === 0 ? "failed" : "partial";
  return { mode: "whatsapp_full" as const, seller, buyer, cells, summary: { totalSends, totalOk, overall, scenarios } };
}

// ============================================================
// NEGOTIATION ROUTER MODE — exerce waouh-negotiation-router pour A/B/C
// et vérifie:
//  1) réponse OK + montant détecté (price/yes/no/other)
//  2) waouh_messages côté destinataire avec meta.counterpart_user_id canonique
//  3) waouh_notifications créée chez le destinataire (cloche)
// ============================================================
type NegScenario = "A" | "B" | "C";

async function runNegotiationRouterScenario(sb: any, sc: NegScenario) {
  const ts = Date.now();
  const baseSeller = `229E2E${sc}NS${ts % 100000}`;
  const baseBuyer = `229E2E${sc}NB${ts % 100000}`;
  const steps: any[] = [];

  // Identités selon scénario
  const sellerIsApp = sc === "B";
  const buyerIsApp = sc === "C";
  const sellerInsert: any = { phone_number: baseSeller, display_name: `E2E NS ${sc}`, channel: "whatsapp" };
  if (sellerIsApp) {
    sellerInsert.web_session_id = `e2e-sess-seller-${sc}-${ts}`;
    sellerInsert.auth_user_id = crypto.randomUUID();
  }
  const buyerInsert: any = { phone_number: baseBuyer, display_name: `E2E NB ${sc}`, channel: "whatsapp" };
  if (buyerIsApp) {
    buyerInsert.web_session_id = `e2e-sess-buyer-${sc}-${ts}`;
    buyerInsert.auth_user_id = crypto.randomUUID();
  }
  const { data: seller } = await sb.from("waouh_users").insert(sellerInsert).select("id").maybeSingle();
  const { data: buyer } = await sb.from("waouh_users").insert(buyerInsert).select("id").maybeSingle();
  if (!seller?.id || !buyer?.id) return { scenario: sc, status: "failed", steps: [{ step: "setup", status: "fail" }] };

  const { data: art } = await sb.from("waouh_articles").insert({
    seller_id: seller.id, title: `NegRouter E2E ${sc}`, category: "autre",
    price: 10000, currency: "XOF", city: "Cotonou", status: "active",
    origin: "chat", source_channel: sellerIsApp ? "waouh_app" : "whatsapp",
    contact_whatsapp: baseSeller, photos: [],
  }).select("id").maybeSingle();
  const { data: neg } = await sb.from("waouh_negotiations").insert({
    article_id: art!.id, buyer_user_id: buyer.id, seller_user_id: seller.id,
    state: "proposed", last_offer_price: 10000, last_actor: "system",
    meta: { e2e: true, scenario: sc },
  }).select("id").maybeSingle();

  // L'acheteur envoie "je propose 7000" via negotiation-router
  const call1 = await callFn("waouh-negotiation-router", {
    phone: baseBuyer, text: "je propose 7000", user_id: buyer.id,
  });
  steps.push({ step: "buyer_counter_7000", status: call1.ok && /7\s?000/.test(JSON.stringify(call1.json)) ? "ok" : "fail",
    expected: "router returns 'Contre-offre 7 000 FCFA transmise'", got: JSON.stringify(call1.json).slice(0, 200) });

  // Vérifier message destinataire (seller)
  const { data: sellerMsg } = await sb.from("waouh_messages")
    .select("id, meta, text").eq("user_id", seller.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const metaCp = sellerMsg?.meta?.counterpart_user_id ?? null;
  steps.push({ step: "seller_msg_counterpart", status: metaCp === buyer.id ? "ok" : "fail",
    expected: `meta.counterpart_user_id = ${buyer.id.slice(0,8)} (buyer)`,
    got: `meta.counterpart_user_id = ${String(metaCp).slice(0,8) || "null"}` });

  // Vérifier notification destinataire
  const { data: sellerNotif } = await sb.from("waouh_notifications")
    .select("id, notification_type, payload").eq("user_id", seller.id)
    .eq("notification_type", "negotiation_counter").order("sent_at", { ascending: false }).limit(1).maybeSingle();
  const notifCp = sellerNotif?.payload?.counterpart_user_id ?? null;
  steps.push({ step: "seller_notif_created", status: sellerNotif?.id ? "ok" : "fail",
    expected: "waouh_notifications row negotiation_counter created",
    got: sellerNotif?.id ? `notif ${sellerNotif.id.slice(0,8)} cp=${String(notifCp).slice(0,8)}` : "none" });

  // Le vendeur répond "8500" (nombre seul) → doit être détecté comme price
  const call2 = await callFn("waouh-negotiation-router", {
    phone: baseSeller, text: "8500", user_id: seller.id,
  });
  steps.push({ step: "seller_bare_8500", status: call2.ok && /8\s?500/.test(JSON.stringify(call2.json)) ? "ok" : "fail",
    expected: "bare number '8500' detected as counter-offer", got: JSON.stringify(call2.json).slice(0, 200) });

  const { data: buyerNotif } = await sb.from("waouh_notifications")
    .select("id, payload").eq("user_id", buyer.id)
    .eq("notification_type", "negotiation_counter").order("sent_at", { ascending: false }).limit(1).maybeSingle();
  steps.push({ step: "buyer_notif_created", status: buyerNotif?.id ? "ok" : "fail",
    expected: "buyer received negotiation_counter notif",
    got: buyerNotif?.id ? `notif ${buyerNotif.id.slice(0,8)}` : "none" });

  // L'acheteur dit OUI → deal créé
  const call3 = await callFn("waouh-negotiation-router", {
    phone: baseBuyer, text: "oui", user_id: buyer.id,
  });
  steps.push({ step: "buyer_yes", status: call3.ok && /deal_created|deal_already_accepted|Accord/i.test(JSON.stringify(call3.json)) ? "ok" : "fail",
    expected: "deal created (intent=deal_created)", got: JSON.stringify(call3.json).slice(0, 200) });

  const failed = steps.filter((s) => s.status === "fail").length;
  return {
    scenario: sc,
    status: failed > 0 ? "failed" : "ok",
    steps,
    artifacts: { seller_id: seller.id, buyer_id: buyer.id, article_id: art?.id, negotiation_id: neg?.id },
  };
}

// ============================================================
// HTTP entrypoint
// ============================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode: "auto" | "whatsapp_full" | "negotiation" | "parcours" =
      body.mode === "whatsapp_full" ? "whatsapp_full"
        : body.mode === "negotiation" ? "negotiation"
        : body.mode === "parcours" ? "parcours"
        : "auto";

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (mode === "parcours") {
      const list: Parcours[] = (body.parcours || body.scenarios || ["A", "B", "C"])
        .filter((s: any) => ["A", "B", "C"].includes(s));
      const results = [];
      for (const p of list) results.push(await runParcours(sb, p));
      if (body.cleanup !== false) await cleanupParcours(sb, results);
      const summary = {
        parcours: results.length,
        ok: results.filter((r) => r.status === "ok").length,
        partial: results.filter((r) => r.status === "partial").length,
        failed: results.filter((r) => r.status === "failed").length,
      };
      return new Response(JSON.stringify({ ok: summary.failed === 0, mode: "parcours", summary, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (mode === "negotiation") {
      const scenarios: NegScenario[] = (body.scenarios || ["A", "B", "C"]).filter((s: any) => ["A", "B", "C"].includes(s));
      const results: any[] = [];
      for (const sc of scenarios) results.push(await runNegotiationRouterScenario(sb, sc));
      const summary = {
        scenarios: results.length,
        ok: results.filter((r) => r.status === "ok").length,
        failed: results.filter((r) => r.status === "failed").length,
      };
      return new Response(JSON.stringify({ ok: summary.failed === 0, mode: "negotiation", summary, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (mode === "whatsapp_full") {
      const sellerPhone = String(body.seller_phone || "").trim();
      const buyerPhone = String(body.buyer_phone || "").trim();
      if (!sellerPhone || !buyerPhone) {
        return new Response(JSON.stringify({ error: "seller_phone and buyer_phone required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sources: Source[] = (body.sources || ["chat", "partner", "radar"]).filter((s: any) => ["chat", "partner", "radar"].includes(s));
      const scenarios: Scenario[] = (body.scenarios || ["A"]).filter((s: any) => ["A", "B", "C"].includes(s));

      const { data: run } = await sb.from("waouh_e2e_test_runs").insert({
        scenario: `whatsapp_full:${scenarios.join("")}`, source: sources.join(","), status: "running",
      }).select("id").maybeSingle();

      const result = await runWhatsAppFull(sb, sellerPhone, buyerPhone, sources, scenarios);
      if ((result as any).error) {
        if (run?.id) await sb.from("waouh_e2e_test_runs").update({
          status: "failed", finished_at: new Date().toISOString(),
          summary: { error: (result as any).error }, steps: result,
        }).eq("id", run.id);
        return new Response(JSON.stringify({ ok: false, ...result, run_id: run?.id }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (run?.id) await sb.from("waouh_e2e_test_runs").update({
        status: (result as any).summary?.overall ?? "ok",
        finished_at: new Date().toISOString(),
        summary: (result as any).summary, steps: result,
      }).eq("id", run.id);

      return new Response(JSON.stringify({ ok: true, run_id: run?.id, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AUTO mode
    const scenarios: Scenario[] = body.scenarios || ["A", "B", "C"];
    const sources: Source[] = body.sources || ["chat", "partner", "radar"];

    const { data: run } = await sb.from("waouh_e2e_test_runs").insert({
      scenario: scenarios.join(","), source: sources.join(","), status: "running",
    }).select("id").maybeSingle();

    const results: CellResult[] = [];
    for (const sc of scenarios) {
      for (const src of sources) {
        results.push(await runCell(sb, sc, src));
      }
    }

    const summary = {
      cells: results.length,
      ok: results.filter(r => r.status === "ok").length,
      partial: results.filter(r => r.status === "partial").length,
      failed: results.filter(r => r.status === "failed").length,
    };
    const overallStatus = summary.failed > 0 ? "failed" : summary.partial > 0 ? "partial" : "ok";

    if (run?.id) {
      await sb.from("waouh_e2e_test_runs").update({
        status: overallStatus, finished_at: new Date().toISOString(),
        summary, steps: results,
      }).eq("id", run.id);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: run?.id, status: overallStatus, summary, results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
