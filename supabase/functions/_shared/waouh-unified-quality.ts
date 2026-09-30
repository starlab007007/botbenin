// WAOUH — Couche d'unification des sources : qualité, normalisation et classement équitable.
// Toutes les sources (chat, partenaires, WhatsApp, Radar, signaux Nexus, API) passent par la vue `waouh_signal_fabric`.
// Ce module est PUR : il évalue la complétude d'une fiche (photo, prix, contact), la classe sans favoriser une source,
// et fournit une phrase de référence quand une information manque (« demandez à l'Avatar de contacter la source »).
//
// Règles (décision produit du 30/09) :
//  - même barème pour toutes les sources : aucune remise ni bonus selon l'origine ;
//  - chaque information manquante (photo, prix, contact) retire des points au score de pertinence ;
//  - une fiche sans photo, sans prix ET sans contact passe en toute dernière position, avec une référence pour contacter.

export type QualityField = "photo" | "price" | "contact";
export type QualityTier = "A" | "B" | "C" | "D";
export type EntityKind = "seller" | "business" | "buyer" | "announcer" | "service" | "scout" | "unknown";

export type UnifiedQuality = {
  has_photo: boolean;
  has_price: boolean;
  has_contact: boolean;
  present: number;
  missing: QualityField[];
  completeness: number; // 0..100
  tier: QualityTier; // A = complète, B = 1 manque, C = 2 manquent, D = rien
  entity_kind: EntityKind;
  reference: string | null;
};

type Rowish = {
  photos?: unknown;
  price?: unknown;
  price_min?: unknown;
  price_max?: unknown;
  contactability_level?: unknown;
  actor_type?: unknown;
  category?: unknown;
  intent?: unknown;
  evidence?: unknown;
};

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const isUrl = (v: unknown) => typeof v === "string" && /^https?:\/\//i.test(v.trim());
const positive = (v: unknown) => {
  if (v === null || v === undefined || v === "") return false;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0;
};

export function extractPhotos(row: Rowish): string[] {
  const ev = obj(row.evidence);
  const list = [
    ...(Array.isArray(row.photos) ? row.photos : []),
    ...(Array.isArray(ev.photos) ? (ev.photos as unknown[]) : []),
    ev.image_url, ev.photo, ev.thumbnail, ev.primary_photo_url,
  ];
  return [...new Set(list.filter(isUrl).map((u) => String(u).trim()))];
}

export function hasPrice(row: Rowish): boolean {
  return positive(row.price) || positive(row.price_min) || positive(row.price_max);
}

const CONTACT_LEVELS = new Set(["C1", "C2", "C3", "C4", "C5"]);
/** Un contact exploitable : niveau C1+ (public ou consenti), ou un numéro connu (quatre derniers chiffres, WhatsApp). */
export function hasContact(row: Rowish): boolean {
  const ev = obj(row.evidence);
  if (CONTACT_LEVELS.has(String(row.contactability_level ?? "").toUpperCase())) return true;
  if (ev.has_whatsapp === true || ev.has_contact === true) return true;
  return typeof ev.contact_last4 === "string" && ev.contact_last4.length > 0;
}

export function entityKind(row: Rowish): EntityKind {
  const actor = String(row.actor_type ?? "").toLowerCase();
  const category = String(row.category ?? "").toLowerCase();
  if (actor === "buyer" || String(row.intent ?? "").toUpperCase() === "BUY" || String(row.intent ?? "").toUpperCase() === "RFQ") return "buyer";
  if (/service/.test(category)) return "service";
  if (actor === "business" || actor === "partner") return "business";
  if (actor === "announcer") return "announcer";
  if (actor === "scout") return "scout";
  if (actor === "seller") return "seller";
  return "unknown";
}

const LABEL: Record<QualityField, string> = { photo: "photo", price: "prix", contact: "contact" };

export function referenceLine(missing: QualityField[]): string | null {
  if (!missing.length) return null;
  if (missing.length === 3) return "Fiche à compléter (prix, photo et contact absents) : demandez à l'Avatar de contacter la source pour obtenir les informations.";
  return `Non renseigné : ${missing.map((m) => LABEL[m]).join(", ")}. Demandez-le à l'Avatar avant de vous engager.`;
}

export function assessQuality(row: Rowish): UnifiedQuality {
  const kind = entityKind(row);
  // Une demande d'achat n'a pas de photo : on ne la pénalise pas pour cela (son « prix » est le budget).
  const has_photo = kind === "buyer" ? true : extractPhotos(row).length > 0;
  const has_price = hasPrice(row);
  const has_contact = hasContact(row);
  const missing: QualityField[] = [];
  if (!has_price) missing.push("price");
  if (!has_photo) missing.push("photo");
  if (!has_contact) missing.push("contact");
  const present = 3 - missing.length;
  const tier: QualityTier = present === 3 ? "A" : present === 2 ? "B" : present === 1 ? "C" : "D";
  return {
    has_photo, has_price, has_contact, present, missing,
    completeness: Math.round((present / 3) * 100),
    tier,
    entity_kind: kind,
    reference: referenceLine(missing),
  };
}

/** Score de pertinence corrigé : −8 points par information manquante, −25 si la fiche est entièrement vide. */
export function qualityAdjustedScore(total: number, q: UnifiedQuality): number {
  const base = Number.isFinite(total) ? total : 0;
  return Math.round((base - q.missing.length * 8 - (q.present === 0 ? 25 : 0)) * 10) / 10;
}

/** Tri stable et équitable : les fiches entièrement vides en dernier, puis score corrigé décroissant. */
export function compareUnified(a: { quality: UnifiedQuality; adjusted: number }, b: { quality: UnifiedQuality; adjusted: number }): number {
  const lastA = a.quality.present === 0 ? 1 : 0;
  const lastB = b.quality.present === 0 ? 1 : 0;
  if (lastA !== lastB) return lastA - lastB;
  return b.adjusted - a.adjusted;
}
