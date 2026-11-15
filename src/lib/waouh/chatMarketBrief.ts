// Analyse du marché dans la fenêtre de recherche du Chat.
//
// Tout est calculé à partir des fiches réellement reçues : repères de prix, zone, vendeurs
// joignables, choix de Bot et comparaison des meilleures offres. Aucune valeur n'est inventée :
// une information absente reste « à confirmer ».
import type { WaouhResultCard } from "@/components/waouh/WaouhProductCard";
import { sameZone } from "@/lib/waouh/liveReasoning";
import { resultContact } from "@/lib/waouh/resultCardData";

export type BriefRow = {
  result: WaouhResultCard;
  price: number | null;
  /** Écart à la médiane, en % (négatif = moins cher). */
  vsMedianPct: number | null;
  inZone: boolean;
  withinBudget: boolean | null;
  reachable: boolean;
  /** Identifiant de l'offre que Bot peut prendre en charge, sinon null. */
  delegateId: string | null;
  rank: number;
};

export type ChatMarketBrief = {
  total: number;
  priced: number;
  low: number | null;
  median: number | null;
  high: number | null;
  inZone: number;
  reachable: number;
  overBudget: number;
  advice: string;
  pick: (BriefRow & { reasons: string[] }) | null;
  compare: BriefRow[];
  /** Offres que Bot peut prendre en charge, de la plus pertinente à la moins pertinente. */
  delegable: BriefRow[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const briefPrice = (r: WaouhResultCard): number | null => {
  const v = Number(r.price ?? r.price_min ?? r.price_max);
  return Number.isFinite(v) && v > 0 ? v : null;
};

export const briefMoney = (n: number | null) =>
  n === null ? "—" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)).replace(/[\u202f\u00a0]/g, " ")} F`;

const isBuyerRequest = (r: WaouhResultCard) => {
  const evidence = (r.evidence ?? {}) as Record<string, unknown>;
  const intent = String(r.intent || evidence.intent || "").toUpperCase();
  const actor = String(r.actor_type || evidence.actor_type || "").toLowerCase();
  return intent === "BUY" || intent === "RFQ" || actor === "buyer";
};

/**
 * Identifiant de l'offre pour la prise en charge par Bot. Une fiche du Chat sans référence
 * directe n'est confiée que si son identité est sûre (annonce WAOUH ou catalogue partenaire).
 */
export function briefDelegateId(r: WaouhResultCard): string | null {
  if (isBuyerRequest(r) || r.action === null) return null;
  const fabric = String(r.fabric_id || "").trim();
  if (fabric) return fabric;
  const source = String(r.source || "waouh").toLowerCase();
  const article = String(r.article_id || "").trim();
  if (UUID_RE.test(article)) return `article:${article}`;
  if (["waouh", "chat", "waouh_app"].includes(source) && UUID_RE.test(String(r.id || ""))) return `article:${r.id}`;
  const catalog = String(r.catalog_id || (source === "partner" || source === "catalog" ? r.id : "") || "").trim();
  if ((source === "partner" || source === "catalog") && UUID_RE.test(catalog)) return `catalog:${catalog}`;
  return null;
}

const medianOf = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const hasPhoto = (r: WaouhResultCard) => Array.isArray(r.photos) && r.photos.some((p) => typeof p === "string" && /^https?:\/\//i.test(p));

/** Classement lisible : dans le budget, dans la zone, joignable, prix proche ou sous la médiane, photo. */
function fitness(row: Omit<BriefRow, "rank">, median: number | null): number {
  let score = 0;
  if (row.withinBudget === true) score += 30;
  if (row.withinBudget === false) score -= 40;
  if (row.inZone) score += 22;
  if (row.reachable) score += 18;
  if (row.delegateId) score += 6;
  if (hasPhoto(row.result)) score += 8;
  if (row.price === null) score -= 12;
  else if (median) {
    const gap = (row.price - median) / median;
    // Un prix très inférieur au marché n'est pas un avantage : il demande une vérification.
    score += gap < -0.5 ? -6 : Math.max(-15, Math.min(15, -gap * 30));
  }
  return score;
}

export function chatMarketBrief(results: WaouhResultCard[], ctx: { city?: string | null; budget?: number | null } = {}): ChatMarketBrief {
  // Les demandes d'acheteurs (recherche pour vendre) ne sont pas des offres à comparer.
  const pool = results.filter((r) => !isBuyerRequest(r));
  const prices = pool.map(briefPrice).filter((p): p is number => p !== null);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  const median = medianOf(prices);
  const budget = ctx.budget && ctx.budget > 0 ? ctx.budget : null;

  const base = pool.map((result, order) => {
    const price = briefPrice(result);
    const delegateId = briefDelegateId(result);
    const row = {
      result,
      price,
      vsMedianPct: price !== null && median ? Math.round(((price - median) / median) * 100) : null,
      inZone: sameZone(result.city, ctx.city ?? undefined),
      withinBudget: budget && price !== null ? price <= budget : null,
      reachable: !!delegateId || !!resultContact(result).phone,
      delegateId,
    };
    return { row, order, score: fitness(row, median) };
  });
  // À pertinence égale, l'ordre reçu du moteur est conservé.
  const ranked: BriefRow[] = [...base]
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ row }, i) => ({ ...row, rank: i + 1 }));

  const inZone = ranked.filter((r) => r.inZone).length;
  const reachable = ranked.filter((r) => r.reachable).length;
  const overBudget = ranked.filter((r) => r.withinBudget === false).length;

  const top = ranked[0] ?? null;
  const reasons: string[] = [];
  if (top) {
    if (top.withinBudget === true && budget && top.price !== null) reasons.push(top.price < budget ? `${briefMoney(budget - top.price)} sous votre budget` : "Dans votre budget");
    if (top.inZone && ctx.city) reasons.push(`Dans votre zone · ${top.result.city}`);
    if (top.vsMedianPct !== null && top.vsMedianPct < -50) reasons.push("Prix très inférieur aux autres offres : à vérifier avant tout accord");
    else if (top.vsMedianPct !== null && top.vsMedianPct <= -3) reasons.push(`${Math.abs(top.vsMedianPct)} % sous le prix médian`);
    else if (top.vsMedianPct !== null && Math.abs(top.vsMedianPct) < 3 && ranked.length > 1) reasons.push("Au prix médian des offres comparées");
    if (top.reachable) reasons.push("Vendeur joignable");
    if (hasPhoto(top.result)) reasons.push("Photos fournies");
    if (!reasons.length) reasons.push("L’offre la plus proche de votre demande");
  }

  let advice: string;
  if (!ranked.length) advice = "Aucune offre à comparer pour le moment.";
  else if (low !== null && high !== null && median !== null && prices.length > 1 && low !== high) {
    advice = `Les prix annoncés vont de ${briefMoney(low)} à ${briefMoney(high)}, avec un prix médian de ${briefMoney(median)}.`;
    if (budget) advice += overBudget ? ` ${overBudget} offre${overBudget > 1 ? "s dépassent" : " dépasse"} votre budget de ${briefMoney(budget)}.` : ` Toutes les offres chiffrées tiennent dans votre budget de ${briefMoney(budget)}.`;
  } else if (low !== null) {
    advice = prices.length > 1 ? `Les offres chiffrées sont toutes annoncées à ${briefMoney(low)}.` : `Une seule offre annonce un prix : ${briefMoney(low)}. Les autres sont à demander.`;
    if (ranked.length === 1) advice = `Une offre trouvée, annoncée à ${briefMoney(low)}. Le prix reste à confirmer avec le vendeur.`;
  } else {
    advice = "Aucun prix n’est annoncé sur ces offres : il sera demandé au vendeur.";
  }

  return {
    total: ranked.length,
    priced: prices.length,
    low, median, high,
    inZone, reachable, overBudget,
    advice,
    pick: top ? { ...top, reasons: reasons.slice(0, 3) } : null,
    compare: ranked.slice(0, 3),
    delegable: ranked.filter((r) => !!r.delegateId && r.withinBudget !== false),
  };
}
