import { sourceDisplayName } from "@/lib/waouh/sourcePresentation";
import { useEffect, useState } from "react";
import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";
import { moneyXof } from "@/lib/waouh/agenticClient";

/** Compare source observations without treating them as confirmed sale terms. */
export function WaouhOfferComparison({ results }: { results: NexusDiscoveryResult[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { setSelected(ids => ids.filter(id => results.some(result => result.fabric_id === id))); }, [results]);
  if (results.length < 2) return null;
  const offers = results.filter(result => selected.includes(result.fabric_id));
  return <details className="col-span-full min-w-0 rounded-xl border bg-background px-3">
    <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold">Comparer les offres{selected.length ? ` · ${selected.length}` : ""}</summary>
    <p className="mb-2 text-xs text-muted-foreground">Choisissez jusqu’à 3 offres. Prix observés, conditions à confirmer.</p>
    <div className="max-h-40 overflow-y-auto space-y-1">
      {results.map(result => <label key={result.fabric_id} className="flex min-h-11 items-center gap-2 text-xs">
        <input type="checkbox" className="h-4 w-4 shrink-0" checked={selected.includes(result.fabric_id)} disabled={selected.length >= 3 && !selected.includes(result.fabric_id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, result.fabric_id] : ids.filter(id => id !== result.fabric_id))} />
        <span className="min-w-0 break-words">{result.subject || result.category || "Offre"}</span>
      </label>)}
    </div>
    {offers.length > 0 && <div className="my-3 grid gap-2 sm:grid-cols-3">{offers.map(result => <dl key={result.fabric_id} className="min-w-0 rounded-xl bg-muted/40 p-3 text-xs">
      <dt className="break-words font-semibold">{result.subject || result.category || "Offre"}</dt>
      <dd className="mt-2 font-semibold">{result.price_min != null && result.price_max != null && result.price_min !== result.price_max ? `${moneyXof(result.price_min)} – ${moneyXof(result.price_max)}` : result.price_min != null || result.price_max != null ? moneyXof(result.price_min ?? result.price_max) : "Prix à demander"}</dd>
      <dd className="mt-1 break-words">{result.city || "Zone à confirmer"} · {sourceDisplayName(result.source_key)}</dd>
      <dd className="mt-2 text-muted-foreground">État, stock, livraison : à confirmer.</dd>
    </dl>)}</div>}
  </details>;
}
