import type { WaouhResultCard } from "@/components/waouh/WaouhProductCard";
import { matchVerdict } from "../../../supabase/functions/_shared/waouh-need-domain";

/** Repère de prix renvoyé avec la publication d'une annonce. */
export type PriceReference = {
  asking_price?: number | null;
  comparable_count?: number | null;
  low?: number | null;
  median?: number | null;
  high?: number | null;
} | null;

export type SellerVerdict = {
  /** Position du prix demandé : sous le marché, dans le marché, au-dessus. */
  tone: "low" | "fair" | "high";
  label: string;
  advice: string;
  asking: number;
  median: number;
  low: number;
  high: number;
  count: number;
  /** Position de 0 à 100 pour la jauge. */
  position: number;
};

export type SellerBrief = {
  /** Acheteurs qui correspondent vraiment à l'annonce. */
  buyers: WaouhResultCard[];
  reachable: number;
  inZone: number;
  verdict: SellerVerdict | null;
  /** Phrase unique à afficher quand il n'y a pas de repère de prix. */
  priceNote: string | null;
};

const num = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const isReachable = (r: WaouhResultCard) => {
  const level = String((r as { contactability_level?: unknown }).contactability_level ?? "C0");
  return ["C2", "C3", "C4", "C5"].includes(level);
};

const sameCity = (r: WaouhResultCard, city?: string | null) => {
  if (!city?.trim()) return false;
  const a = String(r.city ?? "").toLowerCase();
  const b = city.toLowerCase();
  return !!a && (a.includes(b) || b.includes(a));
};

/** Verdict de prix pour le vendeur : où se situe son prix face aux annonces comparables. */
export function sellerPriceVerdict(reference: PriceReference): SellerVerdict | null {
  const asking = num(reference?.asking_price);
  const median = num(reference?.median);
  const count = Number(reference?.comparable_count ?? 0);
  if (asking === null || median === null || count < 2) return null;
  const low = num(reference?.low) ?? Math.min(asking, median);
  const high = num(reference?.high) ?? Math.max(asking, median);
  const gap = (asking - median) / median;
  const tone: SellerVerdict["tone"] = gap <= -0.1 ? "low" : gap >= 0.1 ? "high" : "fair";
  const percent = Math.round(Math.abs(gap) * 100);
  const label = tone === "fair"
    ? "Votre prix est dans le marché"
    : tone === "low"
      ? `Votre prix est ${percent} % sous le marché`
      : `Votre prix est ${percent} % au-dessus du marché`;
  const advice = tone === "fair"
    ? "Vous pouvez le laisser tel quel : il se compare bien aux autres annonces."
    : tone === "low"
      ? "Vous vendrez sans doute vite, mais vous pouvez demander davantage."
      : "Attendez-vous à négocier, ou baissez un peu pour vendre plus vite.";
  const span = Math.max(high, asking) - Math.min(low, asking);
  const position = span <= 0 ? 50 : Math.round(((asking - Math.min(low, asking)) / span) * 100);
  return { tone, label, advice, asking, median, low: Math.min(low, asking), high: Math.max(high, asking), count, position: Math.min(96, Math.max(4, position)) };
}

/**
 * Vue du vendeur après publication : les acheteurs qui correspondent vraiment, et
 * le prix demandé situé face aux annonces comparables.
 */
export function sellerBrief(
  results: WaouhResultCard[],
  ctx: { reference?: PriceReference; city?: string | null; query?: string | null } = {},
): SellerBrief {
  const buyers = results.filter((r) => {
    if (!ctx.query?.trim()) return true;
    return matchVerdict(ctx.query, {
      subject: r.title,
      raw_text: (r as { description?: unknown }).description,
      category: (r as { category?: unknown }).category,
      brand: (r as { brand?: unknown }).brand,
      model: (r as { model?: unknown }).model,
    }).acceptable;
  });
  const verdict = sellerPriceVerdict(ctx.reference ?? null);
  const asking = num(ctx.reference?.asking_price);
  const count = Number(ctx.reference?.comparable_count ?? 0);
  const priceNote = verdict
    ? null
    : asking === null
      ? "Ajoutez un prix pour que je le compare au marché."
      : count < 2
        ? "Aucune annonce comparable publiée : votre prix ne peut pas encore être situé."
        : null;
  return {
    buyers,
    reachable: buyers.filter(isReachable).length,
    inZone: buyers.filter((r) => sameCity(r, ctx.city)).length,
    verdict,
    priceNote,
  };
}
