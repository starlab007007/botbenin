// Verdict prix partagé avec l'appli mobile : <= -10 % = bonne affaire, > +15 % = trop cher.
export type MarketVerdict = { tone: "good" | "fair" | "high"; label: string; gapPct: number };
export function marketVerdict(amount?: number | null, reference?: number | null): MarketVerdict | null {
  if (!amount || !reference || amount <= 0 || reference <= 0) return null;
  const gap = (amount - reference) / reference;
  const gapPct = Math.round(gap * 100);
  if (gap <= -0.1) return { tone: "good", label: "Bonne affaire", gapPct };
  if (gap > 0.15) return { tone: "high", label: "Trop cher", gapPct };
  return { tone: "fair", label: "Prix juste", gapPct };
}
