import { marketVerdict } from "@/lib/waouh/marketVerdict";

type Market = { median?: number; low?: number; high?: number; count?: number; advice?: string | null; sources?: string[] };
const fmt = (n?: number | null) => (n ? `${Math.round(n).toLocaleString("fr-FR")} F` : "—");
const tones = { good: "text-primary border-primary/30 bg-primary/5", fair: "text-foreground border-border bg-muted/40", high: "text-destructive border-destructive/30 bg-destructive/5" };

/** Repère marché d'un échange : verdict, jauge bas / médiane / haut, conseil et provenance. */
export function WaouhMarketVerdict({ market, amount, label = "Prix affiché" }: { market?: Market | null; amount?: number | null; label?: string }) {
  if (!market?.median) return null;
  const v = marketVerdict(amount, market.median);
  const low = Math.min(market.low ?? market.median, amount ?? market.median);
  const high = Math.max(market.high ?? market.median, amount ?? market.median);
  const pos = amount && high > low ? Math.min(96, Math.max(4, ((amount - low) / (high - low)) * 100)) : 50;
  return (
    <div className={`mt-3 rounded-2xl border p-3 ${v ? tones[v.tone] : tones.fair}`} aria-label="Repère marché">
      <div className="flex items-baseline justify-between gap-2">
        <strong className="text-sm">{v ? v.label : "Repère marché"}</strong>
        <span className="text-xs text-muted-foreground">{market.count} comparable{(market.count ?? 0) > 1 ? "s" : ""}</span>
      </div>
      {v && <p className="text-xs text-muted-foreground">{label} {v.gapPct === 0 ? "au niveau du marché" : `${Math.abs(v.gapPct)} % ${v.gapPct < 0 ? "sous" : "au-dessus du"} marché`}</p>}
      <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-primary/40 via-muted to-destructive/40">
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground" style={{ left: `${pos}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{fmt(low)}</span><span>Médiane {fmt(market.median)}</span><span>{fmt(high)}</span></div>
      {market.advice && <p className="mt-2 text-xs">{market.advice}</p>}
      {!!market.sources?.length && <p className="mt-1 text-[11px] text-muted-foreground">Comparé avec : {market.sources.join(", ")}</p>}
    </div>
  );
}
