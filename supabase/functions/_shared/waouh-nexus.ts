export type NexusWeights = {
  relevance: number;
  price: number;
  trust: number;
  location: number;
  freshness: number;
  availability: number;
};

export const DEFAULT_NEXUS_WEIGHTS: NexusWeights = {
  relevance: 0.30,
  price: 0.24,
  trust: 0.18,
  location: 0.10,
  freshness: 0.10,
  availability: 0.08,
};

export type ArticleLike = {
  id?: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  price?: number | string | null;
  city?: string | null;
  status?: string | null;
  origin?: string | null;
  source_channel?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  seller?: {
    id?: string | null;
    auth_user_id?: string | null;
    display_name?: string | null;
    city?: string | null;
    reputation?: number | string | null;
    sales_count?: number | null;
    is_verified?: boolean | null;
  } | null;
};

export type BuyerLike = {
  id?: string;
  query_text?: string | null;
  category?: string | null;
  keywords?: string[] | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  is_active?: boolean | null;
  origin?: string | null;
  source_channel?: string | null;
  created_at?: string | null;
  user?: {
    id?: string | null;
    auth_user_id?: string | null;
    display_name?: string | null;
    city?: string | null;
    reputation?: number | string | null;
    is_verified?: boolean | null;
  } | null;
};

const STOP = new Set([
  "je","j","cherche","recherche","veux","voudrais","un","une","des","le","la","les","de","du","dans",
  "avec","pour","moins","plus","a","à","au","aux","sur","en","et","ou","moi","mon","ma","mes","prix",
  "fcfa","cfa","xof","acheter","achat","vendre","vente","trouve","trouver",
]);

export function normalizeNexusText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nexusTokens(value: unknown): string[] {
  return [...new Set(normalizeNexusText(value).split(" ").filter((token) => token.length > 1 && !STOP.has(token)))];
}

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

export function tokenRelevance(query: string, haystack: string): number {
  const q = nexusTokens(query);
  if (!q.length) return 60;
  const h = new Set(nexusTokens(haystack));
  const matched = q.filter((token) => h.has(token)).length;
  const base = (matched / q.length) * 90;
  const nq = normalizeNexusText(query);
  const nh = normalizeNexusText(haystack);
  return clamp(base + (nq.length >= 4 && nh.includes(nq) ? 10 : 0));
}

export function sellerTrustScore(seller: ArticleLike["seller"], source?: string | null): number {
  let score = 45;
  if (seller?.is_verified) score += 20;
  const reputation = num(seller?.reputation);
  if (reputation != null) score += Math.max(0, Math.min(20, (reputation / 5) * 20));
  score += Math.min(10, Math.max(0, Number(seller?.sales_count ?? 0)) / 20 * 10);
  const s = normalizeNexusText(source);
  if (s.includes("partner")) score += 4;
  if (s.includes("radar")) score -= 5;
  return round1(clamp(score));
}

export function priceFitScore(price: unknown, budgetMax?: unknown, budgetMin?: unknown): number {
  const p = num(price);
  const max = num(budgetMax);
  const min = num(budgetMin);
  if (p == null || p < 0) return 35;
  if (max == null && min == null) return 70;
  if (max != null && p > max) {
    const over = (p - max) / Math.max(max, 1);
    return round1(clamp(55 - over * 180));
  }
  if (min != null && p < min) {
    const under = (min - p) / Math.max(min, 1);
    return round1(clamp(75 - under * 50));
  }
  if (max != null) {
    const ratio = p / Math.max(max, 1);
    // Une offre à l'intérieur du budget doit rester fortement valorisée :
    // 100 sous ~50 % du budget, ~90 au plafond, avant les autres critères.
    return round1(clamp(100 - ratio * 10));
  }
  return 85;
}

export function locationFitScore(candidateCity?: string | null, wantedCity?: string | null): number {
  const a = normalizeNexusText(candidateCity);
  const b = normalizeNexusText(wantedCity);
  if (!b) return 65;
  if (!a) return 45;
  return a === b ? 100 : (a.includes(b) || b.includes(a) ? 85 : 30);
}

export function freshnessScore(date?: string | null, now = Date.now()): number {
  if (!date) return 45;
  const ts = Date.parse(date);
  if (!Number.isFinite(ts)) return 45;
  const days = Math.max(0, (now - ts) / 86_400_000);
  if (days <= 1) return 100;
  if (days <= 7) return 92;
  if (days <= 30) return 76;
  if (days <= 90) return 55;
  return 35;
}

export function rankArticle(input: {
  query: string;
  budgetMax?: number | null;
  budgetMin?: number | null;
  city?: string | null;
  article: ArticleLike;
  weights?: Partial<NexusWeights>;
  now?: number;
}) {
  const { article } = input;
  const weights = { ...DEFAULT_NEXUS_WEIGHTS, ...(input.weights ?? {}) };
  const haystack = [
    article.title, article.brand, article.model, article.category, article.condition, article.description,
  ].filter(Boolean).join(" ");
  let relevance = tokenRelevance(input.query, haystack);
  const queryNorm = normalizeNexusText(input.query);
  if (article.category && queryNorm.includes(normalizeNexusText(article.category))) relevance = clamp(relevance + 8);
  if (article.brand && queryNorm.includes(normalizeNexusText(article.brand))) relevance = clamp(relevance + 8);
  const price = priceFitScore(article.price, input.budgetMax, input.budgetMin);
  const trust = sellerTrustScore(article.seller, article.source_channel ?? article.origin);
  const location = locationFitScore(article.city ?? article.seller?.city, input.city);
  const freshness = freshnessScore(article.updated_at ?? article.created_at, input.now);
  const availability = article.status === "active" || !article.status ? 100 : 0;
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  const total = (
    relevance * weights.relevance +
    price * weights.price +
    trust * weights.trust +
    location * weights.location +
    freshness * weights.freshness +
    availability * weights.availability
  ) / weightTotal;
  const reasons: string[] = [];
  if (relevance >= 75) reasons.push("Très proche de votre besoin");
  if (price >= 85) reasons.push("Prix dans votre budget");
  if (trust >= 75) reasons.push("Vendeur à forte confiance");
  if (location >= 90) reasons.push("Dans votre ville");
  if (freshness >= 90) reasons.push("Annonce récente");
  if (!reasons.length) reasons.push("Correspondance disponible");
  return {
    total_score: round1(clamp(total)),
    relevance_score: round1(relevance),
    price_score: round1(price),
    trust_score: round1(trust),
    location_score: round1(location),
    freshness_score: round1(freshness),
    availability_score: round1(availability),
    reasons,
  };
}

export function rankBuyer(input: {
  article: ArticleLike;
  buyer: BuyerLike;
  city?: string | null;
  now?: number;
}) {
  const query = [input.buyer.query_text, ...(input.buyer.keywords ?? [])].filter(Boolean).join(" ");
  const haystack = [input.article.title, input.article.brand, input.article.model, input.article.category, input.article.description].filter(Boolean).join(" ");
  let relevance = tokenRelevance(query, haystack);
  if (input.buyer.category && input.article.category &&
      normalizeNexusText(input.buyer.category) === normalizeNexusText(input.article.category)) relevance = clamp(relevance + 12);
  const price = priceFitScore(input.article.price, input.buyer.price_max, input.buyer.price_min);
  const location = locationFitScore(input.article.city, input.buyer.user?.city ?? input.city);
  const freshness = freshnessScore(input.buyer.created_at, input.now);
  const active = input.buyer.is_active === false ? 0 : 100;
  const total = relevance * 0.42 + price * 0.28 + location * 0.12 + freshness * 0.08 + active * 0.10;
  const reasons: string[] = [];
  if (relevance >= 70) reasons.push("Besoin très compatible");
  if (price >= 85) reasons.push("Budget compatible");
  if (location >= 90) reasons.push("Même zone");
  if (freshness >= 90) reasons.push("Demande récente");
  return {
    total_score: round1(clamp(total)),
    relevance_score: round1(relevance),
    price_score: round1(price),
    location_score: round1(location),
    freshness_score: round1(freshness),
    availability_score: round1(active),
    reasons: reasons.length ? reasons : ["Acheteur potentiel"],
  };
}

export function marketStats(values: Array<number | string | null | undefined>) {
  const prices = values.map(num).filter((value): value is number => value != null && value >= 0).sort((a, b) => a - b);
  if (!prices.length) return { min: null, median: null, max: null, average: null, sample_count: 0 };
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  const average = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  return {
    min: round1(prices[0]),
    median: round1(median),
    max: round1(prices[prices.length - 1]),
    average: round1(average),
    sample_count: prices.length,
  };
}