// deno-lint-ignore-file no-explicit-any -- client Supabase non typé, comme le reste des edge functions.
// WAOUH — Résultats Nexus « externes » → Deal Room.
//
// Un signal externe (`fabric_id = external:<uuid>`, table waouh_external_commerce_signals) n'a ni
// article ni vendeur WAOUH : la carte n'offrait qu'une fiche de contact. Ce module le matérialise en
// article (vendeur « stub » sans coordonnées) pour que l'acheteur entre directement dans la fenêtre de
// négociation, SANS jamais contacter le tiers :
//   - aucune notification n'est envoyée au vendeur externe (il n'a pas de compte) ;
//   - la transmission de l'offre est une action explicite de l'acheteur (« Envoyer mon offre ») qui
//     passe par `nexus.contact.send` : la politique de contactabilité C0–C5 y reste appliquée
//     (C0 refusé, confirmation explicite, contacts publics seulement, etc.).
// Aucun numéro n'est copié : le vendeur stub n'a ni téléphone ni compte, l'article ni contact_whatsapp.
// Testé par waouh-nexus-deal-test.ts.

import { contactabilityPolicy, redactPublicContacts } from "./waouh-signal-fabric.ts";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FABRIC_RE = new RegExp(`^(external|article|buyer):(${UUID})$`, "i");
export const NEXUS_ORIGIN = "nexus_external";
/** Slug déployé du cœur agentique (alias de production, identique au client Web et à Flutter). */
export const DEFAULT_AGENTIC_FUNCTION = "waouh-studio-e2e-v21465";

export type FabricKind = "external" | "article" | "buyer";

/** `external:<uuid>` | `article:<uuid>` | `buyer:<uuid>` → { kind, id } ; autre chose → null. */
export function parseFabricId(raw: unknown): { kind: FabricKind; id: string } | null {
  const match = FABRIC_RE.exec(String(raw ?? "").trim());
  return match ? { kind: match[1].toLowerCase() as FabricKind, id: match[2].toLowerCase() } : null;
}

const ALLOWED_CATEGORIES = ["smartphone", "ordinateur", "vetement", "vehicule", "electromenager", "meuble", "autre"];
const ALLOWED_CONDITIONS = ["new", "like_new", "good", "fair", "poor"];

/** Catégories acceptées par la contrainte de waouh_articles ; tout le reste → « autre ». */
export function normalizeArticleCategory(value: unknown): string {
  const v = String(value ?? "").toLowerCase();
  if (ALLOWED_CATEGORIES.includes(v)) return v;
  if (/t[ée]l[ée]phone|smartphone|iphone|android|galaxy|tecno|infinix/.test(v)) return "smartphone";
  if (/ordinateur|\bpc\b|laptop|macbook/.test(v)) return "ordinateur";
  if (/v[êe]tement|tissu|chaussure|mode|habit/.test(v)) return "vetement";
  if (/voiture|moto|v[ée]hicule|auto/.test(v)) return "vehicule";
  if (/frigo|cong[ée]lateur|machine|[ée]lectrom[ée]nager/.test(v)) return "electromenager";
  if (/maison|logement|immobilier|terrain|chambre|salon|meuble/.test(v)) return "meuble";
  return "autre";
}

export interface ExternalSignal {
  id: string;
  intent?: string | null;
  actor_type?: string | null;
  actor_name?: string | null;
  product_name?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  currency?: string | null;
  city?: string | null;
  raw_text?: string | null;
  status?: string | null;
  expires_at?: string | null;
  contactability_level?: string | null;
  primary_photo_url?: string | null;
  photo_urls?: string[] | null;
}

const OFFER_INTENTS = new Set(["SELL", "OFFER"]);
const DEAD_STATUSES = new Set(["expired", "rejected", "blocked", "removed", "archived", "hidden", "ignored"]);

/**
 * Le signal peut-il devenir un article négociable ? null = oui. Seules les offres explicites (SELL/OFFER)
 * d'un acteur qui n'est pas un acheteur, encore actives et non expirées.
 */
export function signalUnavailableReason(signal: ExternalSignal, now: Date = new Date()): string | null {
  const intent = String(signal.intent ?? "").toUpperCase();
  if (String(signal.actor_type ?? "").toLowerCase() === "buyer" || ["BUY", "RFQ"].includes(intent)) return "signal_not_offer";
  if (!OFFER_INTENTS.has(intent)) return "signal_not_offer";
  if (DEAD_STATUSES.has(String(signal.status ?? "active").toLowerCase())) return "signal_unavailable";
  if (signal.expires_at && Date.parse(signal.expires_at) < now.getTime()) return "signal_unavailable";
  return null;
}

function publicPhotos(signal: ExternalSignal): string[] {
  const urls = [signal.primary_photo_url, ...(Array.isArray(signal.photo_urls) ? signal.photo_urls : [])];
  return [...new Set(urls.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u)))].slice(0, 6);
}

const asPrice = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

/** Ligne waouh_articles dérivée du signal. Pure : aucune coordonnée privée n'est reprise. */
export function signalToArticleRow(signal: ExternalSignal, sellerId: string, now: Date = new Date()): Record<string, unknown> {
  const title = String(signal.product_name || "").trim() || redactPublicContacts(signal.raw_text).trim().slice(0, 120) || "Offre externe";
  const condition = String(signal.condition ?? "").toLowerCase();
  const price = asPrice(signal.price_min) ?? asPrice(signal.price_max) ?? 0;
  const expires = signal.expires_at && Date.parse(signal.expires_at) > now.getTime()
    ? new Date(signal.expires_at).toISOString()
    : new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();
  return {
    seller_id: sellerId,
    title: title.slice(0, 140),
    description: redactPublicContacts(signal.raw_text).slice(0, 600) || null,
    category: normalizeArticleCategory(signal.category || signal.product_name),
    brand: signal.brand ?? null,
    model: signal.model ?? null,
    condition: ALLOWED_CONDITIONS.includes(condition) ? condition : "good",
    price,
    currency: "XOF",
    photos: publicPhotos(signal),
    city: signal.city ?? null,
    status: "active",
    origin: NEXUS_ORIGIN,
    source_channel: "nexus",
    contact_whatsapp: null,
    expires_at: expires,
  };
}

export type MaterializeResult =
  | { ok: true; articleId: string; created: boolean; level: string }
  | { ok: false; code: "signal_not_found" | "signal_not_offer" | "signal_unavailable" | "materialize_failed" };

/**
 * Clé de session du vendeur « stub » d'un signal. Le « | » n'est pas accepté par le format de session
 * des clients (waouh-viewer-identity) : personne ne peut donc revendiquer cette identité. L'unicité de
 * waouh_users.web_session_id rend la matérialisation idempotente sans colonne ni migration
 * (waouh_articles.origin_signal_id référence une autre table, waouh_radar_signals).
 */
export const stubSessionKey = (signalId: string): string => `nexus-ext|${signalId}`;

/**
 * Article + vendeur stub d'un signal externe, de façon idempotente (un article par signal). Deux ouvertures
 * simultanées : la contrainte d'unicité du vendeur stub fait échouer la seconde, qui relit l'existant.
 */
export async function materializeExternalSignal(sb: any, signalId: string, now: Date = new Date()): Promise<MaterializeResult> {
  const { data: signal } = await sb.from("waouh_external_commerce_signals").select("*").eq("id", signalId).maybeSingle();
  if (!signal) return { ok: false, code: "signal_not_found" };
  const level = String(signal.contactability_level ?? "C0");
  const blocked = signalUnavailableReason(signal, now);
  if (blocked) return { ok: false, code: blocked as "signal_not_offer" | "signal_unavailable" };

  const existing = await articleOfSignal(sb, signalId);
  if (existing) return { ok: true, articleId: existing, created: false, level };

  let stubId: string | null = null;
  const { data: stub, error: stubError } = await sb.from("waouh_users").insert({
    display_name: String(signal.actor_name || "Vendeur externe").slice(0, 80),
    channel: "external",
    web_session_id: stubSessionKey(signalId),
    city: signal.city ?? null,
  }).select("id").single();
  if (stub?.id) stubId = stub.id;
  else if (stubError) {
    // Course perdue : le vendeur stub existe déjà (et son article, ou bientôt).
    const raced = await articleOfSignal(sb, signalId);
    if (raced) return { ok: true, articleId: raced, created: false, level };
    const { data: again } = await sb.from("waouh_users").select("id").eq("web_session_id", stubSessionKey(signalId)).maybeSingle();
    stubId = again?.id ?? null;
  }
  if (!stubId) return { ok: false, code: "materialize_failed" };

  const { data: article, error: articleError } = await sb.from("waouh_articles")
    .insert(signalToArticleRow(signal, stubId, now)).select("id").single();
  if (articleError || !article?.id) {
    const raced = await articleOfSignal(sb, signalId);
    if (raced) return { ok: true, articleId: raced, created: false, level };
    return { ok: false, code: "materialize_failed" };
  }
  return { ok: true, articleId: article.id, created: true, level };
}

/** Article déjà matérialisé pour ce signal (via son vendeur stub). */
async function articleOfSignal(sb: any, signalId: string): Promise<string | null> {
  const { data: stub } = await sb.from("waouh_users").select("id").eq("web_session_id", stubSessionKey(signalId)).maybeSingle();
  if (!stub?.id) return null;
  const { data } = await sb.from("waouh_articles").select("id,created_at")
    .eq("seller_id", stub.id).eq("origin", NEXUS_ORIGIN)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  return data?.id ?? null;
}

/** Message d'accroche envoyé au tiers quand l'acheteur confirme : intention + prix, jamais de coordonnées. */
export function externalOfferMessage(title: string | null | undefined, amount: number | null | undefined): string {
  const name = String(title || "votre offre").replace(/[*_~`]/g, "").trim().slice(0, 80);
  const price = amount && amount > 0 ? ` à ${Math.round(amount).toLocaleString("fr-FR")} FCFA` : "";
  return `Bonjour, je suis intéressé par « ${name} »${price}. Est-ce toujours disponible ? Nous pouvons poursuivre dans WAOUH.`.slice(0, 1000);
}

export type TransmissionState = "queued" | "not_permitted" | "no_channel" | "failed";

/** Réponse de `nexus.contact.send` → état affiché à l'acheteur. Pure. */
export function classifyTransmission(status: number, body: any): TransmissionState {
  const code = String(body?.error?.code ?? body?.code ?? "");
  if (status >= 200 && status < 300 && body?.ok !== false) return "queued";
  if (status === 403 || code === "contact_not_permitted" || code === "integrated_contact_path_required" || code === "blind_contact_not_available") return "not_permitted";
  // Un 404 sans code métier = fonction absente (déploiement), pas « aucun canal » : erreur technique.
  if (code === "contact_not_found") return "no_channel";
  return "failed";
}

export interface TransmitArgs {
  supabaseUrl: string;
  authHeader: string;
  anonKey?: string | null;
  fabricId: string;
  message: string;
  functionSlug?: string;
  fetchImpl?: typeof fetch;
}

/** Appelle `nexus.contact.send` avec le jeton de l'acheteur : toute la politique de contact s'y applique. */
export async function transmitExternalOffer(args: TransmitArgs): Promise<{ state: TransmissionState; status: number }> {
  const doFetch = args.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`${args.supabaseUrl}/functions/v1/${args.functionSlug || DEFAULT_AGENTIC_FUNCTION}`, {
      method: "POST",
      headers: {
        Authorization: args.authHeader,
        "Content-Type": "application/json",
        ...(args.anonKey ? { apikey: args.anonKey } : {}),
      },
      body: JSON.stringify({ action: "nexus.contact.send", payload: { fabric_id: args.fabricId, message: args.message, confirmed: true } }),
    });
    const body = await res.json().catch(() => ({}));
    return { state: classifyTransmission(res.status, body), status: res.status };
  } catch (error) {
    console.error("[waouh-nexus-deal] transmission impossible", error);
    return { state: "failed", status: 0 };
  }
}

/** Niveau de contactabilité → la transmission a-t-elle une chance d'être permise ? (C0 : non, jamais tenté.) */
export function transmissionMayBePermitted(level: unknown): boolean {
  return contactabilityPolicy(level).level !== "C0";
}
