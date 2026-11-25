import { load } from "npm:cheerio@1.2.0/slim";
import { redactPublicContacts } from "../waouh-signal-fabric.ts";

export type SourcePermission = {
  automation_authorized?: boolean;
  platform_key?:string;
  api_browser?:boolean;
  managed_catalog?:boolean;
  authorization_reference?:string;
  discovery_minutes?:number;
  recheck_minutes?:number;
  daily_page_limit?:number;
  media_reuse_authorized?: boolean;
  media_hosts?: string[];
  attribution?: string;
  collection_format?: "catalog_json" | "schema_org" | "directory" | "coinafrique" | "rss_atom" | "goafrica" | "telegram_public" | "classifieds";
  canonical_url?: string;
  category?: string;
  collection_transport?: "direct" | "apify" | "serpapi";
  country_scope?: "BJ";
};

export type CommerceKind = "product" | "service" | "provider" | "rare_item" | "announcement";
export type CollectedCommerce = {
  source_external_id: string;
  source_url: string;
  product_name: string;
  raw_text?: string;
  intent: "SELL" | "BUY" | "ANNOUNCE" | "RFQ";
  actor_type: "buyer" | "seller" | "business" | "announcer";
  category: string;
  brand?: string;
  model?: string;
  city?: string;
  country_code?: "BJ" | "CI";
  price_min?: number;
  price_max?: number;
  actor_name?: string;
  is_public_business?: boolean;
  contacts?: Array<{channel: "phone" | "whatsapp" | "facebook" | "website"; value: string}>;
  evidence: {offer_kind: "product" | "service" | "announcement"; availability_confirmed: false;
    source_attribution: string; photo_attribution?: string; photos?: string[]; rare_item?: true;
    provider_profile?: true; listing_license?: string; deadline?: string; published_at?: string;
    organization?: string; source_updated_at?:string; last_checked_at?:string; deadline_status?: "not_published"};
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
    const facebookMedia = url.hostname.endsWith("facebook.com") &&
      (image?.hostname.endsWith(".fbcdn.net") || image?.hostname.endsWith(".fbsbx.com"));
    if (facebookHosts.has(url.hostname) && !facebookMedia) return [];
    return image && (hosts.has(image.hostname) || facebookMedia) ? [image.href] : [];
  }))];
}

export function commercialRecord(input: ObjectValue, origin: URL, permission: SourcePermission,
  kind: CommerceKind, intent: CollectedCommerce["intent"], requireSameOrigin = true): CollectedCommerce | null {
  const url = trustedHttps(input.url, origin.href);
  const title = trim(input.title ?? input.name);
  if (!url || (requireSameOrigin && url.origin !== origin.origin) || url.href === origin.href ||
    title.length < 5 || !trim(permission.attribution)) return null;
  const price = priceXof(input.price, input.currency);
  const photos = approvedPhotos(input.photos ?? input.image, url, permission);
  const evidence: CollectedCommerce["evidence"] = {
    offer_kind: kind === "announcement" ? "announcement" : kind === "provider" || kind === "service" ? "service" : "product",
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
    actor_type: intent === "BUY" || intent === "RFQ" ? "buyer" : kind === "announcement" ? "announcer" : kind === "provider" ? "business" : "seller",
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

export function coinAfriqueCatalog(html: string, origin: URL, permission: SourcePermission) {
  if (origin.hostname !== "bj.coinafrique.com") return [];
  const $ = load(html);
  return $(".ad__card").toArray().flatMap(card => {
    const item = $(card);
    const anchor = item.find(".ad__card-description a").first();
    const link = trustedHttps(anchor.attr("href"), origin.href);
    if (!link || !link.pathname.startsWith("/annonce/")) return [];
    const price = item.find("[data-ad-price]").first();
    const category=price.attr("data-ad-category")??"";
    const title=anchor.attr("title")??anchor.text();
    const job=/\/(?:offres-demploi|offres-emploi|emploi|emplois|recrutement)\//i.test(link.pathname)||/recrut|\bvendeuse\b/i.test(title);
    const service=/\/(?:[^/]*services[^/]*|cours-particuliers|travaux-bricolage-et-jardinage)\//i.test(link.pathname)
      &&!/(?:terrain|parcelle|voiture|moto).*(?:vendre|vente)/i.test(title);
    const row = commercialRecord({
      url: link.href, title,
      price: price.attr("data-ad-price"), currency: "XOF",
      category,
      city: item.find(".ad__card-location span").text().replace(/,?\s*Bénin\s*$/i, ""),
      photos: [item.find(".ad__card-img").attr("src") ?? item.find(".ad__card-img").attr("data-src")],
    }, origin, permission, job?"announcement":service?"service":"product", job?"ANNOUNCE":"SELL");
    if (!row) return [];
    row.actor_name = trim(item.find(".pro-contact-card .title").text(), 120) || undefined;
    row.is_public_business = item.find(".ad__card-action.is-pro").length > 0;
    row.contacts = [{channel: "website", value: link.href}];
    return [row];
  });
}

export function coinAfriqueDetails(html: string, row: CollectedCommerce, permission: SourcePermission) {
  const origin = trustedHttps(row.source_url);
  if (!origin || origin.hostname !== "bj.coinafrique.com") return row;
  const $ = load(html);
  const canonical = trustedHttps($('link[rel="canonical"]').attr("href"));
  if (canonical?.href !== origin.href) throw new Error("listing_identity_changed");
  const availability=$('[itemprop="availability"],.listing-status,[data-listing-status]').first();
  if(/^(?:vendu|loué|pourvu|sold|closed|indisponible)$/i.test(availability.text().trim())||/SoldOut|OutOfStock/.test(availability.attr('href')??''))throw new Error('listing_closed');
  const phones = $("[data-phone-number], a[href^='tel:']").toArray().flatMap(node => {
    const value = $(node).attr("data-phone-number") ?? $(node).attr("href")?.slice(4);
    return value ? [{channel: "phone" as const, value}] : [];
  });
  const whatsapp = $("a[href^='https://wa.me/']").toArray().flatMap(node => {
    const value = trustedHttps($(node).attr("href"))?.pathname.replace(/[^0-9+]/g, "");
    return value ? [{channel: "whatsapp" as const, value}] : [];
  });
  const listingId = /-(\d+)\/?$/.exec(origin.pathname)?.[1];
  const gallery = $('meta[property="og:image"], .ad__image img, .ad__gallery img, .swiper-slide img, .carousel-item img').toArray().flatMap(node => {
    const el=$(node);
    const url = trustedHttps(el.attr("data-src") ?? el.attr("data-lazy") ?? el.attr("src") ?? el.attr("content"));
    return url?.hostname === "images.coinafrique.com" && listingId &&
      url.pathname.startsWith("/" + listingId + "_") ? [url.href] : [];
  });
  return {...row, contacts: [...(row.contacts ?? []), ...phones, ...whatsapp],
    ...productIdentity(row.product_name),
    raw_text: trim($('meta[property="og:description"]').attr("content"), 700) || row.raw_text,
    evidence: {...row.evidence,
      ...(row.intent==='ANNOUNCE'?{deadline_status:'not_published' as const}:{}),
      photos: approvedPhotos(gallery.length ? gallery : row.evidence.photos, origin, permission)}};
}

/** Identity comes from published text. A model is never inferred from the price. */
export function productIdentity(title:string):{brand?:string;model?:string} {
  const brands:Record<string,string>={samsung:"Samsung",iphone:"Apple",apple:"Apple",tecno:"Tecno",infinix:"Infinix",xiaomi:"Xiaomi",redmi:"Xiaomi",honor:"Honor",huawei:"Huawei",nokia:"Nokia",toyota:"Toyota",suzuki:"Suzuki",infiniti:"Infiniti",haojue:"Haojue",dayang:"Dayang",lenovo:"Lenovo",dell:"Dell",hp:"HP"};
  const matched=/\b(samsung|iphone|apple|tecno|infinix|xiaomi|redmi|honor|huawei|nokia|toyota|suzuki|infiniti|haojue|dayang|lenovo|dell|hp)\b/i.exec(title);
  if(!matched)return {};
  const tail=title.slice(matched.index).replace(/^(?:Samsung|Apple)\s+/i,"");
  const model=/^(?:(?:iPhone|Galaxy|Redmi|Honor|Tecno|Infinix|Nokia|Huawei)\s*)?(?:[a-z]{0,6}\s*)?\d{1,3}[a-z]?(?:\s*(?:pro\s*max|pro|plus|ultra|s))?\b/i.exec(tail)?.[0]
    ?? /\b(?:Corolla|Baleno|QX\d{2}[a-z]?|Lucky|Sirius)\b/i.exec(title)?.[0];
  return {brand:brands[matched[1].toLowerCase()],...(model?{model:model.replace(/\s+/g," ").trim()}: {})};
}

const facebookHosts = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"]);
export function facebookGroup(value: string): URL | null {
  const url = trustedHttps(value.trim());
  const group = url && /^\/groups\/([a-z\d._-]+)\/?$/i.exec(url.pathname)?.[1];
  return url && group && facebookHosts.has(url.hostname) ? new URL("https://www.facebook.com/groups/" + group + "/") : null;
}

export function facebookSource(value: string): URL | null {
  const group = facebookGroup(value);
  if (group) return group;
  const url = trustedHttps(value.trim());
  return url && facebookHosts.has(url.hostname) && /^\/share\/g\/[a-z0-9]+\/?$/i.test(url.pathname) ? url : null;
}

export function facebookListingDetails(raw:string, suppliedTitle?:unknown) {
  const clean = (text:unknown) => trim(String(text ?? "").replace(/https?:\/\/\S+/g, " ")
    .replace(/\[(?:téléphone|email)\]/gi," ").replace(/[*`_]/g," "),700)
    .replace(/^\s*(?:tél(?:éphone)?\s*:?\s*)+/i,"").trim();
  const lines = [suppliedTitle,...raw.split(/[\r\n]+|\*+/)].map(clean).filter(v=>v.length>=5);
  const concrete = /\b(?:villa|chambre|appartement|terrain|parcelle|moto|haojue|dayang|wave|sirius|voiture|suzuki|toyota|iphone|samsung|honor|tecno|pièces détachées|réparation|installation|service)\b/i;
  let title = lines.find(line=>concrete.test(line)) ?? lines[0] ?? clean(raw);
  title = title.replace(/^direct à la clé\s*/i,"")
    .replace(/\s+(?:interress[ée]|intéress[ée]|whats?app|watsapp|appelez|appel|contactez|tél(?:éphone)?|je suis le propriétaire)(?=\s|$|[,:]).*$/i,"").trim();
  const flat=clean(raw);
  const city = /\b(San Pedro|Abidjan|Abobo|Yopougon|Godomey|Cotonou|Abomey[- ]Calavi|Calavi|Pahou|Porto[- ]Novo|Parakou)\b/i.exec(flat)?.[1];
  const country_code = /\b(San Pedro|Abidjan|Abobo|Yopougon|Côte d.Ivoire)\b/i.test(flat) ? "CI" as const : "BJ" as const;
  const amount = /(?:^|[^\d])(\d{1,3}(?:[ .\u00a0]\d{3})+|\d{3,9})\s*(?:FCFA|XOF|CFA)\b/i.exec(raw)?.[1]
    ?? /\b(?:loyer|prix)\s*:?\s*(\d{1,3}(?:[ .\u00a0]\d{3})+|\d{3,9})\s*f\b/i.exec(raw)?.[1];
  const category = /\b(?:villa|chambre|appartement|terrain|parcelle)\b/i.test(flat) ? "Immobilier"
    : /\b(?:moto|haojue|dayang|wave|sirius)\b/i.test(flat) ? "Motos"
    : /\b(?:voiture|suzuki|toyota|pièces détachées)\b/i.test(flat) ? "Automobile"
    : /\b(?:iphone|samsung|honor|tecno)\b/i.test(flat) ? "Téléphonie" : "Produits";
  return {title:title.slice(0,160),city,country_code,category,price:priceXof(amount,"XOF")};
}

export function facebookCommercialPosts(body: unknown, group: URL, permission: SourcePermission) {
  if (!Array.isArray(body)) throw new Error("invalid_facebook_dataset");
  const output: CollectedCommerce[] = [];
  for (const row of body.slice(0, 30)) {
    const item = obj(row);
    // A share link must be tied to the actor's original input, not an unrelated returned group.
    const direct = facebookGroup(group.href);
    const input = facebookSource(String(item.inputUrl ?? ""));
    const resolved = direct ?? (input?.href === group.href ? facebookGroup(String(item.facebookUrl ?? "")) : null);
    const link = trustedHttps(item.url ?? item.postUrl ?? item.permalink);
    if (!resolved || !link || !facebookHosts.has(link.hostname) || !link.pathname.startsWith(resolved.pathname) ||
      !/\/(?:posts|permalink)\/[^/]+\/?$/.test(link.pathname)) continue;
    link.hostname = resolved.hostname;
    link.search = "";
    const raw = typeof (item.text ?? item.message) === "string" ? String(item.text ?? item.message) : "";
    const sell = /(?:\b(?:je vends|prix de vente|en vente|disponible|vente)\b|à vendre)/i.test(raw);
    const buy = /\b(?:je cherche|je recherche|je veux acheter|achat recherché)\b/i.test(raw);
    if (sell === buy) continue;
    const service = /\b(?:prestation|service|réparation|installation|dépannage|devis)\b/i.test(raw);
    const details = facebookListingDetails(raw,item.title);
    const media = list(item.media ?? item.attachments).flatMap(m => {
      const image = obj(m);
      return [obj(image.photo_image).uri, image.url, image.imageUrl, image.thumbnail,
        obj(image.image).uri, obj(image.image).url, obj(image.photo).url];
    });
    const formatted = commercialRecord({url:link.href,title:details.title,description:raw,price:details.price,
      city:details.city,category:details.category,currency:"XOF",photos:media},
      resolved, permission, service ? "service" : "product", buy ? "BUY" : "SELL");
    if (formatted) {
      formatted.actor_name = trim(obj(item.user).name ?? obj(item.author).name, 120) || undefined;
      Object.assign(formatted,productIdentity(details.title));
      formatted.country_code = details.country_code;
      formatted.contacts = [{channel: "facebook", value: link.href}];
      const published:string[] = raw.match(/(?:\+|00)(?:229|225)[\s.-]*(?:01[\s.-]*)?(?:\d[\s.-]*){8,10}\b/g) ?? [];
      for (const match of raw.matchAll(/(?:tél(?:éphone)?|whats?app|watsapp|apel direct|appel direct|contact)\b[^\d+]{0,30}((?:01[\s.-]*)?(?:\d[\s.-]*){8})(?!\d)/gi)) published.push(match[1]);
      formatted.contacts.push(...published.map(value => ({channel: "phone" as const, value})));
      output.push(formatted);
    }
  }
  return output;
}
