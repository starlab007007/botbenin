import { load } from "npm:cheerio@1.2.0/slim";
import { redactPublicContacts } from "../waouh-signal-fabric.ts";

export type SourcePermission = {
  automation_authorized?: boolean;
  media_reuse_authorized?: boolean;
  media_hosts?: string[];
  attribution?: string;
  collection_format?: "catalog_json" | "schema_org" | "directory";
  canonical_url?: string;
};

export type CommerceKind = "product" | "service" | "provider" | "rare_item";
export type CollectedCommerce = {
  source_external_id: string;
  source_url: string;
  product_name: string;
  raw_text?: string;
  intent: "SELL" | "BUY" | "ANNOUNCE" | "RFQ";
  actor_type: "buyer" | "seller" | "business";
  category: string;
  brand?: string;
  model?: string;
  city?: string;
  price_min?: number;
  price_max?: number;
  evidence: {offer_kind: "product" | "service"; availability_confirmed: false;
    source_attribution: string; photo_attribution?: string; photos?: string[]; rare_item?: true;
    provider_profile?: true; listing_license?: string};
};
type ObjectValue = Record<string, unknown>;
const obj = (v: unknown): ObjectValue => v && typeof v === "object" && !Array.isArray(v) ? v as ObjectValue : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : v == null ? [] : [v];
const trim = (v: unknown, size = 280) => typeof v === "string"
  ? redactPublicContacts(v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, size) : "";

export function trustedHttps(value: unknown, base?: string): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value, base);
    const host = url.hostname;
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(host) ||
      /(?:^|\.)(localhost|local|internal|test|example|invalid|onion|arpa)$/.test(host) ||
      /^[\d.]+$/.test(host) ||
      [...url.searchParams.keys()].some(key => /token|password|signature|secret|credential|session|x-amz|api.?key/i.test(key))) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$/i.test(key)) url.searchParams.delete(key);
    }
    return url;
  } catch { return null; }
}

function priceXof(v: unknown, currency: unknown): number | undefined {
  if (typeof currency !== "string" || !/^(xof|fcfa|cfa)$/i.test(currency.trim())) return;
  if (typeof v !== "number" && typeof v !== "string") return;
  const raw = String(v).trim().replace(/[\u00a0\u202f]/g, " ");
  const n = /^\d{1,3}(?:[ .]\d{3})+$/.test(raw) ? Number(raw.replace(/[ .]/g,""))
    : /^\d+(?:[.,]0{1,2})?$/.test(raw) ? Number(raw.replace(",", ".")) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

function approvedPhotos(input: unknown, url: URL, permission: SourcePermission) {
  if (permission.media_reuse_authorized !== true || !trim(permission.attribution)) return [];
  const hosts = new Set([url.hostname, ...(permission.media_hosts ?? [])]);
  return [...new Set(list(input).flatMap(value => {
    const image = trustedHttps(typeof value === "string" ? value : obj(value).contentUrl ?? obj(value).url, url.href);
    return image && hosts.has(image.hostname) ? [image.href] : [];
  }))].slice(0, 4);
}

function commercialRecord(input: ObjectValue, origin: URL, permission: SourcePermission,
  kind: CommerceKind, intent: CollectedCommerce["intent"], requireSameOrigin = true): CollectedCommerce | null {
  const url = trustedHttps(input.url, origin.href);
  const title = trim(input.title ?? input.name);
  if (!url || (requireSameOrigin && url.origin !== origin.origin) || url.href === origin.href ||
    title.length < 5 || !trim(permission.attribution)) return null;
  const price = priceXof(input.price, input.currency);
  const photos = approvedPhotos(input.photos ?? input.image, url, permission);
  const evidence: CollectedCommerce["evidence"] = {
    offer_kind: kind === "provider" || kind === "service" ? "service" : "product",
    availability_confirmed: false,
    source_attribution: trim(permission.attribution),
    ...(kind === "provider" ? {provider_profile:true} : {}),
    ...(kind === "rare_item" ? {rare_item:true} : {}),
    ...(input.license === "ODbL-1.0" ? {listing_license:"ODbL-1.0"} : {}),
    ...(photos.length ? {photos, photo_attribution:trim(permission.attribution)} : {}),
  };
  const brand = trim(typeof input.brand === "string" ? input.brand : obj(input.brand).name, 100);
  const model = trim(input.model ?? input.mpn, 120);
  const city = trim(input.city, 100);
  return {
    source_external_id: url.href,
    source_url: url.href,
    product_name: title,
    raw_text: trim(input.description, 700),
    intent,
    actor_type: intent === "BUY" || intent === "RFQ" ? "buyer" : kind === "provider" ? "business" : "seller",
    category: trim(input.category, 120) || (kind === "provider" ? "Prestataire" : kind === "service" ? "Service" : "Produits"),
    ...(brand ? {brand} : {}), ...(model ? {model} : {}), ...(city ? {city} : {}),
    ...(price === undefined ? {} : {price_min:price,price_max:price}),
    evidence,
  };
}

export function catalogJson(body: unknown, origin: URL, permission: SourcePermission,
  directory = false): CollectedCommerce[] {
  const records: CollectedCommerce[] = [];
  for (const value of list(obj(body).items).slice(0, 100)) {
    const item = obj(value);
    const kind = item.kind;
    const intent = item.intent;
    if (directory ? kind !== "provider" || intent !== "ANNOUNCE" :
      !["product","service","rare_item"].includes(String(kind)) || !["BUY","SELL","RFQ"].includes(String(intent))) continue;
    const row = commercialRecord(item, origin, permission, kind as CommerceKind, intent as CollectedCommerce["intent"], !directory);
    if (row && (!directory || new URL(row.source_url).hostname === "www.openstreetmap.org")) records.push(row);
  }
  return records;
}

export function schemaOrgCatalog(html: string, origin: URL, permission: SourcePermission) {
  const $ = load(html);
  const results: CollectedCommerce[] = [];
  for (const script of $('script[type="application/ld+json"]').toArray().slice(0, 40)) {
    let data: unknown;
    try { data = JSON.parse($(script).text()); } catch { continue; }
    const nodes = list(data).flatMap(value => {
      const item = obj(value);
      return [item, ...list(item["@graph"]).map(obj), ...list(item.itemListElement).map(v => obj(obj(v).item))];
    });
    for (const item of nodes.slice(0, 100)) {
      const types = list(item["@type"]);
      const kind = types.includes("Product") ? "product" : types.includes("Service") ? "service" : null;
      const offer = obj(list(item.offers)[0]);
      if (!kind || !Object.keys(offer).length) continue;
      const row = commercialRecord({...item, url:item.url ?? offer.url, price:offer.price,
        currency:offer.priceCurrency, city:obj(offer.availableAtOrFrom).addressLocality}, origin, permission, kind, "SELL");
      if (row) results.push(row);
    }
  }
  return results;
}

const facebookHosts = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"]);
export function facebookGroup(value: string): URL | null {
  const url = trustedHttps(value);
  const group = url && /^\/groups\/([a-z\d._-]+)\/?$/i.exec(url.pathname)?.[1];
  return url && group && facebookHosts.has(url.hostname) ? new URL("https://www.facebook.com/groups/" + group + "/") : null;
}

export function facebookCommercialPosts(body: unknown, group: URL, permission: SourcePermission) {
  if (!Array.isArray(body)) throw new Error("invalid_facebook_dataset");
  const output: CollectedCommerce[] = [];
  for (const row of body.slice(0, 30)) {
    const item = obj(row);
    const link = trustedHttps(item.url ?? item.postUrl ?? item.permalink);
    if (!link || !facebookHosts.has(link.hostname) || !link.pathname.startsWith(group.pathname) ||
      !/\/(?:posts|permalink)\/[^/]+\/?$/.test(link.pathname)) continue;
    link.hostname = group.hostname;
    link.search = "";
    const raw = typeof (item.text ?? item.message) === "string" ? String(item.text ?? item.message) : "";
    const sell = /\b(?:je vends|à vendre|prix de vente|en vente|disponible (?:à|au))\b/i.test(raw);
    const buy = /\b(?:je cherche|je recherche|je veux acheter|achat recherché)\b/i.test(raw);
    if (sell === buy) continue;
    const service = /\b(?:prestation|service|réparation|installation|dépannage|devis)\b/i.test(raw);
    const title = item.title ?? raw.split(/\r?\n/).find(s => s.trim().length >= 5)?.trim().slice(0, 160);
    const amount = /(?:^|[^\d])(\d[\d \u00a0]{2,})\s*(?:FCFA|XOF)\b/i.exec(raw)?.[1];
    const media = list(item.media ?? item.attachments).map(m => obj(m).photo_image ? obj(obj(m).photo_image).uri : obj(m).url ?? obj(m).imageUrl);
    const formatted = commercialRecord({url:link.href,title,description:raw,price:amount,currency:"XOF",photos:media},
      group, permission, service ? "service" : "product", buy ? "BUY" : "SELL");
    if (formatted) output.push(formatted);
  }
  return output;
}
