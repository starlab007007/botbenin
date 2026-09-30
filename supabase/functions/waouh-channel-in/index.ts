import { readWaouhEngineResponse } from "../_shared/waouh-response.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { lidToPhoneInline } from "../_shared/waouh-format.ts";
import { resolveSiblingUserIds, siblingOrFilter } from "../_shared/waouh-identity.ts";
import { isServiceRoleRequest } from "../_shared/waouh-auth.ts";
import { getWaouhModuleControl } from "../_shared/waouh-admin-control.ts";
import { resolveProductThread } from "../_shared/waouh-thread.ts";
import {
  buttonIdFromWahaPayload,
  findActionIdByLabel,
  isSellerAvailabilityText,
  looksLikeActionLabel,
  parseActionPayload,
  parseDealCommand,
} from "../_shared/waouh-commands.ts";
import {
  chatCatalogV3Enabled,
  chatInterestFastPathEnabled,
  chatWriterV2Enabled,
  recordChatMessage,
} from "../_shared/waouh-chat-writer.ts";
import { dealProductCard, openBuyerDeal, publicPhotos } from "../_shared/waouh-deal-open.ts";
import { promoteCatalogToArticle } from "../_shared/waouh-promote.ts";
import {
  decideFastPath,
  isExplicitOfferText,
  metaSignalsAsk,
  metaSignalsInterest,
} from "../_shared/waouh-interest-fastpath.ts";
import { extractOfferAmount } from "../_shared/waouh-negotiation-intent.ts";
import { negotiationActionsV3 } from "../_shared/waouh-commands.ts";
import { renderCatalog, unavailableKey } from "../_shared/waouh-message-catalog.ts";
import {
  contactabilityPolicy,
  scoreFabricSignal,
  type FabricSignal,
} from "../_shared/waouh-signal-fabric.ts";
import { assessQuality, compareUnified, diversifyBySource, qualityAdjustedScore } from "../_shared/waouh-unified-quality.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-waouh-session",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY");
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";

const normalizeBeninPhone = (value: string) => {
  const original = String(value || "");
  if (!original || original.includes("status@broadcast") || original.includes("@g.us")) return null;
  if (original.includes("@lid")) return original.replace(/[^0-9@.a-z]/gi, "");
  const raw = original.replace(/@c\.us/g, "");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("229")) return digits;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `229${digits}`;
  return digits.length > 8 ? digits : null;
};

// Fiche article renvoyée par l'ouverture directe (colonnes de waouh_articles).
type DealArticleRow = { id?: string; seller_id?: string | null; title?: string | null; [key: string]: unknown };

// Colonnes lues pour router une commande : état + dernier acteur/prix servent
// à éviter un doublon d'offre (parcours v3, Lot 1).
const OPEN_NEG_COLUMNS = "id, article_id, thread_id, buyer_user_id, seller_user_id, state, last_actor, last_offer_price";

const WAOUH_BUSINESS_PHONE = normalizeBeninPhone(Deno.env.get("WAOUH_BUSINESS_PHONE") || "65653468") || "22965653468";

type WaouhAction = { id: string; label: string };

/**
 * Canonicalise l'identité d'une carte avant toute écriture/routage.
 * Compatibilité : certaines anciennes builds envoyaient catalog_id dans
 * article_id ; le serveur répare ce cas vers waouh_articles.id.
 */
async function canonicalizeClientProductMeta(sb: any, meta: Record<string, any>) {
  const legacyArticleId =
    typeof meta.article_id === "string" ? meta.article_id.trim() : "";
  let catalogId =
    typeof meta.catalog_id === "string" ? meta.catalog_id.trim() : "";
  const sourceId =
    typeof meta.source_id === "string" ? meta.source_id.trim() : "";
  let articleId = legacyArticleId;

  if (articleId) {
    const { data: article } = await sb.from("waouh_articles")
      .select("id").eq("id", articleId).maybeSingle();
    if (!article?.id) {
      const { data: catalog } = await sb.from("waouh_unified_catalog")
        .select("id,promoted_article_id")
        .eq("id", articleId)
        .maybeSingle();
      if (catalog?.id) {
        catalogId = catalog.id;
        articleId = catalog.promoted_article_id ?? "";
      } else {
        articleId = "";
      }
    }
  }

  if (!catalogId && sourceId) {
    const source = String(meta.source ?? meta.origin_surface ?? "").toLowerCase();
    if (source.includes("partner") || source.includes("catalog")) {
      const { data: catalog } = await sb.from("waouh_unified_catalog")
        .select("id,promoted_article_id")
        .eq("id", sourceId)
        .maybeSingle();
      if (catalog?.id) {
        catalogId = catalog.id;
        articleId = articleId || catalog.promoted_article_id || "";
      }
    }
  }

  if (catalogId && !articleId) {
    try {
      const promoted = await promoteCatalogToArticle(sb, catalogId);
      articleId = promoted.article_id ?? "";
    } catch (error) {
      console.warn(
        "[waouh-channel-in] catalog promotion",
        String((error as any)?.message || error),
      );
    }
  }

  if (!articleId && sourceId) {
    const { data: signal } = await sb.from("waouh_radar_signals")
      .select("promoted_article_id")
      .eq("id", sourceId)
      .maybeSingle();
    if (signal?.promoted_article_id) articleId = signal.promoted_article_id;
  }

  if (catalogId) meta.catalog_id = catalogId;
  if (articleId) {
    if (legacyArticleId && legacyArticleId !== articleId) {
      meta.legacy_product_id = legacyArticleId;
    }
    meta.article_id = articleId;

    const rawButton = String(meta.button_payload ?? "");
    const queryAt = rawButton.indexOf("?");
    const command = queryAt < 0 ? rawButton : rawButton.slice(0, queryAt);
    const suffix = queryAt < 0 ? "" : rawButton.slice(queryAt);
    const m = /^(je-veux|proposer-prix|poser-question):([0-9a-f-]{36})$/i
      .exec(command.trim());
    if (
      m &&
      (!legacyArticleId ||
        m[2].toLowerCase() === legacyArticleId.toLowerCase() ||
        m[2].toLowerCase() === catalogId.toLowerCase())
    ) {
      meta.button_payload = `${m[1]}:${articleId}${suffix}`;
    }
  } else if (legacyArticleId && catalogId) {
    delete meta.article_id;
  }
}

function beninPhoneCandidates(value: string | null | undefined): string[] {
  const canon = normalizeBeninPhone(String(value || ""));
  const out = new Set<string>();
  if (canon) out.add(canon);
  if (canon && canon.startsWith("229") && !canon.includes("@")) {
    const local = canon.slice(3);
    if (local.length === 8) out.add(`22901${local}`);
    if (local.length === 10 && local.startsWith("01")) out.add(`229${local.slice(2)}`);
  }
  return [...out];
}

function log(step: string, data: any = {}) {
  console.log(`[waouh-channel-in] ${step}`, JSON.stringify(data));
}

function wahaHeaders() {
  return { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) };
}

function mediaExt(mime: string) {
  if (/png/i.test(mime)) return "png";
  if (/webp/i.test(mime)) return "webp";
  if (/mp4|video/i.test(mime)) return "mp4";
  return "jpeg";
}

// Télécharge un média (URL WAHA protégée par X-Api-Key) et l'upload dans le bucket public waouh-media.
// Retourne l'URL publique réutilisable par WhatsApp/Web.
async function rehostMedia(sb: any, sourceUrl: string, mime: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (WAHA_API_KEY && WAHA_BASE_URL && sourceUrl.startsWith(WAHA_BASE_URL.replace(/\/$/, ""))) {
      headers["X-Api-Key"] = WAHA_API_KEY;
    }
    const res = await fetch(sourceUrl, { headers });
    if (!res.ok) {
      console.warn("[rehostMedia] fetch failed", res.status, sourceUrl);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;
    const ext = mediaExt(mime);
    const path = `inbound/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("waouh-media").upload(path, buf, {
      contentType: mime || "image/jpeg",
      upsert: false,
    });
    if (error) {
      console.warn("[rehostMedia] upload failed", error.message);
      return null;
    }
    const { data: pub } = sb.storage.from("waouh-media").getPublicUrl(path);
    return pub?.publicUrl || null;
  } catch (e) {
    console.warn("[rehostMedia] exception", e);
    return null;
  }
}

function extractInteractiveText(payload: any) {
  return payload?.body
    || payload?.caption
    || payload?._data?.caption
    || payload?.selectedButtonId
    || payload?.selectedDisplayText
    || payload?.button?.text
    || payload?.button?.id
    || payload?.listResponse?.title
    || payload?.listResponse?.singleSelectReply?.selectedRowId
    || payload?._data?.selectedButtonId
    || payload?._data?.selectedDisplayText
    || "";
}

async function sendWahaText(base: string, session: string, chatId: string, text: string) {
  const cleanBase = base.replace(/\/$/, "");
  const headers = wahaHeaders();
  const direct = await fetch(`${cleanBase}/api/sendText`, {
    method: "POST",
    headers,
    body: JSON.stringify({ session, chatId, text }),
  });
  if (direct.ok) return direct;
  return fetch(`${cleanBase}/api/${session}/sendText`, {
    method: "POST",
    headers,
    body: JSON.stringify({ chatId, text }),
  });
}

async function sendWahaImage(base: string, session: string, chatId: string, imageUrl: string, caption: string) {
  const cleanBase = base.replace(/\/$/, "");
  const headers = wahaHeaders();
  const direct = await fetch(`${cleanBase}/api/sendImage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ session, chatId, file: { url: imageUrl }, caption }),
  });
  if (direct.ok) return direct;
  return fetch(`${cleanBase}/api/${session}/sendImage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ chatId, file: { url: imageUrl }, caption }),
  });
}

async function sendWahaButtons(base: string, session: string, chatId: string, text: string, actions: WaouhAction[], imageUrl?: string | null) {
  const cleanBase = base.replace(/\/$/, "");
  const headers = wahaHeaders();
  const richButtons = actions.slice(0, 3).map((a: any) => {
    if (a.url) return { type: "url", url: a.url, text: a.label };
    if (a.phone) return { type: "call", phoneNumber: a.phone, text: a.label };
    return { type: "reply", reply: { id: a.id, title: a.label } };
  });
  const richBody: any = { session, chatId, body: text, footer: "WAOUH • bot.bj", buttons: richButtons };
  if (imageUrl) richBody.header = { image: { url: imageUrl } };
  let r = await fetch(`${cleanBase}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify(richBody) });
  if (r.ok) return r;
  r = await fetch(`${cleanBase}/api/${session}/sendButtons`, { method: "POST", headers, body: JSON.stringify({ ...richBody, session: undefined }) });
  if (r.ok) return r;
  // Legacy fallback
  const buttons = actions.slice(0, 3).map((a) => ({ id: a.id, text: a.label }));
  r = await fetch(`${cleanBase}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify({ session, chatId, text, buttons }) });
  if (r.ok) return r;
  // Final fallback: keep one WhatsApp bubble only. If media buttons fail,
  // put the choices in the same image caption instead of sending a 2nd text.
  if (imageUrl) {
    const lines = actions.map((a, i) => `${i + 1}. ${a.label}`).join("\n");
    return sendWahaImage(base, session, chatId, imageUrl, `${text}\n\n${lines}`);
  }
  const fallback = `${text}\n\n${actions.map((a, i) => `${i + 1}. ${a.label}`).join("\n")}`;
  return sendWahaText(base, session, chatId, fallback);
}

async function resolveReplyChatIds(sb: any, rawFrom: string | null, phone: string | null): Promise<string[]> {
  const out = new Set<string>();
  if (rawFrom && rawFrom.includes("@")) out.add(rawFrom);
  if (phone && !phone.includes("@")) beninPhoneCandidates(phone).forEach((p) => out.add(`${p}@c.us`));
  if (rawFrom?.includes("@lid")) {
    const lid = rawFrom.replace(/@lid$/, "");
    const { data: maps } = await sb.from("waouh_lid_phone_map")
      .select("phone, phone_e164, jid")
      .or(`lid.eq.${lid},jid.eq.${rawFrom}`)
      .limit(3);
    for (const m of maps || []) {
      const raw = m.phone_e164 || m.phone;
      beninPhoneCandidates(raw).forEach((p) => out.add(`${p}@c.us`));
    }
  }
  return [...out];
}

async function sendWahaReply(base: string, session: string, chatIds: string[], text: string, actions: WaouhAction[] = [], imageUrl?: string | null) {
  let lastError = "";
  for (const chatId of chatIds) {
    const res = actions.length > 0
      ? await sendWahaButtons(base, session, chatId, text, actions, imageUrl)
      : imageUrl
        ? await sendWahaImage(base, session, chatId, imageUrl, text)
        : await sendWahaText(base, session, chatId, text);
    if (res.ok) {
      log("waha reply sent", { chatId, status: res.status });
      return { ok: true, chatId };
    }
    const body = await res.text().catch(() => "");
    lastError = `WAHA ${res.status} ${chatId}: ${body.slice(0, 200)}`;
    console.warn("[waouh-channel-in] waha reply failed", lastError);
  }
  return { ok: false, error: lastError || "no chatId" };
}


type ChatNexusMode = "find_sellers" | "find_buyers";

function chatBudgetMax(text: string, mode: ChatNexusMode): number | null {
  if (mode !== "find_sellers") return null;
  const normalized = String(text || "").replace(/\u00a0/g, " ");
  const explicit = normalized.match(
    /(?:max(?:imum)?|budget|moins\s+de|jusqu['’]?a|jusqu['’]?à)\s*[:=]?\s*(\d[\d\s.,]*)/i,
  );
  const candidate = explicit?.[1] ?? normalized.match(/(\d[\d\s.,]*)\s*(?:fcfa|cfa|xof)\b/i)?.[1] ?? null;
  if (!candidate) return null;
  const digits = candidate.replace(/[^\d]/g, "");
  const value = Number(digits);
  return Number.isFinite(value) && value >= 1 ? value : null;
}

function chatSignalPhoto(signal: any): string[] {
  const evidence = signal?.evidence && typeof signal.evidence === "object" ? signal.evidence : {};
  const photos = Array.isArray(evidence.photos) ? evidence.photos : [];
  const candidates = [...photos, evidence.image_url, evidence.photo, evidence.thumbnail];
  return [...new Set(
    candidates.filter((value) => typeof value === "string" && /^https?:\/\//i.test(value)),
  )].slice(0, 4) as string[];
}

function chatSignalKey(row: any) {
  const title = String(row?.title ?? row?.subject ?? row?.product_name ?? "").toLowerCase().trim();
  const price = Number(row?.price ?? row?.price_min ?? row?.price_max ?? 0) || 0;
  const city = String(row?.city ?? "").toLowerCase().trim();
  return [title, price, city].join("|");
}

async function enrichChatWithSignalFabric(
  sb: any,
  input: {
    intent: string;
    text: string;
    city?: string | null;
    coreResults: any[];
  },
) {
  const intent = String(input.intent || "").toUpperCase();
  if (!["BUY", "SELL"].includes(intent)) {
    return {
      results: input.coreResults,
      intelligence: null,
      source_mix: null,
      signal_fabric: null,
      contactability_level: null,
    };
  }

  const mode: ChatNexusMode = intent === "BUY" ? "find_sellers" : "find_buyers";
  const desired = mode === "find_sellers" ? ["SELL", "ANNOUNCE"] : ["BUY", "RFQ"];
  const budgetMax = chatBudgetMax(input.text, mode);

  try {
    const { data, error } = await sb.from("waouh_signal_fabric")
      .select("*")
      .in("intent", desired)
      .order("observed_at", { ascending: false })
      .limit(2500);
    if (error) throw error;

    const fold = (value: unknown) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const foldedText = fold(input.text);
    const explicitCity = [...new Set(
      (data ?? [])
        .map((signal: any) => signal.city)
        .filter((value: unknown) => typeof value === "string" && value.trim()),
    )].find((candidate: any) => {
      const cityToken = fold(candidate);
      return cityToken.length >= 3 && foldedText.includes(cityToken);
    }) as string | undefined;
    const scoringCity = explicitCity ?? input.city ?? null;

    const scored = (data ?? [])
      .map((signal: FabricSignal) => {
        const scores = scoreFabricSignal({
          query: input.text,
          mode,
          city: scoringCity,
          budgetMax,
          signal,
        });
        // Couche d'unification : même barème de complétude pour toutes les sources (chat, partenaires, WhatsApp, Radar, Nexus, API).
        const quality = assessQuality(signal);
        return {
          ...signal,
          scores,
          quality,
          adjusted: qualityAdjustedScore(scores.total_score, quality),
          contact_policy: contactabilityPolicy(signal.contactability_level),
        };
      });
    // Ouverture : seuil strict d'abord ; si la recherche est pauvre (moins de 6 fiches), seuil élargi pour que le chat exploite aussi
    // les signaux moins proches (Radar, Nexus, API, sites) — ils restent classés après, avec leur phrase de référence.
    const STRICT = (row: any) => row.scores.relevance_score >= 18 && row.scores.total_score >= 32;
    const RELAXED = (row: any) => row.scores.relevance_score >= 10 && row.scores.total_score >= 20;
    const strictRows = scored.filter(STRICT);
    const pool = strictRows.length >= 6 ? strictRows : scored.filter(RELAXED);
    // Les fiches sans photo, prix ni contact passent en dernier ; ailleurs, chaque information manquante retire des points ;
    // aucune source ne peut occuper plus de 4 places (traitement équitable de toutes les sources).
    const ranked = diversifyBySource([...pool].sort(compareUnified), { perSource: 4, max: 20 });

    const sourceMix = ranked.reduce((acc: Record<string, number>, row: any) => {
      const key = String(row.source_key ?? "unknown");
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const rankedByKey = new Map<string, any>();
    const rankedByRecordId = new Map<string, any>();
    for (const row of ranked) {
      rankedByKey.set(chatSignalKey(row), row);
      const evidence =
        row?.evidence && typeof row.evidence === "object" ? row.evidence : {};
      for (const candidateId of [
        evidence.article_id,
        evidence.catalog_id,
        evidence.external_listing_id,
        evidence.buyer_profile_id,
        row.source_record_id,
      ]) {
        if (candidateId != null) rankedByRecordId.set(String(candidateId), row);
      }
    }

    const explainSignal = (row: any) => {
      const scores = row?.scores ?? {};
      const source = String(row?.source_key ?? row?.source ?? "NEXUS");
      const reasons = Array.isArray(scores?.reasons) ? scores.reasons.filter(Boolean) : [];
      const total = Number(scores?.total_score ?? row?.total_score);
      const trust = Number(scores?.trust_score ?? row?.trust_score);
      const price = Number(scores?.price_score ?? row?.price_score);
      const location = Number(scores?.location_score ?? row?.location_score);
      const freshness = Number(scores?.freshness_score ?? row?.freshness_score);
      const contact = String(row?.contactability_level ?? "C0");

      const marketFacts = [
        Number.isFinite(price) ? `prix ${Math.round(price)}%` : null,
        Number.isFinite(location) ? `zone ${Math.round(location)}%` : null,
        Number.isFinite(freshness) ? `fraîcheur ${Math.round(freshness)}%` : null,
      ].filter(Boolean);

      const compareFacts = [
        Number.isFinite(total) ? `match ${Math.round(total)}%` : null,
        Number.isFinite(trust) ? `confiance ${Math.round(trust)}%` : null,
        contact ? `contact ${contact}` : null,
      ].filter(Boolean);

      return {
        market_comparison:
          marketFacts.length > 0
            ? `Lecture marché ${source} · ${marketFacts.join(" · ")}`
            : `Signal marché réel issu de ${source}`,
        comparative_analysis:
          compareFacts.length > 0
            ? `Signal Fabric · ${compareFacts.join(" · ")}`
            : "Signal Fabric · comparaison disponible",
        recommendation:
          reasons.length > 0
            ? reasons.slice(0, 3).join(" · ")
            : Number.isFinite(trust) && trust >= 70
              ? "Confiance élevée · poursuivre sous contrôle WAOUH"
              : "Poursuivre avec l’Avatar et vérifier disponibilité, état et conditions",
        intelligence_provenance: {
          nexus: true,
          signal_fabric: true,
          source,
          contactability_level: contact,
          score: Number.isFinite(total) ? total : null,
          trust_score: Number.isFinite(trust) ? trust : null,
          reasons,
        },
      };
    };

    // Enrichit les cartes historiques sans modifier leur ordre ni leur action.
    // L'index métier reste donc parfaitement aligné avec last_matches.
    const enrichedCore = input.coreResults.map((row: any) => {
      const matched =
        (row?.id != null ? rankedByRecordId.get(String(row.id)) : null) ??
        rankedByKey.get(chatSignalKey(row)) ??
        null;
      if (!matched) return row;
      const scores = matched.scores ?? null;
      const explanation = explainSignal(matched);
      return {
        ...row,
        ...explanation,
        quality: row.quality ?? matched.quality ?? null,
        entity_kind: row.entity_kind ?? matched.quality?.entity_kind ?? null,
        fabric_id: row.fabric_id ?? matched.fabric_id ?? null,
        source_url: row.source_url ?? matched.source_url ?? null,
        intent: row.intent ?? matched.intent ?? null,
        actor_type: row.actor_type ?? matched.actor_type ?? null,
        contactability_level:
          row.contactability_level ?? matched.contactability_level ?? "C0",
        total_score: row.total_score ?? scores?.total_score ?? null,
        relevance_score:
          row.relevance_score ?? scores?.relevance_score ?? null,
        trust_score: row.trust_score ?? scores?.trust_score ?? null,
        price_score: row.price_score ?? scores?.price_score ?? null,
        location_score:
          row.location_score ?? scores?.location_score ?? null,
        freshness_score:
          row.freshness_score ?? scores?.freshness_score ?? null,
        scores: row.scores ?? scores,
        reasons: row.reasons ?? scores?.reasons ?? [],
        evidence: row.evidence ?? matched.evidence ?? null,
      };
    });

    const existing = new Set(enrichedCore.map(chatSignalKey));
    const appended: any[] = [];

    for (const row of ranked) {
      const evidence =
        row?.evidence && typeof row.evidence === "object" ? row.evidence : {};
      const explanation = explainSignal(row);
      const candidate = {
        index: enrichedCore.length + appended.length + 1,
        ...explanation,
        id: String(
          evidence.article_id ??
            evidence.catalog_id ??
            evidence.external_listing_id ??
            row.source_record_id ??
            row.fabric_id ??
            ("signal-" + String(appended.length + 1))
        ),
        fabric_id: row.fabric_id ?? null,
        title: row.subject || row.raw_text || "Opportunité WAOUH",
        price: row.price_min === row.price_max ? row.price_min : null,
        price_min: row.price_min ?? null,
        price_max: row.price_max ?? null,
        city: row.city ?? null,
        condition: row.condition ?? null,
        source: row.source_key ?? "nexus",
        source_url: row.source_url ?? null,
        photos: chatSignalPhoto(row),
        intent: row.intent ?? null,
        actor_type: row.actor_type ?? null,
        contactability_level: row.contactability_level ?? "C0",
        total_score: row.scores?.total_score ?? null,
        relevance_score: row.scores?.relevance_score ?? null,
        trust_score: row.scores?.trust_score ?? null,
        price_score: row.scores?.price_score ?? null,
        location_score: row.scores?.location_score ?? null,
        freshness_score: row.scores?.freshness_score ?? null,
        scores: row.scores ?? null,
        reasons: row.scores?.reasons ?? [],
        evidence,
        action: null,
        quality: row.quality ?? null,
        entity_kind: row.quality?.entity_kind ?? null,
        market_line:
          row.quality?.reference ??
          (mode === "find_buyers"
            ? "Demande détectée par NEXUS · l’Avatar poursuit le rapprochement sous contrôle."
            : "Signal découvert par NEXUS · ouvrez la source publique lorsque disponible."),
      };
      const key = chatSignalKey(candidate);
      if (existing.has(key)) continue;
      existing.add(key);
      appended.push(candidate);
      if (enrichedCore.length + appended.length >= 12) break;
    }

    const results = [...enrichedCore, ...appended].map(
      (row: any, index: number) => ({ ...row, index: index + 1 }),
    );
    const top = ranked[0] as any;
    const confidence =
      top?.scores?.total_score == null
        ? 0.5
        : Math.max(0, Math.min(1, Number(top.scores.total_score) / 100));

    return {
      results,
      intelligence: {
        mode,
        normalized_query: input.text.trim().slice(0, 700),
        city: scoringCity,
        budget_max: budgetMax,
        priorities: [
          "relevance",
          "trust",
          "price",
          "distance",
          "freshness",
          "contactability",
        ],
        source_families: Object.keys(sourceMix),
        missing: [],
        next_actions:
          mode === "find_sellers"
            ? [
                "Comparer les meilleures offres",
                "Vérifier la confiance et le contact",
                "Poursuivre avec l’Avatar",
              ]
            : [
                "Comparer les demandes compatibles",
                "Prioriser les acheteurs contactables",
                "Poursuivre le rapprochement avec l’Avatar",
              ],
        confidence,
        rationale:
          mode === "find_sellers"
            ? "NEXUS complète la recherche historique du chat avec le Signal Fabric."
            : "NEXUS complète la vente avec les demandes BUY/RFQ du Signal Fabric.",
      },
      source_mix: sourceMix,
      signal_fabric: {
        mode,
        candidate_count: (data ?? []).length,
        matched_count: ranked.length,
        appended_count: appended.length,
        top_fabric_ids: ranked.slice(0, 5).map((row: any) => row.fabric_id),
      },
      contactability_level: top?.contactability_level ?? null,
    };
  } catch (error) {
    console.warn("[waouh-channel-in] Signal Fabric enrichment failed", error);
    return {
      results: input.coreResults,
      intelligence: null,
      source_mix: null,
      signal_fabric: { error: "enrichment_unavailable" },
      contactability_level: null,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    if (challenge) return new Response(challenge, { headers: corsHeaders });
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Browser/mobile clients must enter through waouh-channel-in-secure.
    // WAHA and test orchestration are relayed by trusted Edge Functions.
    if (!isServiceRoleRequest(req)) {
      return new Response(JSON.stringify({ ok: false, error: "trusted_relay_required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(SUPABASE_URL, SERVICE);
    const raw = await req.json().catch(() => ({}));
    log("payload", raw);

    let channel: "web" | "whatsapp" = raw.channel ?? "whatsapp";
    let text: string = raw.text ?? "";
    let phone: string | null = raw.phone ?? null;
    let sessionId: string | null = raw.sessionId ?? null;
    let attachments: Array<{ url: string; type: string }> = Array.isArray(raw.attachments) ? raw.attachments : [];
    const lat = raw.lat ?? 6.36;
    const lng = raw.lng ?? 2.42;
    const city = raw.city ?? "Cotonou";
    const authUserId: string | null = raw.authUserId ?? null;
    const clientMeta: Record<string, any> = (raw.meta && typeof raw.meta === "object") ? raw.meta : {};

    // Toutes les surfaces voient désormais le même article canonique.
    await canonicalizeClientProductMeta(sb, clientMeta);

    const surface = String(
      clientMeta.origin_surface ?? clientMeta.source ?? raw.origin_surface ?? raw.source ?? "",
    ).toLowerCase();
    const isAvatarSurface = surface.includes("avatar");
    if (isAvatarSurface) {
      const avatarControl = await getWaouhModuleControl(sb, "avatar_commerce");
      if (!avatarControl.enabled) {
        return new Response(JSON.stringify({
          ok: false,
          error: "avatar_commerce_paused",
          message: avatarControl.maintenance_message || "Le parcours Avatar Commerce est temporairement suspendu.",
        }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const inboundModule = (raw.event && raw.payload) || channel === "whatsapp"
      ? "chat_whatsapp"
      : "chat_web";
    const chatControl = await getWaouhModuleControl(sb, inboundModule);
    if (!chatControl.enabled) {
      return new Response(JSON.stringify({
        ok: false,
        error: `${inboundModule}_paused`,
        message: chatControl.maintenance_message || "Ce canal WAOUH est temporairement suspendu.",
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Traçabilité bout en bout : corrélation fournie par l'UI (fenêtre dédiée).
    const correlationId: string | null = clientMeta?.correlation_id ?? raw.correlation_id ?? null;

    const wahaSession = raw.session || WAHA_SESSION;
    let fromChatId: string | null = null;
    let toPhone: string | null = null;

    // WAHA: { event:"message", session, payload:{ id, from, body, fromMe, hasMedia, mediaUrl, mimetype } }
    if (raw.event && raw.payload) {
      const normalizedFrom = normalizeBeninPhone(raw.payload.from || raw.payload.author || "");
      toPhone = normalizeBeninPhone(raw.payload.to || raw.payload._data?.to || "") || WAOUH_BUSINESS_PHONE;
      if (normalizedFrom === WAOUH_BUSINESS_PHONE) {
        log("skip self/business echo", { from: raw.payload.from });
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "business-self" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (raw.event !== "message" || raw.payload.fromMe || !normalizedFrom) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // 🛡️ Idempotence : WAHA peut émettre "message" et "message.any" pour le même message → on dédupe par event id.
      const wahaEventId = raw.payload.id || raw.id || `${normalizedFrom}:${raw.payload.timestamp || ""}:${(raw.payload.body || "").slice(0, 40)}`;
      if (wahaEventId) {
        const { error: dupErr } = await sb.from("waouh_processed_events").insert({ event_id: String(wahaEventId), source: "waha" });
        if (dupErr && (dupErr.code === "23505" || /duplicate/i.test(dupErr.message))) {
          log("skip duplicate waha event", { wahaEventId });
          return new Response(JSON.stringify({ ok: true, skipped: true, reason: "duplicate" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      channel = "whatsapp";
      phone = normalizedFrom;
      fromChatId = raw.payload.from || `${normalizedFrom}@c.us`;

      // 🔑 Si WAHA livre `<lid>@lid` (privacy mode), on résout immédiatement
      // vers le vrai numéro E.164 pour que TOUT le downstream (notifications
      // "📩 Nouvel acheteur intéressé", contre-offres, accord, livraison)
      // atterrisse réellement sur le WhatsApp de la personne.
      if (phone && /@lid$/i.test(phone)) {
        try {
          const lidDigits = await lidToPhoneInline(sb, phone, { session: wahaSession });
          // ✅ Garde-fou strict : seul un résultat plausible (8 à 12 chiffres, et pas un LID camouflé)
          // peut écraser le phone. Sinon on garde `<lid>@lid` pour redéclencher la résolution plus tard.
          let resolved: string | null = null;
          if (lidDigits && lidDigits.length >= 8 && lidDigits.length <= 12) {
            if (lidDigits.startsWith("229") && (lidDigits.length === 11 || lidDigits.length === 13)) {
              resolved = lidDigits;
            } else if (lidDigits.length === 8) {
              resolved = `229${lidDigits}`;
            } else if (lidDigits.length === 10 && lidDigits.startsWith("01")) {
              resolved = `229${lidDigits}`;
            }
          }
          if (resolved && /^229\d{8,10}$/.test(resolved)) {
            const lidOrig = phone;
            phone = resolved;
            try {
              await sb.from("waouh_users")
                .update({ phone_number: resolved })
                .eq("phone_number", lidOrig);
            } catch (_) { /* ignore */ }
            log("lid resolved", { lid: lidOrig, phone: resolved });
          } else {
            log("lid unresolved — keep @lid", { lid: phone, returned: lidDigits });
          }
        } catch (e) { console.warn("[waouh-channel-in] lid resolve failed", e); }
      }



      text = extractInteractiveText(raw.payload);
      // Identifiant du bouton touché : le texte extrait privilégie le libellé
      // (« 💬 Contre-proposer »), l'identifiant était donc perdu.
      const wahaButtonId = buttonIdFromWahaPayload(raw.payload);
      if (wahaButtonId && !clientMeta.button_payload) clientMeta.button_payload = wahaButtonId;
      const mime = raw.payload.mimetype || raw.payload.media?.mimetype || raw.payload._data?.mimetype || "image/jpeg";
      const hasInboundMedia = raw.payload.hasMedia || raw.payload.media || raw.payload.mediaUrl || raw.payload._data?.deprecatedMms3Url;
      const derivedMediaUrl = hasInboundMedia && raw.payload.id && WAHA_BASE_URL
        ? `${WAHA_BASE_URL.replace(/\/$/, "")}/api/files/${wahaSession}/${raw.payload.id}.${mediaExt(mime)}`
        : null;
      const candidateUrl = raw.payload.mediaUrl || raw.payload.media?.url || derivedMediaUrl || raw.payload._data?.deprecatedMms3Url;
      if (candidateUrl && !String(candidateUrl).startsWith("/") && /^image\//i.test(mime)) {
        const publicUrl = await rehostMedia(sb, candidateUrl, mime);
        if (publicUrl) {
          attachments.push({ url: publicUrl, type: mime });
        } else if (/^https?:\/\//i.test(candidateUrl)) {
          attachments.push({ url: candidateUrl, type: mime });
        }
      } else if (candidateUrl && /^https?:\/\//i.test(candidateUrl)) {
        attachments.push({ url: candidateUrl, type: mime });
      }
    }

    const chatId = fromChatId || (phone ? (phone.includes("@") ? phone : `${phone}@c.us`) : "");
    const replyChatIds = channel === "whatsapp"
      ? await resolveReplyChatIds(sb, fromChatId, phone)
      : [chatId].filter(Boolean);

    if ((!text && attachments.length === 0) || (!phone && !sessionId)) {
      return new Response(JSON.stringify({ ok: false, error: "missing text/attachments or identifier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert user
    let user: any = null;
    if (channel === "web") {
      const { data: existing } = await sb.from("waouh_users").select("*").eq("web_session_id", sessionId).maybeSingle();
      user = existing;
      if (!user) {
        const { data: created, error } = await sb.from("waouh_users").insert({
          web_session_id: sessionId, channel: "web", city,
          auth_user_id: authUserId,
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
        }).select().single();
        if (error) log("user insert error", error);
        user = created;
      } else if (authUserId && !user.auth_user_id) {
        await sb.from("waouh_users").update({ auth_user_id: authUserId, city }).eq("id", user.id);
        // Lot 1 : sans cette ligne, les identités sœurs (compte App) restaient
        // invisibles pour la suite de la requête et la négociation ouverte par
        // waouh-buyer-interest n'était pas retrouvée (« Aucune négociation »).
        user.auth_user_id = authUserId;
      } else if (city && city !== user.city) {
        await sb.from("waouh_users").update({ city }).eq("id", user.id);
      }
    } else {
      const { data: existing } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle();
      user = existing;
      if (!user) {
        const { data: created } = await sb.from("waouh_users").insert({
          phone_number: phone, channel: "whatsapp", city,
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
        }).select().single();
        user = created;
      }
    }
    log("user", { id: user?.id });

    // Upsert conversation so the operator-side app can subscribe by conversation_id.
    // We key on user_id + channel (one open conversation per user/channel).
    const convPhone = phone || (sessionId ? `web:${sessionId}` : "unknown");
    let convId: string | null = null;
    {
      const { data: existingConv } = await sb
        .from("waouh_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("phone_number", convPhone)
        .maybeSingle();
      if (existingConv?.id) {
        convId = existingConv.id;
      } else {
        const { data: createdConv } = await sb
          .from("waouh_conversations")
          .insert({ user_id: user.id, phone_number: convPhone, state: "active" })
          .select("id")
          .single();
        convId = createdConv?.id ?? null;
      }
    }

    // Persist incoming
    const inboundArticleId: string | null = clientMeta?.article_id ?? null;
    const { data: inboundRow } = await sb.from("waouh_messages").insert({
      conversation_id: convId,
      user_id: user.id, channel, direction: "in", text: text || "(image)",
      web_session_id: sessionId, phone_number: phone,
      attachments,
      article_id: inboundArticleId,
      thread_id: clientMeta?.thread_id ?? null,
      meta: { ...clientMeta, to_phone: toPhone || WAOUH_BUSINESS_PHONE, session: wahaSession },
    }).select("id").maybeSingle();
    const inboundMessageId: string | null = inboundRow?.id ?? null;

    // === Real "interested buyer" signal ===
    // If the inbound message is tagged with an article (match chat window),
    // notify the seller ONCE per (article, buyer) pair. This replaces the old
    // publication-time seller spam.
    const articleIdFromMeta: string | null = clientMeta?.article_id ?? null;
    let actorIsArticleSeller = false;
    let legacyNewBuyerNotify: (() => Promise<void>) | null = null;
    const fastPathEnabled = await chatInterestFastPathEnabled(sb);
    if (articleIdFromMeta) {
      try {
        const { data: art } = await sb
          .from("waouh_articles")
          .select("id, seller_id")
          .eq("id", articleIdFromMeta)
          .maybeSingle();
        const buyerKey = clientMeta?.buyer_profile_id || user.id;
        // Lot 1 : seller_id est un waouh_users.id ; l'ancienne comparaison avec
        // l'identifiant d'authentification était toujours fausse (le vendeur
        // recevait « nouvel acheteur » pour ses propres messages).
        if (art?.seller_id) {
          const actorIds = await resolveSiblingUserIds(sb, user);
          actorIsArticleSeller = actorIds.includes(art.seller_id);
        }
        const isSeller = actorIsArticleSeller;
        // Avec l'ouverture directe, la notification vendeur part avec la
        // négociation et ses boutons (waouh-deal-open) : pas de doublon ici.
        if (art?.seller_id && !isSeller) {
          legacyNewBuyerNotify = async () => {
            const dedupeId = `new_buyer:${articleIdFromMeta}:${buyerKey}`;
            const { error: dupErr } = await sb
              .from("waouh_processed_events")
              .insert({ event_id: dedupeId, source: "new_buyer" });
            if (!dupErr) {
              fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
                method: "POST",
                headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  kind: "new_buyer",
                  article_id: articleIdFromMeta,
                  buyer_profile_id: clientMeta?.buyer_profile_id ?? null,
                  counterpart_user_id: user.id,
                  recipient: "seller",
                }),
              }).catch(() => {});
            }
          };
          // Sans ouverture directe : notification immédiate (comportement historique).
          // Avec : envoyée plus bas seulement si le message n'ouvre pas la
          // discussion (sinon la notification part avec la négociation).
          if (!fastPathEnabled) {
            await legacyNewBuyerNotify();
            legacyNewBuyerNotify = null;
          }
        }
      } catch (e) {
        console.warn("[waouh-channel-in] new_buyer dispatch failed", e);
      }
    }



    // WhatsApp sans identifiant de bouton : retrouver l'action par son libellé
    // parmi les dernières actions proposées à cette personne (toutes identités).
    if (channel === "whatsapp" && !clientMeta.button_payload && looksLikeActionLabel(text)) {
      try {
        const labelSiblingIds = await resolveSiblingUserIds(sb, user);
        const { data: recentWithActions } = await sb.from("waouh_messages")
          .select("meta")
          .in("user_id", labelSiblingIds)
          .eq("direction", "out")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(30);
        const recoveredId = findActionIdByLabel(
          (recentWithActions || []).map((row: any) => row?.meta?.actions),
          text,
        );
        if (recoveredId) clientMeta.button_payload = recoveredId;
      } catch (e) {
        console.warn("[waouh-channel-in] button label recovery failed", e);
      }
    }
    // Le bouton désigne lui-même sa négociation / son deal.
    const payloadCommand = parseActionPayload(clientMeta.button_payload);
    if (payloadCommand?.scope === "negotiation" && !clientMeta.negotiation_id) {
      clientMeta.negotiation_id = payloadCommand.targetId;
    }
    if (payloadCommand?.scope === "deal" && !clientMeta.deal_id) {
      clientMeta.deal_id = payloadCommand.targetId;
    }

    // Negotiation + Deal Graph routing.
    // A commercial decision is always scoped to one exact thread/deal. Article-only
    // routing is allowed only when the counterpart is explicit or a single open
    // negotiation exists for the actor.
    const metaArticleId: string | null = clientMeta?.article_id ?? null;
    const metaThreadId: string | null = clientMeta?.thread_id ?? null;
    const metaNegotiationId: string | null = clientMeta?.negotiation_id ?? null;
    const metaCounterpartId: string | null =
      clientMeta?.counterpart_user_id ?? clientMeta?.buyer_user_id ?? clientMeta?.buyer_profile_id ?? null;
    const metaRole: "buyer" | "seller" | null =
      clientMeta?.role === "seller" || clientMeta?.role === "buyer" ? clientMeta.role : null;

    const siblingIds = await resolveSiblingUserIds(sb, user);

    // Deterministic post-agreement commands. These never pass through the LLM.
    let dealCommand = parseDealCommand(text, clientMeta);

    // Texte naturel vendeur : « je confirme », « article disponible », etc.
    // On ne l'interprète que si UN SEUL deal du vendeur attend sa confirmation,
    // éventuellement déjà borné par le thread/article fourni par le client.
    if (!dealCommand && isSellerAvailabilityText(text)) {
      let q: any = sb.from("waouh_deals")
        .select("id,thread_id,article_id,negotiation_id")
        .in("seller_user_id", siblingIds)
        .is("seller_confirmed_at", null)
        .in("status", ["awaiting_confirmation", "pending_assignment"]);
      if (metaThreadId) q = q.eq("thread_id", metaThreadId);
      if (metaArticleId) q = q.eq("article_id", metaArticleId);
      const { data: candidates } = await q
        .order("created_at", { ascending: false })
        .limit(2);
      if ((candidates || []).length === 1) {
        dealCommand = { action: "seller_confirm", dealId: candidates[0].id };
      }
    }

    if (dealCommand) {
      const dealBody: Record<string, any> = {
        action: dealCommand.action,
        deal_id: dealCommand.dealId,
        actor_user_id: user.id,
        ...(dealCommand.method ? { method: dealCommand.method } : {}),
      };
      const dealRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-deal-ops`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify(dealBody),
      });
      // Une action refusée (mauvaise étape, déjà traitée…) est une issue
      // conversationnelle : on répond au lieu de lever une erreur (avant :
      // HTTP 500, aucune réponse côté WhatsApp, « Message non envoyé » côté web).
      let dealData: Record<string, any>;
      let dealActionOk = true;
      try {
        dealData = await readWaouhEngineResponse(dealRes.clone());
      } catch (_) {
        dealActionOk = false;
        const failed = await dealRes.json().catch(() => ({} as Record<string, any>));
        dealData = (failed && typeof failed === "object" && !Array.isArray(failed)) ? failed : {};
      }
      const dealReply = String(
        (typeof dealData?.reply === "string" && dealData.reply.trim()) ||
        (dealActionOk ? "✅ Action enregistrée." : "Cette action n'est pas disponible à cette étape.")
      );
      const dealActions: WaouhAction[] = Array.isArray(dealData?.actions) ? dealData.actions : [];
      const dealThreadId = dealData?.thread_id ?? metaThreadId ?? null;
      const dealArticleId = dealData?.article_id ?? metaArticleId ?? null;

      // L'entrée utilisateur (clic bouton ou texte naturel) doit appartenir au
      // même fil canonique que la réponse. Avant, les boutons post-accord
      // conservaient thread_id=NULL côté message entrant.
      if (inboundMessageId && dealThreadId) {
        await sb.from("waouh_messages")
          .update({ thread_id: dealThreadId, article_id: dealArticleId })
          .eq("id", inboundMessageId)
          .is("thread_id", null);
      }

      let dealRow: { id: string } | null = null;
      if (dealThreadId && await chatWriterV2Enabled(sb)) {
        const written = await recordChatMessage({
          sb,
          threadId: dealThreadId,
          recipientUserId: user.id,
          text: dealReply,
          channel,
          intent: dealData?.intent ?? (dealActionOk ? "deal_action" : "deal_action_blocked"),
          actions: dealActions,
          correlationId,
          payloadExtra: {
            workflow_state: dealData?.workflow_state ?? null,
            deal_id: dealCommand.dealId,
            transaction_id: dealData?.transaction_id ?? clientMeta?.transaction_id ?? null,
            button_payload: clientMeta?.button_payload ?? null,
          },
          enqueueWhatsapp: false,
          conversationId: convId,
          phoneNumber: phone,
        });
        if (written.ok && written.recipientMessageId) dealRow = { id: written.recipientMessageId };
      }
      if (!dealRow) ({ data: dealRow } = await sb.from("waouh_messages").insert({
        conversation_id: convId,
        thread_id: dealThreadId,
        user_id: user.id,
        channel,
        direction: "out",
        text: dealReply,
        web_session_id: sessionId,
        phone_number: phone,
        attachments: [],
        article_id: dealArticleId,
        meta: {
          ...clientMeta,
          intent: dealData?.intent ?? (dealRes.ok ? "deal_action" : "deal_action_blocked"),
          workflow_state: dealData?.workflow_state ?? null,
          deal_id: dealCommand.dealId,
          transaction_id: dealData?.transaction_id ?? clientMeta?.transaction_id ?? null,
          thread_id: dealThreadId,
          article_id: dealArticleId,
          actions: dealActions,
          correlation_id: correlationId,
        },
      }).select("id").maybeSingle());

      if (convId) {
        await sb.from("waouh_conversations")
          .update({ last_message: dealReply, updated_at: new Date().toISOString() })
          .eq("id", convId);
      }
      if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
        try {
          await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, dealReply, dealActions);
        } catch (e) {
          console.error("[waouh-channel-in] deal reply WAHA failed", e);
        }
      }

      return new Response(JSON.stringify({
        ...dealData,
        ok: true,
        action_ok: dealActionOk && dealData?.ok !== false,
        reply: dealReply,
        outbound_message_id: dealRow?.id ?? null,
        inbound_message_id: inboundMessageId,
        conversation_id: convId,
        user_id: user.id,
        article_id: dealArticleId,
        thread_id: dealThreadId,
        deal_id: dealCommand.dealId,
        actions: dealActions,
        correlation_id: correlationId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    type OpenNeg = {
      id: string;
      article_id: string | null;
      thread_id: string | null;
      buyer_user_id: string | null;
      seller_user_id: string | null;
      state?: string | null;
      last_actor?: string | null;
      last_offer_price?: number | null;
    };
    let openNeg: OpenNeg | null = null;
    let ambiguousNegotiation = false;

    if (metaNegotiationId) {
      const { data } = await sb.from("waouh_negotiations")
        .select(OPEN_NEG_COLUMNS)
        .eq("id", metaNegotiationId)
        .or(siblingOrFilter(siblingIds))
        .in("state", ["proposed", "countered"])
        .maybeSingle();
      openNeg = data as OpenNeg | null;
    }

    if (!openNeg && metaThreadId) {
      const { data } = await sb.from("waouh_negotiations")
        .select(OPEN_NEG_COLUMNS)
        .eq("thread_id", metaThreadId)
        .or(siblingOrFilter(siblingIds))
        .in("state", ["proposed", "countered"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      openNeg = data as OpenNeg | null;
    }

    if (!openNeg && metaArticleId && metaCounterpartId && metaRole) {
      let q: any = sb.from("waouh_negotiations")
        .select(OPEN_NEG_COLUMNS)
        .eq("article_id", metaArticleId)
        .in("state", ["proposed", "countered"]);
      if (metaRole === "seller") {
        q = q.eq("buyer_user_id", metaCounterpartId).in("seller_user_id", siblingIds);
      } else {
        q = q.eq("seller_user_id", metaCounterpartId).in("buyer_user_id", siblingIds);
      }
      const { data } = await q.order("updated_at", { ascending: false }).limit(1).maybeSingle();
      openNeg = data as OpenNeg | null;
    }

    // Lot 1 : un message qui porte son article cherche d'abord la négociation
    // DE CET article. Avant, la recherche « globale » ci-dessous pouvait
    // appliquer un prix à la négociation d'un autre produit.
    let articleScopedLookupDone = false;
    const scopedArticleId: string | null = payloadCommand?.scope === "article"
      ? payloadCommand.targetId
      : metaArticleId;
    if (!openNeg && scopedArticleId && fastPathEnabled && !actorIsArticleSeller && metaRole !== "seller") {
      articleScopedLookupDone = true;
      // Côté ACHETEUR uniquement : un vendeur peut avoir plusieurs acheteurs
      // sur le même article ; sans fil ni contrepartie, on ne devine pas.
      const { data } = await sb.from("waouh_negotiations")
        .select(OPEN_NEG_COLUMNS)
        .eq("article_id", scopedArticleId)
        .in("buyer_user_id", siblingIds)
        .in("state", ["proposed", "countered"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      openNeg = data as OpenNeg | null;
    }

    if (!openNeg && !articleScopedLookupDone) {
      const { data } = await sb.from("waouh_negotiations")
        .select(OPEN_NEG_COLUMNS)
        .or(siblingOrFilter(siblingIds))
        .in("state", ["proposed", "countered"])
        .order("updated_at", { ascending: false })
        .limit(2);
      const candidates = (data || []) as OpenNeg[];
      if (candidates.length === 1) openNeg = candidates[0];
      else if (candidates.length > 1) ambiguousNegotiation = true;
    }

    // Auto-heal legacy negotiations that predate the canonical Deal Room link.
    // If the exact thread does not exist yet, create it from the authoritative
    // article/buyer/seller relation before routing a state-changing command.
    if (openNeg && !openNeg.thread_id) {
      const repairArticleId = openNeg.article_id ?? metaArticleId ?? null;

      if (!openNeg.seller_user_id && repairArticleId) {
        const { data: repairArticle } = await sb.from("waouh_articles")
          .select("seller_id,status")
          .eq("id", repairArticleId)
          .maybeSingle();
        if (repairArticle?.seller_id && repairArticle.status !== "sold") {
          await sb.from("waouh_negotiations")
            .update({ seller_user_id: repairArticle.seller_id })
            .eq("id", openNeg.id);
          openNeg.seller_user_id = repairArticle.seller_id;
        }
      }

      let repairThreadId: string | null = metaThreadId;
      if (!repairThreadId && repairArticleId && openNeg.buyer_user_id && openNeg.seller_user_id) {
        const { data: repairThread } = await sb.from("waouh_chat_threads")
          .select("id")
          .eq("thread_type", "product_meet")
          .eq("article_id", repairArticleId)
          .eq("buyer_user_id", openNeg.buyer_user_id)
          .eq("seller_user_id", openNeg.seller_user_id)
          .not("status", "in", "(cancelled,concluded)")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        repairThreadId = repairThread?.id ?? null;
      }

      if (!repairThreadId && repairArticleId && openNeg.buyer_user_id && openNeg.seller_user_id) {
        const inferredRole: "buyer" | "seller" = metaRole ??
          (siblingIds.includes(openNeg.seller_user_id) ? "seller" : "buyer");
        const counterpartUserId = inferredRole === "seller"
          ? openNeg.buyer_user_id
          : openNeg.seller_user_id;
        try {
          const createdThread = await resolveProductThread({
            sb,
            articleId: repairArticleId,
            actorUser: user,
            role: inferredRole,
            counterpartUserId,
            buyerUserId: openNeg.buyer_user_id,
            sellerUserId: openNeg.seller_user_id,
            source: "legacy_repair",
            create: true,
          });
          repairThreadId = createdThread?.id ?? null;
        } catch (error) {
          console.warn("[waouh-channel-in] legacy thread repair failed", error);
        }
      }

      if (repairThreadId) {
        await Promise.all([
          sb.from("waouh_negotiations")
            .update({ thread_id: repairThreadId })
            .eq("id", openNeg.id),
          sb.from("waouh_chat_threads")
            .update({ negotiation_id: openNeg.id, updated_at: new Date().toISOString() })
            .eq("id", repairThreadId),
        ]);
        openNeg.thread_id = repairThreadId;
        try {
          await sb.rpc("waouh_record_commerce_event", {
            p_event_type: "negotiation_thread_repaired",
            p_entity_type: "negotiation",
            p_entity_id: openNeg.id,
            p_thread_id: repairThreadId,
            p_article_id: repairArticleId,
            p_negotiation_id: openNeg.id,
            p_actor_user_id: user.id,
            p_actor_role: metaRole,
            p_previous_state: null,
            p_next_state: "thread_bound",
            p_correlation_id: correlationId,
            p_payload: { source: "waouh_channel_in" },
          });
        } catch (_) { /* ledger is best-effort for legacy recovery */ }
      }
    }

    // Choisit l'identité sibling stockée dans la négociation.
    let negUserId: string = user.id;
    if (openNeg) {
      if (metaRole === "seller" && openNeg.seller_user_id) {
        negUserId = openNeg.seller_user_id;
      } else if (metaRole === "buyer" && openNeg.buyer_user_id) {
        negUserId = openNeg.buyer_user_id;
      } else if (openNeg.seller_user_id && siblingIds.includes(openNeg.seller_user_id)) {
        negUserId = openNeg.seller_user_id;
      } else if (openNeg.buyer_user_id && siblingIds.includes(openNeg.buyer_user_id)) {
        negUserId = openNeg.buyer_user_id;
      }
    }

    const lowerText = (text || "").toLowerCase();
    const metaAction = String(clientMeta?.commerce_action ?? clientMeta?.action ?? "").trim().toLowerCase();
    const metaButtonPayload = String(clientMeta?.button_payload ?? "").trim().toLowerCase();

    // A generic WAOUH assistant request must stay in the core chat even when the
    // user also has an open negotiation. Previously every non-search message was
    // diverted to waouh-negotiation-router, so smart-composer prompts such as
    // "Comparer top 3", "Préparer une stratégie..." and "Continuer à chercher"
    // hit a Deal Room/thread guard and surfaced as HTTP 409 -> "Message non envoyé".
    const shouldStayInCore =
      clientMeta?.assistant_prompt === true ||
      metaAction === "assistant_prompt" ||
      /^(?:assistant[._-]|smart[._-])/.test(metaAction) ||
      /(?:int[ée]ress[ée]|interesse)\s*(?:n[°o]?\s*)?(?:x|\d+)|\b(?:je\s+)?(?:cherche|recherche|vends|compare|continuer?|prépare|prepare)\b/i.test(lowerText);

    // Route only explicit, state-changing negotiation commands to the Deal Room.
    // Discussion/analysis *about* a negotiation remains a normal assistant turn.
    const negotiationMetaAction = /^(?:accept|accept_offer|counter|counter_offer|reject|reject_offer|negotiate|offer|negotiation_accept|negotiation_counter|negotiation_reject)$/.test(metaAction);
    const explicitNegotiationCommand =
      negotiationMetaAction ||
      /^(?:accepter|contre-proposition|refuser):/i.test(metaButtonPayload) ||
      /^(?:oui|ok|d['’]?accord|j['’]?accepte|accepte|yes|non|no|je\s+refuse|refuse|je\s+propose|propose|contre[-\s]?proposition|contre[-\s]?proposer|accepter|refuser)(?:\b|:)/i.test(text.trim()) ||
      /^\d[\d\s.,]{2,}\s*(?:fcfa|cfa|f)?$/i.test(text.trim());

    // Sécurité UX commerce : une offre/contre-offre saisie librement dans une
    // négociation existante ne modifie jamais le prix au premier envoi.
    // Le serveur demande d'abord « CONFIRMER ». Cette protection couvre aussi
    // WhatsApp et le fallback historique Web/Flutter si le contrat V3 est
    // momentanément indisponible. Elle ne touche pas aux étapes de paiement.
    const actorRoleForNegotiation: "buyer" | "seller" | null = openNeg
      ? (openNeg.seller_user_id && siblingIds.includes(openNeg.seller_user_id)
        ? "seller"
        : openNeg.buyer_user_id && siblingIds.includes(openNeg.buyer_user_id)
          ? "buyer"
          : metaRole)
      : metaRole;
    let confirmedPendingOffer: { amount: number; negotiationId: string; threadId: string } | null = null;
    const confirmOfferText = /^confirmer(?:\s+(?:l['’]?offre|cette\s+offre))?[.!]?$/i.test(String(text || "").trim());
    if (confirmOfferText && openNeg?.thread_id) {
      try {
        const { data: recentPrompts } = await sb.from("waouh_messages")
          .select("created_at,meta")
          .eq("thread_id", openNeg.thread_id)
          .eq("user_id", user.id)
          .eq("direction", "out")
          .order("created_at", { ascending: false })
          .limit(10);
        const cutoff = Date.now() - 15 * 60_000;
        for (const row of recentPrompts || []) {
          const pendingOffer = (row?.meta as any)?.pending_offer;
          if (!pendingOffer || (row?.meta as any)?.intent !== "offer_confirmation_required") continue;
          if (new Date(row.created_at).getTime() < cutoff) continue;
          if (String(pendingOffer.negotiation_id || "") !== String(openNeg.id)) continue;
          const amount = Number(pendingOffer.amount || 0);
          if (!Number.isFinite(amount) || amount <= 0) continue;
          confirmedPendingOffer = { amount: Math.round(amount), negotiationId: openNeg.id, threadId: openNeg.thread_id };
          break;
        }
      } catch (e) {
        console.warn("[waouh-channel-in] pending offer lookup failed", e);
      }
    }

    const typedOfferForConfirmation = extractOfferAmount(text);
    const sameOwnOffer =
      !!openNeg &&
      typedOfferForConfirmation != null &&
      Number(openNeg.last_offer_price || 0) === typedOfferForConfirmation &&
      String(openNeg.last_actor || "").toLowerCase() === String(actorRoleForNegotiation || "").toLowerCase();

    if (
      openNeg?.thread_id &&
      typedOfferForConfirmation != null &&
      isExplicitOfferText(text) &&
      !sameOwnOffer &&
      !confirmedPendingOffer &&
      !String(clientMeta?.button_payload || "").trim()
    ) {
      const amount = Math.round(typedOfferForConfirmation);
      const prompt = `Confirmez-vous l'offre de ${amount.toLocaleString("fr-FR")} FCFA ? Répondez « CONFIRMER » pour l'envoyer, ou saisissez un autre montant.`;
      const pendingOffer = {
        action: "offer",
        amount,
        negotiation_id: openNeg.id,
        thread_id: openNeg.thread_id,
        article_id: openNeg.article_id,
        confirmed: true,
      };

      if (inboundMessageId) {
        await sb.from("waouh_messages")
          .update({ thread_id: openNeg.thread_id, article_id: openNeg.article_id })
          .eq("id", inboundMessageId);
      }

      let confirmationMessageId: string | null = null;
      if (await chatWriterV2Enabled(sb)) {
        const written = await recordChatMessage({
          sb,
          threadId: openNeg.thread_id,
          recipientUserId: user.id,
          text: prompt,
          channel,
          intent: "offer_confirmation_required",
          actions: [],
          correlationId,
          payloadExtra: {
            pending_offer: pendingOffer,
            negotiation_id: openNeg.id,
            workflow_state: openNeg.state,
          },
          enqueueWhatsapp: false,
          conversationId: convId,
          phoneNumber: phone,
        });
        if (written.ok) confirmationMessageId = written.recipientMessageId;
      }
      if (!confirmationMessageId) {
        const { data: confirmationRow } = await sb.from("waouh_messages").insert({
          conversation_id: convId,
          thread_id: openNeg.thread_id,
          user_id: user.id,
          channel,
          direction: "out",
          text: prompt,
          web_session_id: sessionId,
          phone_number: phone,
          article_id: openNeg.article_id,
          attachments: [],
          meta: {
            intent: "offer_confirmation_required",
            pending_offer: pendingOffer,
            negotiation_id: openNeg.id,
            thread_id: openNeg.thread_id,
            article_id: openNeg.article_id,
            role: actorRoleForNegotiation,
            actions: [],
            correlation_id: correlationId,
          },
        }).select("id").maybeSingle();
        confirmationMessageId = confirmationRow?.id ?? null;
      }

      if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
        try {
          await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, prompt, []);
        } catch (e) {
          console.error("[waouh-channel-in] offer confirmation WAHA failed", e);
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        intent: "offer_confirmation_required",
        commerce_event: "offer_pending_confirmation",
        reply: prompt,
        pending: pendingOffer,
        actions: [],
        thread_id: openNeg.thread_id,
        negotiation_id: openNeg.id,
        article_id: openNeg.article_id,
        stage: "negotiation",
        workflow_state: openNeg.state,
        inbound_message_id: inboundMessageId,
        outbound_message_id: confirmationMessageId,
        conversation_id: convId,
        user_id: user.id,
        correlation_id: correlationId,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // =====================================================================
    // Parcours v3 — Lot 1 : ouverture directe de la Deal Room.
    // Un message qui porte un article (bouton de fiche, intérêt, prix) ouvre
    // ou reprend le fil + la négociation et renvoie thread_id/negotiation_id
    // dans CETTE réponse : plus de « Aucune négociation en cours », plus de
    // Deal Room provisoire côté Flutter. Interrupteur : chat_interest_fastpath.
    // =====================================================================
    let routerTextOverride: string | null = null;
    let forceRouter = false;
    if (confirmedPendingOffer && openNeg) {
      forceRouter = true;
      routerTextOverride = `je propose ${confirmedPendingOffer.amount}`;
      // Le « CONFIRMER » appartient au même fil que l'offre en attente.
      if (inboundMessageId) {
        await sb.from("waouh_messages")
          .update({ thread_id: confirmedPendingOffer.threadId, article_id: openNeg.article_id })
          .eq("id", inboundMessageId);
      }
    }
    {
      const articleButton = payloadCommand?.scope === "article" ? payloadCommand : null;
      const fastArticleId: string | null = articleButton?.targetId ?? metaArticleId;
      const metaOffer = Number(clientMeta?.offer_price ?? clientMeta?.initial_offer_amount ?? NaN);
      const textOffer = articleButton ? null : extractOfferAmount(text);
      const offerAmount = textOffer ?? (Number.isFinite(metaOffer) && metaOffer > 0 ? Math.round(metaOffer) : null);
      const negOnArticle = openNeg && fastArticleId && openNeg.article_id === fastArticleId ? openNeg : null;
      let sellerOfArticle = actorIsArticleSeller;
      if (fastPathEnabled && articleButton && fastArticleId !== articleIdFromMeta) {
        const { data: btnArticle } = await sb.from("waouh_articles").select("seller_id").eq("id", fastArticleId).maybeSingle();
        sellerOfArticle = !!btnArticle?.seller_id && siblingIds.includes(btnArticle.seller_id);
      }
      const decision = decideFastPath({
        // Un bouton de négociation ou de deal garde son propre chemin.
        enabled: !confirmedPendingOffer && fastPathEnabled && payloadCommand?.scope !== "negotiation" && payloadCommand?.scope !== "deal",
        articleId: fastArticleId,
        actorIsSeller: sellerOfArticle,
        metaRole,
        articleButtonKind: articleButton?.kind ?? null,
        interestSignal: metaSignalsInterest(clientMeta),
        askSignal: metaSignalsAsk(clientMeta),
        offerAmount,
        explicitOffer: isExplicitOfferText(text) || (textOffer == null && offerAmount != null),
        shouldStayInCore,
        // Le texte n'est que le libellé du bouton (sinon : question tapée).
        textIsLabel: !String(text || "").trim() || looksLikeActionLabel(text),
        text,
        openNegotiation: negOnArticle
          ? { id: negOnArticle.id, lastActor: negOnArticle.last_actor ?? null, lastOfferPrice: negOnArticle.last_offer_price ?? null }
          : null,
      });

      if (decision.kind !== "none" && fastArticleId) {
        const catalogV3 = await chatCatalogV3Enabled(sb);
        const buyerIdForDeal = negOnArticle?.buyer_user_id && siblingIds.includes(negOnArticle.buyer_user_id)
          ? negOnArticle.buyer_user_id
          : user.id;

        const respond = async (out: {
          reply: string;
          intent: string;
          commerceEvent: string;
          actions?: WaouhAction[];
          threadId: string | null;
          negotiationId: string | null;
          article: DealArticleRow | null;
          stage: string;
          workflowState: string;
          ok?: boolean;
          extra?: Record<string, unknown>;
        }) => {
          const outActions = (out.actions ?? []).slice(0, 3);
          const sellerId: string | null = out.article?.seller_id ?? null;
          const photos = publicPhotos(out.article);
          const attachments = photos.slice(0, 1).map((url) => ({ url, type: "image/jpeg", caption: out.article?.title ?? "" }));
          const products = out.article
            ? [dealProductCard({
              article: out.article,
              threadId: out.threadId,
              negotiationId: out.negotiationId,
              buyerUserId: buyerIdForDeal,
              role: "buyer",
              actions: outActions,
              workflowState: out.workflowState,
            })]
            : [];
          const payloadExtra = {
            workflow_state: out.workflowState,
            stage: out.stage,
            commerce_event: out.commerceEvent,
            negotiation_id: out.negotiationId,
            button_payload: clientMeta?.button_payload ?? null,
            products,
            ...(out.extra ?? {}),
          };
          // Le message de l'acheteur rejoint le fil dès maintenant.
          if (inboundMessageId && out.threadId) {
            await sb.from("waouh_messages")
              .update({ thread_id: out.threadId, article_id: fastArticleId })
              .eq("id", inboundMessageId)
              .is("thread_id", null);
          }
          let outboundId: string | null = null;
          if (out.threadId && await chatWriterV2Enabled(sb)) {
            const written = await recordChatMessage({
              sb,
              threadId: out.threadId,
              recipientUserId: user.id,
              text: out.reply,
              channel,
              attachments,
              intent: out.intent,
              actions: outActions,
              correlationId,
              payloadExtra,
              enqueueWhatsapp: false,
              conversationId: convId,
              phoneNumber: phone,
            });
            if (written.ok) outboundId = written.recipientMessageId;
          }
          if (!outboundId) {
            const { data: row } = await sb.from("waouh_messages").insert({
              conversation_id: convId,
              thread_id: out.threadId,
              user_id: user.id, channel, direction: "out", text: out.reply,
              web_session_id: sessionId, phone_number: phone,
              attachments,
              article_id: fastArticleId,
              meta: {
                ...payloadExtra,
                intent: out.intent,
                thread_id: out.threadId,
                article_id: fastArticleId,
                counterpart_user_id: sellerId,
                buyer_user_id: buyerIdForDeal,
                seller_user_id: sellerId,
                role: "buyer",
                actions: outActions,
                correlation_id: correlationId,
              },
            }).select("id").maybeSingle();
            outboundId = row?.id ?? null;
          }
          if (convId) {
            await sb.from("waouh_conversations")
              .update({ last_message: out.reply, current_article_id: fastArticleId, updated_at: new Date().toISOString() })
              .eq("id", convId);
          }
          if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
            try {
              await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, out.reply, outActions, photos[0] ?? null);
            } catch (e) { console.error("[waouh-channel-in] fast path WAHA failed", e); }
          }
          return new Response(JSON.stringify({
            ok: out.ok ?? true,
            reply: out.reply,
            // « match_buyer » : intention déjà reconnue par le Web pour ouvrir la
            // fenêtre dédiée ; Flutter lit thread_id directement.
            intent: out.intent,
            commerce_event: out.commerceEvent,
            stage: out.stage,
            workflow_state: out.workflowState,
            role: "buyer",
            turn: out.workflowState === "awaiting_counterparty" ? "seller" : "buyer",
            actions: outActions,
            products,
            attachments,
            thread_id: out.threadId,
            negotiation_id: out.negotiationId,
            article_id: fastArticleId,
            counterpart_user_id: sellerId,
            buyer_user_id: buyerIdForDeal,
            seller_user_id: sellerId,
            outbound_message_id: outboundId,
            inbound_message_id: inboundMessageId,
            conversation_id: convId,
            user_id: user.id,
            correlation_id: correlationId,
            ...(out.extra ?? {}),
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        };

        const legacyAmount = (n: number | null | undefined) =>
          `${Math.round(Number(n || 0)).toLocaleString("fr-FR")} FCFA`;

        if (decision.kind === "awaiting") {
          const { data: art } = await sb.from("waouh_articles")
            .select("id,seller_id,title,description,category,condition,price,currency,photos,city,market_price_min,market_price_max,status")
            .eq("id", fastArticleId).maybeSingle();
          return await respond({
            reply: catalogV3
              ? renderCatalog("awaiting_counterparty", { amount: decision.amount, role: "buyer" }).text
              : `✅ Votre offre de ${legacyAmount(decision.amount)} est bien transmise au vendeur. En attente de sa réponse.`,
            intent: "match_buyer",
            commerceEvent: "offer_already_sent",
            threadId: negOnArticle?.thread_id ?? null,
            negotiationId: negOnArticle?.id ?? null,
            article: art,
            stage: "negotiation",
            workflowState: "awaiting_counterparty",
          });
        }

        if (decision.kind === "relay_question") {
          const opened = await openBuyerDeal({
            sb, articleId: fastArticleId, buyerUserId: buyerIdForDeal, source: "chat_question",
            supabaseUrl: SUPABASE_URL, serviceRole: SERVICE, notifySeller: "never",
            rejectUnavailable: false, catalogV3, correlationId, openNegotiation: false,
          });
          if (opened.ok && opened.threadId && opened.sellerUserId) {
            const questionText = catalogV3
              ? `${renderCatalog("question_received", { question: decision.question }).title}\n${decision.question}`
              : `❓ Question de l'acheteur sur « ${opened.article?.title ?? "votre article"} » :\n${decision.question}`;
            let relayed = false;
            if (await chatWriterV2Enabled(sb)) {
              const w = await recordChatMessage({
                sb, threadId: opened.threadId, recipientUserId: opened.sellerUserId,
                text: questionText, intent: "buyer_question", correlationId,
                payloadExtra: { question: decision.question, from_user_id: buyerIdForDeal },
                enqueueWhatsapp: true,
              });
              relayed = w.ok;
            }
            if (!relayed) {
              await sb.from("waouh_messages").insert({
                thread_id: opened.threadId, user_id: opened.sellerUserId, channel: "system", direction: "out",
                text: questionText, article_id: fastArticleId,
                meta: {
                  intent: "buyer_question", thread_id: opened.threadId, article_id: fastArticleId,
                  counterpart_user_id: buyerIdForDeal, buyer_user_id: buyerIdForDeal,
                  seller_user_id: opened.sellerUserId, role: "seller", actions: [],
                },
              });
            }
          }
          return await respond({
            reply: opened.ok
              ? (catalogV3 ? renderCatalog("question_sent", { role: "buyer" }).text : "✅ Question transmise au vendeur. Sa réponse arrivera ici.")
              : (catalogV3 ? renderCatalog("technical_error").text : "⚠️ Votre question n'a pas pu être transmise. Rien n'a été envoyé : réessayez."),
            intent: "match_buyer",
            commerceEvent: opened.ok ? "question_sent" : "question_failed",
            threadId: opened.threadId,
            negotiationId: opened.negotiationId,
            article: opened.article,
            stage: opened.negotiationId ? "negotiation" : "interest",
            workflowState: opened.negotiationId ? (opened.negotiationState ?? "proposed") : "interest_recorded",
            ok: opened.ok,
          });
        }

        // Discussion déjà ouverte : on la rouvre avec l'offre en cours et, si
        // c'est au tour de l'acheteur, ses boutons de décision.
        const respondResume = async (r: {
          threadId: string | null;
          negotiationId: string | null;
          negotiationState: string | null;
          lastActor: string | null;
          lastPrice: number | null;
          article: DealArticleRow | null;
        }) => {
          const resumeTitle = r.article?.title ?? "l'article";
          const waits = String(r.lastActor || "").toLowerCase() === "buyer";
          const buyerActions: WaouhAction[] = !waits && r.negotiationId
            ? (catalogV3
              ? negotiationActionsV3(r.negotiationId, { amount: r.lastPrice })
              : [
                { id: `accepter:${r.negotiationId}`, label: "✅ Accepter" },
                { id: `contre-proposition:${r.negotiationId}`, label: "💬 Contre-proposer" },
                { id: `refuser:${r.negotiationId}`, label: "❌ Refuser" },
              ])
            : [];
          return await respond({
            reply: catalogV3
              ? renderCatalog(waits ? "awaiting_counterparty" : "deal_already_open", { title: resumeTitle, amount: r.lastPrice, role: "buyer" }).text
              : `✅ Discussion déjà ouverte\n\n📦 ${resumeTitle}\n💰 Offre en cours : ${legacyAmount(r.lastPrice)}\n\n${waits ? "En attente de la réponse du vendeur." : "Acceptez, refusez ou proposez un autre montant."}`,
            intent: "match_buyer",
            commerceEvent: "deal_resumed",
            actions: buyerActions,
            threadId: r.threadId,
            negotiationId: r.negotiationId,
            article: r.article,
            stage: r.negotiationId ? "negotiation" : "interest",
            workflowState: waits ? "awaiting_counterparty" : (r.negotiationState ?? "proposed"),
          });
        };

        // Reprise d'une négociation connue : aucune écriture, aucun doublon.
        if (decision.kind === "resume" && negOnArticle?.thread_id) {
          const { data: art } = await sb.from("waouh_articles")
            .select("id,seller_id,title,description,category,condition,price,currency,photos,city,market_price_min,market_price_max,status")
            .eq("id", fastArticleId).maybeSingle();
          return await respondResume({
            threadId: negOnArticle.thread_id,
            negotiationId: negOnArticle.id,
            negotiationState: negOnArticle.state ?? null,
            lastActor: negOnArticle.last_actor ?? null,
            lastPrice: negOnArticle.last_offer_price ?? null,
            article: art,
          });
        }

        const opened = await openBuyerDeal({
          sb,
          articleId: fastArticleId,
          buyerUserId: buyerIdForDeal,
          source: articleButton ? "product_card" : (String(clientMeta?.origin_surface ?? clientMeta?.source ?? channel) || "chat"),
          offer: decision.kind === "open" ? decision.offer : null,
          supabaseUrl: SUPABASE_URL,
          serviceRole: SERVICE,
          notifySeller: "on_create",
          echoBuyer: false,
          rejectUnavailable: true,
          catalogV3,
          correlationId,
          openNegotiation: decision.kind === "open" || decision.kind === "resume",
        });

        if (!opened.ok) {
          const code = opened.code ?? "thread_failed";
          if (code === "self") {
            return await respond({
              reply: catalogV3
                ? renderCatalog("self_article").text
                : "🤔 Vous êtes le vendeur de cet article. Vous ne pouvez pas vous y intéresser vous-même.",
              intent: "self_article", commerceEvent: "self_article",
              threadId: null, negotiationId: null, article: opened.article,
              stage: "interest", workflowState: "blocked", ok: true,
            });
          }
          if (code === "article_unavailable") {
            return await respond({
              reply: catalogV3
                ? renderCatalog(unavailableKey(opened.article?.status)).text
                : "⏳ Cet article n'est plus disponible. Relancez une recherche pour voir des articles proches.",
              intent: "article_unavailable", commerceEvent: "article_unavailable",
              threadId: null, negotiationId: null, article: opened.article,
              stage: "interest", workflowState: "unavailable", ok: true,
            });
          }
          // Échec technique : on laisse le chemin historique répondre (aucune
          // régression), le client garde la main sur « Réessayer ».
          console.warn("[waouh-channel-in] fast path open failed", code);
        } else {
          const article = opened.article;
          const title = article?.title ?? "l'article";
          const lastPrice = opened.lastOfferPrice ?? opened.offerPrice;

          if (decision.kind === "open_thread") {
            const suggested = Math.max(100, Math.round((Number(article?.price || 0) * 0.9) / 25) * 25);
            return await respond({
              reply: decision.prompt === "offer"
                ? (catalogV3
                  ? renderCatalog("counter_prompt", { suggested: Number(article?.price || 0) > 0 ? suggested : null }).text
                  : `💬 Indiquez votre prix pour « ${title} », par exemple : *je propose ${legacyAmount(suggested)}*.`)
                : (catalogV3
                  ? renderCatalog("question_prompt", { role: "buyer" }).text
                  : `❓ Écrivez votre question sur « ${title} », le vendeur la reçoit ici.`),
              intent: "match_buyer",
              commerceEvent: decision.prompt === "offer" ? "offer_prompt" : "question_prompt",
              threadId: opened.threadId,
              negotiationId: opened.negotiationId,
              article,
              stage: opened.negotiationId ? "negotiation" : "interest",
              workflowState: opened.negotiationId ? (opened.negotiationState ?? "proposed") : "interest_recorded",
              extra: { composer: decision.prompt === "offer" ? { mode: "amount", suggested } : { mode: "question" } },
            });
          }

          // Négociation reprise et nouveau montant : le routeur canonique
          // applique la contre-offre (transition atomique, notification vendeur).
          if (!opened.created && decision.kind === "open" && decision.offer != null &&
              opened.negotiationId && Number(lastPrice) !== decision.offer) {
            openNeg = {
              id: opened.negotiationId,
              article_id: fastArticleId,
              thread_id: opened.threadId,
              buyer_user_id: buyerIdForDeal,
              seller_user_id: opened.sellerUserId,
              state: opened.negotiationState,
              last_actor: opened.lastActor,
              last_offer_price: opened.lastOfferPrice,
            };
            negUserId = buyerIdForDeal;
            forceRouter = true;
            routerTextOverride = `je propose ${decision.offer}`;
          } else if (opened.created) {
            return await respond({
              reply: catalogV3
                ? renderCatalog("deal_opened", { title, amount: opened.offerPrice, sellerNotified: opened.sellerNotified }).text
                : `✅ Offre envoyée au vendeur\n\n📦 ${title}\n💰 ${legacyAmount(opened.offerPrice)}\n\nLe vendeur a été prévenu. Sa réponse arrivera ici.`,
              intent: "match_buyer",
              commerceEvent: "deal_opened",
              threadId: opened.threadId,
              negotiationId: opened.negotiationId,
              article,
              stage: "negotiation",
              workflowState: "awaiting_counterparty",
            });
          } else {
            return await respondResume({
              threadId: opened.threadId,
              negotiationId: opened.negotiationId,
              negotiationState: opened.negotiationState,
              lastActor: opened.lastActor,
              lastPrice,
              article,
            });
          }
        }
      }
    }

    // Message avec article non pris en charge par l'ouverture directe : la
    // notification « nouvel acheteur » historique part quand même.
    if (legacyNewBuyerNotify && !forceRouter) await legacyNewBuyerNotify();

    // Un bouton de négociation agit sur SA négociation, jamais sur une autre
    // trouvée par défaut (ex. « Accepter » touché sur une offre déjà close,
    // alors qu'une autre négociation est ouverte).
    if (payloadCommand?.scope === "negotiation" && (!openNeg || openNeg.id !== payloadCommand.targetId)) {
      const staleReply = "⏳ Cette offre n'est plus active (déjà acceptée, refusée ou remplacée par une nouvelle offre). Répondez depuis le dernier message de la négociation.";
      const { data: staleRow } = await sb.from("waouh_messages").insert({
        conversation_id: convId,
        user_id: user.id, channel, direction: "out", text: staleReply,
        web_session_id: sessionId, phone_number: phone,
        attachments: [],
        article_id: clientMeta?.article_id ?? null,
        thread_id: clientMeta?.thread_id ?? null,
        meta: {
          intent: "negotiation_button_stale",
          negotiation_id: payloadCommand.targetId,
          button_payload: clientMeta?.button_payload ?? null,
          correlation_id: correlationId,
          actions: [],
        },
      }).select("id").maybeSingle();
      if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
        try {
          await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, staleReply, []);
        } catch (e) { console.error("[waouh-channel-in] stale button reply failed", e); }
      }
      return new Response(JSON.stringify({
        ok: true,
        action_ok: false,
        intent: "negotiation_button_stale",
        reply: staleReply,
        actions: [],
        negotiation_id: payloadCommand.targetId,
        outbound_message_id: staleRow?.id ?? null,
        inbound_message_id: inboundMessageId,
        conversation_id: convId,
        user_id: user.id,
        correlation_id: correlationId,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!openNeg && ambiguousNegotiation && !shouldStayInCore && explicitNegotiationCommand) {
      return new Response(JSON.stringify({
        ok: false,
        code: "thread_required",
        reply: "Ouvrez le Deal Room du produit concerné pour répondre à cette négociation.",
        inbound_message_id: inboundMessageId,
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (openNeg && (forceRouter || (!shouldStayInCore && explicitNegotiationCommand))) {
      const negRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-negotiation-router`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          text: routerTextOverride ?? text,
          user_id: negUserId,
          thread_id: forceRouter ? openNeg.thread_id : (metaThreadId ?? openNeg.thread_id ?? null),
          negotiation_id: forceRouter ? openNeg.id : (metaNegotiationId ?? openNeg.id),
          button_payload: forceRouter ? null : (clientMeta?.button_payload ?? null),
        }),
      });
      const negConflictFallback = negRes.clone();
      let negData: any;
      try {
        negData = await readWaouhEngineResponse(negRes);
      } catch (error) {
        if (negRes.status !== 409) {
          // Échec technique du routeur : on répond quand même, sans rien valider.
          console.error("[waouh-channel-in] negotiation router failed", negRes.status, error);
        }
        const failureBody = await negConflictFallback.json().catch(() => ({} as Record<string, any>));
        const conflict = negRes.status === 409
          ? failureBody
          : {
            intent: failureBody?.error === "negotiation_paused" ? "negotiation_paused" : "negotiation_unavailable",
            // Message du routeur s'il en donne un (ex. négociation suspendue par l'admin).
            reply: (typeof failureBody?.reply === "string" && failureBody.reply.trim()) ||
              (typeof failureBody?.message === "string" && failureBody.message.trim()) ||
              "⚠️ Votre réponse n'a pas pu être traitée pour le moment. Rien n'a été validé : réessayez dans un instant.",
          };
        // A thread/context conflict is a valid conversational outcome, not a
        // transport failure. Return its explanation as an assistant reply so
        // the mobile/web chat never leaves the user's message unanswered.
        negData = {
          ...conflict,
          ok: true,
          intent: conflict?.intent ?? "negotiation_context_required",
          reply: conflict?.reply ?? "Ouvrez le Deal Room du produit concerné pour poursuivre cette négociation.",
          actions: Array.isArray(conflict?.actions) ? conflict.actions : [],
        };
      }
      const negReply = negData?.reply ?? "";
      const negTxId = negData?.transaction_id || null;
      const negIntent = negData?.intent || "negotiation";
      const negActions: WaouhAction[] = Array.isArray(negData?.actions) ? negData.actions : [];
      const negAttachments = Array.isArray(negData?.attachments) ? negData.attachments : [];
      const suppressDirectReply = negData?.suppress_direct_reply === true;
      const negResults = Array.isArray(negData.results) ? negData.results : [];
      const negProducts = Array.isArray(negData.products) ? negData.products : [];
      const negIntelligence = negData?.intelligence ?? negData?.nexus_intelligence ?? null;
      const negSourceMix = negData?.source_mix ?? negData?.sourceMix ?? null;
      const negSignalFabric = negData?.signal_fabric ?? negData?.signalFabric ?? null;
      const negContactability = negData?.contactability_level ?? negData?.contactability ?? null;
      let negOutboundId = negData.outbound_message_id ?? null;
      const negThreadId: string | null = negData?.thread_id ?? metaThreadId ?? openNeg.thread_id ?? null;
      let negWrittenV2 = false;
      if (!suppressDirectReply && negThreadId && await chatWriterV2Enabled(sb)) {
        // v2 : article, acheteur, vendeur, contrepartie dérivés du thread.
        // Corrige les réponses WhatsApp enregistrées sans article (donc
        // invisibles dans la fenêtre web) et buyer_user_id = contrepartie.
        const written = await recordChatMessage({
          sb,
          threadId: negThreadId,
          recipientUserId: user.id,
          text: negReply,
          channel,
          attachments: negAttachments,
          intent: negIntent,
          actions: negActions,
          correlationId,
          payloadExtra: {
            transaction_id: negTxId,
            negotiation_id: negData?.negotiation_id ?? openNeg.id,
            results: negResults,
            products: negProducts,
            intelligence: negIntelligence,
            source_mix: negSourceMix,
            signal_fabric: negSignalFabric,
            contactability_level: negContactability,
          },
          enqueueWhatsapp: false,
          conversationId: convId,
          phoneNumber: phone,
        });
        if (written.ok && written.recipientMessageId) {
          negOutboundId = written.recipientMessageId;
          negWrittenV2 = true;
          if (convId) {
            await sb.from("waouh_conversations")
              .update({ last_message: negReply, updated_at: new Date().toISOString() })
              .eq("id", convId);
          }
        }
      }
      if (!suppressDirectReply && !negWrittenV2) {
        const { data: negRow, error: negWriteError } = await sb.from("waouh_messages").insert({
          conversation_id: convId,
          thread_id: negData?.thread_id ?? metaThreadId ?? openNeg.thread_id ?? null,
          user_id: user.id, channel, direction: "out", text: negReply,
          web_session_id: sessionId, phone_number: phone,
          attachments: negAttachments,
          article_id: clientMeta?.article_id ?? null,
          meta: {
            intent: negIntent,
            transaction_id: negTxId,
            negotiation_id: negData?.negotiation_id ?? openNeg.id,
            thread_id: negData?.thread_id ?? metaThreadId ?? openNeg.thread_id ?? null,
            article_id: clientMeta?.article_id ?? null,
            actions: negActions, results: negResults, products: negProducts,
            // 🔑 Garantit que la fenêtre WaouhMatchChatWindow de l'expéditeur
            // range bien la réponse dans le bon onglet (clé = counterpart + role).
            counterpart_user_id: clientMeta?.counterpart_user_id ?? clientMeta?.buyer_user_id ?? clientMeta?.buyer_profile_id ?? null,
            buyer_user_id: clientMeta?.counterpart_user_id ?? clientMeta?.buyer_user_id ?? clientMeta?.buyer_profile_id ?? null,
            role: clientMeta?.role ?? null,
            correlation_id: correlationId,
            intelligence: negIntelligence,
            source_mix: negSourceMix,
            signal_fabric: negSignalFabric,
            contactability_level: negContactability,
          },
        }).select("id").single();
        if (negWriteError) throw negWriteError;
        negOutboundId = negRow.id;
        if (convId) {
          await sb.from("waouh_conversations")
            .update({ last_message: negReply, updated_at: new Date().toISOString() })
            .eq("id", convId);
        }
      }
      if (!suppressDirectReply && channel === "whatsapp" && phone && WAHA_BASE_URL) {
        try {
          const firstImage = negAttachments.find((a: any) => a?.url)?.url || null;
          await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, negReply, negActions, firstImage);
        } catch (e) { console.error("WAHA send failed", e); }
      }
      return new Response(JSON.stringify({ ok: true, thread_id: negThreadId, negotiation_id: negData?.negotiation_id ?? openNeg.id, deal_id: negData?.deal_id ?? null, workflow_state: negData?.workflow_state ?? null, role: negData?.role ?? metaRole ?? null, reply: suppressDirectReply ? null : negReply, suppress_direct_reply: suppressDirectReply, outbound_message_id: negOutboundId, actions: negActions, results: negResults, products: negProducts, article_id: clientMeta?.article_id ?? null, counterpart_user_id: clientMeta?.counterpart_user_id ?? null, intent: negIntent, transaction_id: negTxId, attachments: negAttachments, inbound_message_id: inboundMessageId, conversation_id: convId, user_id: user.id, correlation_id: correlationId, intelligence: negIntelligence, source_mix: negSourceMix, signal_fabric: negSignalFabric, contactability_level: negContactability }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    }

    // Call core engine
    const coreRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-webhook`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: phone || `web:${sessionId}`,
        web_session_id: sessionId,
        text, lat, lng, city, channel, attachments,
        user_id: user.id, auth_user_id: user.auth_user_id ?? authUserId,
        // Lot 1 : l'article du message sert d'indice au moteur pour choisir la
        // bonne négociation (au lieu de « la plus récente, tous produits »).
        article_hint: metaArticleId,
        thread_hint: metaThreadId,
      }),
    });
    const core = await readWaouhEngineResponse(coreRes);
    log("core reply", { ok: coreRes.ok, intent: core.intent, hasReply: !!core.reply });
    const reply: string = core.reply ?? "";
    const actions: WaouhAction[] = Array.isArray(core.actions) ? core.actions : [];
    // 🖼️ Fiches historiques + enrichissement NEXUS/Signal Fabric.
    const coreResults: any[] = Array.isArray(core.results) ? core.results : [];
    const products: any[] = Array.isArray(core.products) ? core.products : [];
    const nexus = await enrichChatWithSignalFabric(sb, {
      intent: core.intent ?? "",
      text,
      city,
      coreResults,
    });
    const results: any[] = nexus.results;
    // Une valeur explicite du moteur reste prioritaire ; sinon NEXUS fournit
    // l'intelligence de découverte au Chat sans casser les anciens moteurs.
    const intelligence =
      core?.intelligence ?? core?.nexus_intelligence ?? nexus.intelligence;
    const sourceMix =
      core?.source_mix ?? core?.sourceMix ?? nexus.source_mix;
    const signalFabric =
      core?.signal_fabric ?? core?.signalFabric ?? nexus.signal_fabric;
    const contactability =
      core?.contactability_level ??
      core?.contactability ??
      nexus.contactability_level;

    // Persist outgoing
    const outboundArticleId: string | null = core.article_id ?? inboundArticleId ?? null;
    const coreThreadId: string | null = typeof core.thread_id === "string" && core.thread_id ? core.thread_id : null;
    const coreNegotiationId: string | null = typeof core.negotiation_id === "string" && core.negotiation_id ? core.negotiation_id : null;
    if (coreThreadId && inboundMessageId) {
      await sb.from("waouh_messages")
        .update({ thread_id: coreThreadId, article_id: outboundArticleId })
        .eq("id", inboundMessageId)
        .is("thread_id", null);
    }
    const { data: outboundRow, error: outboundError } = await sb.from("waouh_messages").insert({
      conversation_id: convId,
      thread_id: coreThreadId,
      user_id: user.id, channel, direction: "out", text: reply,
      web_session_id: sessionId, phone_number: phone,
      attachments: Array.isArray(core.attachments) ? core.attachments : [],
      article_id: outboundArticleId,
      meta: {
        intent: core.intent ?? null,
        transaction_id: core.transaction_id ?? null,
        article_id: outboundArticleId,
        counterpart_user_id: core.counterpart_user_id ?? null,
        thread_id: coreThreadId,
        negotiation_id: coreNegotiationId,
        correlation_id: correlationId,
        actions,
        results,
        products,
        intelligence,
        source_mix: sourceMix,
        signal_fabric: signalFabric,
        contactability_level: contactability,
      },
    }).select("id").maybeSingle();
    if (outboundError) throw outboundError;
    const outboundMessageId: string | null = outboundRow?.id ?? null;

    if (convId) {
      await sb.from("waouh_conversations")
        .update({ last_message: reply, last_intent: core.intent ?? null, updated_at: new Date().toISOString() })
        .eq("id", convId);
    }

    // WAHA send — UN SEUL message par réponse (image + texte + boutons combinés si possible)
    if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
      try {
        const firstImage = Array.isArray(core.attachments) ? core.attachments.find((a: any) => a?.url)?.url : null;
        await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, reply, actions, firstImage);
      } catch (e) { console.error("WAHA send failed", e); }
    }

    return new Response(JSON.stringify({ ok: true, reply, intent: core.intent, thread_id: coreThreadId, negotiation_id: coreNegotiationId, stage: core.stage ?? null, buyer_user_id: core.buyer_user_id ?? null, seller_user_id: core.seller_user_id ?? null, actions, results, products, attachments: Array.isArray(core.attachments) ? core.attachments : [], inbound_message_id: inboundMessageId, outbound_message_id: outboundMessageId, conversation_id: convId, user_id: user.id, article_id: outboundArticleId, counterpart_user_id: core.counterpart_user_id ?? null, transaction_id: core.transaction_id ?? null, correlation_id: correlationId, intelligence, source_mix: sourceMix, signal_fabric: signalFabric, contactability_level: contactability }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[waouh-channel-in] error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
