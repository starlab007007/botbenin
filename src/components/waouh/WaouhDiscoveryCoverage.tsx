export type DiscoveryRefresh = Record<string, { configured?: boolean; inserted?: number; reason?: string | null; status?: string }>;
export function WaouhDiscoveryCoverage({ refresh, count }: { refresh: DiscoveryRefresh; count: number }) {
  const labels: Record<string, string> = { google_places: "Établissements · Google", serpapi: "Web public et annuaires" };
  return <div className="rounded-2xl border bg-white p-3 text-xs" role="status">
    <p className="font-semibold">{count ? `${count} opportunité${count > 1 ? "s" : ""} sélectionnée${count > 1 ? "s" : ""}` : "Aucun résultat correspondant pour le moment"}</p>
    <p className="mt-1 text-slate-500">Offres indexées et sources accessibles. La couverture peut être partielle.</p>
    <ul className="mt-2 space-y-1">{Object.entries(refresh).map(([key, state]) => <li className="flex flex-wrap justify-between gap-1" key={key}><span>{labels[key] || key}</span><span className="text-slate-500">{state.reason === "not_selected_by_ai_plan" || state.status === "not_requested" ? "Non sollicitée" : state.reason || state.configured === false ? "Indisponible · offres indexées conservées" : `Consultée · ${state.inserted || 0} signal(s) ajouté(s)`}</span></li>)}</ul>
    {!count && <p className="mt-2">Précisez le produit, élargissez la zone ou confiez une veille à l’Avatar.</p>}
  </div>;
}
