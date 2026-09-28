// WAOUH — Signaux prédictifs du parcours (purs, testés).
//
// Chaque suggestion est calculée à partir de données réelles ; quand elles
// manquent, la fonction renvoie null et l'interface n'affiche rien (jamais de
// valeur inventée). Voir « WAOUH Chat — Parcours unifié v3 », section Prédictif.

export const PRICE_STEP_FCFA = 25;
export const ACCEPT_FIRST_GAP = 0.03;
export const MIN_RESPONSE_SAMPLES = 5;
export const FOLLOW_UP_DELAYS_MS = [2 * 3600_000, 24 * 3600_000] as const;
export const OFFER_TTL_MS = 72 * 3600_000;

const roundTo = (value: number, step = PRICE_STEP_FCFA) => Math.round(value / step) * step;

export interface PriceContext {
  buyerOffer?: number | null;
  sellerOffer?: number | null;
  listPrice?: number | null;
  marketMin?: number | null;
  marketMax?: number | null;
}

const positive = (n: number | null | undefined): number | null =>
  n != null && Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : null;

export function suggestPrice(ctx: PriceContext): number | null {
  const buyer = positive(ctx.buyerOffer);
  const seller = positive(ctx.sellerOffer) ?? positive(ctx.listPrice);
  let value: number | null = null;
  if (buyer && seller) value = (buyer + seller) / 2;
  else if (seller) value = seller * 0.9;
  else if (buyer) value = buyer;
  if (value == null) return null;
  const min = positive(ctx.marketMin);
  const max = positive(ctx.marketMax);
  if (min && max && min <= max) value = Math.min(Math.max(value, min), max);
  const rounded = roundTo(value);
  return rounded > 0 ? rounded : null;
}

export function acceptFirst(receivedOffer: number | null | undefined, ownLastOffer: number | null | undefined): boolean {
  const received = positive(receivedOffer);
  const own = positive(ownLastOffer);
  if (!received || !own) return true;
  return Math.abs(received - own) / Math.max(received, own) <= ACCEPT_FIRST_GAP;
}

export function medianResponseMinutes(samplesMinutes: Array<number | null | undefined>): number | null {
  const values = samplesMinutes
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v >= 0)
    .sort((a, b) => a - b);
  if (values.length < MIN_RESPONSE_SAMPLES) return null;
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  return Math.max(1, Math.round(median));
}

export function responseSamples(
  events: Array<{ at: string | number | Date; role: "buyer" | "seller" }>,
  responder: "buyer" | "seller",
): number[] {
  const sorted = [...events].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const out: number[] = [];
  let pendingSince: number | null = null;
  for (const e of sorted) {
    const t = +new Date(e.at);
    if (e.role !== responder) {
      if (pendingSince == null) pendingSince = t;
    } else if (pendingSince != null) {
      out.push((t - pendingSince) / 60_000);
      pendingSince = null;
    }
  }
  return out;
}

export function followUpPlan(lastOfferAt: string | number | Date, now: number = Date.now()) {
  const base = +new Date(lastOfferAt);
  const followUps = FOLLOW_UP_DELAYS_MS.map((d) => new Date(base + d).toISOString());
  const expiresAt = new Date(base + OFFER_TTL_MS).toISOString();
  const next = followUps.find((iso) => +new Date(iso) > now) ?? null;
  return { followUps, nextFollowUpAt: next, expiresAt, expired: now >= base + OFFER_TTL_MS };
}

export function preselectPayment(history: Array<string | null | undefined>): "cash" | "mobile_money" | null {
  let cash = 0;
  let mobile = 0;
  for (const m of history) {
    if (m === "cash") cash += 1;
    else if (m === "mobile_money") mobile += 1;
  }
  if (Math.max(cash, mobile) < 2 || cash === mobile) return null;
  return cash > mobile ? "cash" : "mobile_money";
}

export function purchaseIntent(signals: {
  asked?: boolean;
  offered?: boolean;
  offerToListRatio?: number | null;
  returnVisits?: number | null;
}): number {
  let score = 20;
  if (signals.asked) score += 15;
  if (signals.offered) score += 30;
  const ratio = Number(signals.offerToListRatio);
  if (Number.isFinite(ratio) && ratio > 0) score += Math.round(Math.min(1, ratio) * 25);
  score += Math.min(10, Math.max(0, Number(signals.returnVisits || 0)) * 5);
  return Math.max(0, Math.min(100, score));
}
