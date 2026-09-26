export type FabricIntent = "BUY" | "SELL" | "ANNOUNCE" | "RFQ" | "UNKNOWN";
export type Contactability = "C0" | "C1" | "C2" | "C3" | "C4" | "C5";

export type FabricSignal = {
  fabric_id?: string;
  source_key?: string | null;
  intent?: string | null;
  actor_type?: string | null;
  subject?: string | null;
  raw_text?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  city?: string | null;
  canonical_key?: string | null;
  contactability_level?: Contactability | string | null;
  trust_score?: number | null;
  observed_at?: string | null;
  source_url?: string | null;
  evidence?: Record<string, unknown> | null;
};

const DIACRITICS = /[\u0300-\u036f]/g;
const STOP = new Set([
  "le","la","les","un","une","des","de","du","d","a","à","au","aux","et","ou","pour",
  "je","j","cherche","recherche","trouve","trouver","veux","besoin","vends","vend","vente",
  "acheter","acheteur","vendeur","disponible","prix","fcfa","f","cfa","en","avec","sur","dans",
]);

export function normalizeFabricText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD").replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fabricTokens(value: unknown) {
  return [...new Set(normalizeFabricText(value).split(" ").filter((token) => token.length > 1 && !STOP.has(token)))];
}

export function oppositeIntent(mode: "find_sellers" | "find_buyers") {
  return mode === "find_sellers" ? "SELL" : "BUY";
}

export function scoreFabricSignal(input: {
  query: string;
  mode: "find_sellers" | "find_buyers";
  city?: string | null;
  budgetMax?: number | null;
  signal: FabricSignal;
}) {
  const queryTokens = fabricTokens(input.query);
  const haystack = normalizeFabricText([
    input.signal.subject,
    input.signal.raw_text,
    input.signal.category,
    input.signal.brand,
    input.signal.model,
    input.signal.canonical_key,
  ].filter(Boolean).join(" "));
  const hits = queryTokens.filter((token) => haystack.includes(token));
  const relevance = queryTokens.length ? (hits.length / queryTokens.length) * 100 : 0;

  const desiredIntent = oppositeIntent(input.mode);
  const intentScore = String(input.signal.intent ?? "").toUpperCase() === desiredIntent ? 100
    : input.signal.intent === "ANNOUNCE" ? 45 : 0;

  const signalCity = normalizeFabricText(input.signal.city);
  const requestedCity = normalizeFabricText(input.city);
  const location = requestedCity ? (signalCity.includes(requestedCity) || requestedCity.includes(signalCity) ? 100 : 45) : 70;

  const price = Number(input.signal.price_min ?? input.signal.price_max ?? 0);
  let priceScore = 70;
  if (input.budgetMax != null && price > 0) {
    if (price <= input.budgetMax) priceScore = 100;
    else {
      const excess = (price - input.budgetMax) / Math.max(input.budgetMax, 1);
      priceScore = Math.max(0, 100 - excess * 200);
    }
  }

  const trust = Math.max(0, Math.min(100, Number(input.signal.trust_score ?? 50)));
  const observed = input.signal.observed_at ? Date.parse(input.signal.observed_at) : NaN;
  const ageDays = Number.isFinite(observed) ? Math.max(0, (Date.now() - observed) / 86_400_000) : 30;
  const freshness = Math.max(20, 100 - Math.min(ageDays, 80));

  const contactRank: Record<string, number> = { C0: 20, C1: 55, C2: 70, C3: 85, C4: 95, C5: 100 };
  const contactability = contactRank[String(input.signal.contactability_level ?? "C0")] ?? 20;

  const total = (
    relevance * 0.34 +
    intentScore * 0.18 +
    trust * 0.16 +
    priceScore * 0.12 +
    location * 0.08 +
    freshness * 0.06 +
    contactability * 0.06
  );

  const reasons: string[] = [];
  if (relevance >= 70) reasons.push("Produit très pertinent");
  else if (relevance >= 40) reasons.push("Produit compatible");
  if (priceScore >= 95 && input.budgetMax != null) reasons.push("Dans le budget");
  if (location >= 95 && input.city) reasons.push("Même zone");
  if (trust >= 80) reasons.push("Source de confiance");
  if (contactability >= 90) reasons.push("Contact autorisé");
  if (freshness >= 90) reasons.push("Signal récent");

  return {
    total_score: Math.round(Math.max(0, Math.min(100, total)) * 10) / 10,
    relevance_score: Math.round(relevance * 10) / 10,
    intent_score: intentScore,
    trust_score: trust,
    price_score: Math.round(priceScore * 10) / 10,
    location_score: location,
    freshness_score: Math.round(freshness * 10) / 10,
    contactability_score: contactability,
    reasons,
  };
}

export function contactabilityPolicy(level: unknown) {
  const value = String(level ?? "C0") as Contactability;
  switch (value) {
    case "C5": return { level: value, can_reveal: false, can_auto_contact: true, requires_approval: false, label: "Conversation établie · prêt à négocier" };
    case "C4": return { level: value, can_reveal: true, can_auto_contact: true, requires_approval: false, label: "Contact établi / Agent ↔ Agent" };
    case "C3": return { level: value, can_reveal: true, can_auto_contact: true, requires_approval: true, label: "Opt-in commercial" };
    case "C2": return { level: value, can_reveal: false, can_auto_contact: false, requires_approval: true, label: "Conversation privée / blind matching" };
    case "C1": return { level: value, can_reveal: true, can_auto_contact: false, requires_approval: false, label: "Contact professionnel public" };
    default: return { level: "C0" as const, can_reveal: false, can_auto_contact: false, requires_approval: false, label: "Découverte uniquement" };
  }
}

export function safeSourceUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["https:","http:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractPublicContactHints(text: unknown) {
  const value = String(text ?? "");
  const emails = [...new Set(value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].slice(0, 5);
  const urls = [...new Set(value.match(/https?:\/\/[^\s<>"']+/gi) ?? [])].map((url) => url.replace(/[),.;]+$/g, "")).slice(0, 8);
  const phones = [...new Set(value.match(/(?:\+?229[\s.-]?)?(?:01[\s.-]?)?(?:\d[\s.-]?){8,10}/g) ?? [])]
    .map((phone) => phone.trim())
    .filter((phone) => phone.replace(/\D/g, "").length >= 8)
    .slice(0, 5);
  return { phones, emails, urls };
}


export function redactPublicContacts(text: unknown) {
  let value = String(text ?? "");
  const hints = extractPublicContactHints(value);
  for (const phone of hints.phones) value = value.split(phone).join("[téléphone]");
  for (const email of hints.emails) value = value.split(email).join("[email]");
  return value;
}
