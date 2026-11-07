import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";
import { channelName, offerChannels, type OfferChannel } from "@/lib/waouh/offerChannels";

type Item = NexusDiscoveryResult;

export type MarketCompareRow = {
  item: Item;
  price: number | null;
  /** Écart à la médiane du marché, en % (négatif = moins cher). */
  vsMedianPct: number | null;
  channels: OfferChannel[];
  rank: number;
};

export type MarketAnalysis = {
  total: number;
  priced: number;
  low: number | null;
  median: number | null;
  high: number | null;
  inZone: number;
  contactable: number;
  byChannel: Record<OfferChannel, number>;
  pick: (MarketCompareRow & { reason: string }) | null;
  compare: MarketCompareRow[];
  advice: string;
};

const priceOf = (item: Item): number | null => {
  const p = item.price_min ?? item.price_max;
  return typeof p === "number" && p > 0 ? p : null;
};

const medianOf = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const sameZone = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

/** Analyse du marché des offres reçues et choix de l'avatar : meilleur équilibre prix, proximité, fiabilité et contact. */
export function analyzeMarket(results: Item[], ctx: { city?: string | null } = {}): MarketAnalysis {
  const prices = results.map(priceOf).filter((p): p is number => p !== null);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  const median = medianOf(prices);
  const byChannel: Record<OfferChannel, number> = { waouh: 0, whatsapp: 0, email: 0, phone: 0 };
  const rows: MarketCompareRow[] = [];
  let contactable = 0;
  let inZone = 0;
  for (const item of results) {
    const channels = offerChannels(item);
    channels.forEach((c) => { byChannel[c] += 1; });
    if (channels.length) contactable += 1;
    if (sameZone(item.city, ctx.city)) inZone += 1;
    const price = priceOf(item);
    const vsMedianPct = price !== null && median ? Math.round(((price - median) / median) * 100) : null;
    // Prix : le plus bas de la fourchette vaut 100, la médiane ~60 ; sans prix, on ne peut pas comparer.
    const priceScore = price === null || median === null || high === null || low === null ? 25 : Math.max(0, Math.min(100, 100 - ((price - low) / Math.max(1, high - low)) * 70));
    const zoneScore = sameZone(item.city, ctx.city) ? 100 : 40;
    const trust = Math.max(0, Math.min(100, Number(item.scores?.trust_score ?? item.trust_score ?? 50)));
    const channelScore = channels.includes("waouh") ? 100 : channels.includes("whatsapp") ? 80 : channels.length ? 60 : 0;
    const relevance = Math.max(0, Math.min(100, Number(item.scores?.total_score ?? 50)));
    const rank = Math.round(priceScore * 0.3 + zoneScore * 0.15 + trust * 0.15 + channelScore * 0.2 + relevance * 0.2);
    rows.push({ item, price, vsMedianPct, channels, rank });
  }
  const candidates = rows.filter((r) => r.channels.length > 0).sort((a, b) => b.rank - a.rank);
  const compare = candidates.slice(0, 3);
  const best = compare[0];
  let pick: MarketAnalysis["pick"] = null;
  if (best) {
    const parts: string[] = [];
    if (best.price !== null) parts.push(best.vsMedianPct !== null && best.vsMedianPct < 0 ? `${money(best.price)}, ${Math.abs(best.vsMedianPct)} % sous la médiane` : best.vsMedianPct !== null && best.vsMedianPct > 0 ? `${money(best.price)}, ${best.vsMedianPct} % au-dessus de la médiane` : money(best.price));
    if (sameZone(best.item.city, ctx.city)) parts.push("dans votre zone");
    parts.push(`joignable par ${channelName(best.channels[0])}`);
    pick = { ...best, reason: parts.join(" · ") };
  }
  const advice = !results.length
    ? "Aucune offre pour l'instant."
    : !contactable
      ? "Aucune offre n'a de contact exploitable : ouvrez les annonces d'origine ou activez une veille."
      : prices.length < 3
        ? "Peu de prix à comparer : gardez une marge de négociation prudente."
        : median ? `Visez autour de ${money(Math.round(median * 0.9))} : c'est 10 % sous la médiane du marché.` : "Comparez les offres avant de proposer un prix.";
  return { total: results.length, priced: prices.length, low, median, high, inZone, contactable, byChannel, pick, compare, advice };
}
