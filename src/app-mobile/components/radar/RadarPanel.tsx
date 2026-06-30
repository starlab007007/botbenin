import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, SlidersHorizontal, Siren, Map, List, Radar as RadarIcon } from "lucide-react";
import { useWaouhGeolocation } from "@/hooks/useWaouhGeolocation";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { RADAR_RINGS, formatDistance } from "../../utils/geo";
import { DEFAULT_FILTERS, useRadarScan, type RadarFilters, type RadarItem } from "../../hooks/useRadarScan";
import { RadarCanvas } from "./RadarCanvas";
import { RadarFiltersSheet } from "./RadarFilters";
import { RadarItemSheet } from "./RadarItemSheet";

const FILTERS_KEY = "waouh_radar_filters_v1";

function loadFilters(): RadarFilters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (raw) return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_FILTERS;
}

function priceLabel(it: RadarItem) {
  if (!it.priceMin && !it.priceMax) return "";
  if (it.priceMin && it.priceMax && it.priceMin !== it.priceMax)
    return `${it.priceMin.toLocaleString("fr-FR")}–${it.priceMax.toLocaleString("fr-FR")} ${it.devise || "FCFA"}`;
  return `${(it.priceMin || it.priceMax)?.toLocaleString("fr-FR")} ${it.devise || "FCFA"}`;
}

export function RadarPanel({ query = "" }: { query?: string }) {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const { geo, refresh, loading: geoLoading } = useWaouhGeolocation();
  const [filters, setFilters] = useState<RadarFilters>(loadFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [picked, setPicked] = useState<RadarItem | null>(null);
  const [view, setView] = useState<"radar" | "list">("radar");

  useEffect(() => {
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify(filters)); } catch {}
  }, [filters]);

  const { items, loading, scan, scanAt, maxRadiusKm } = useRadarScan(geo.lat, geo.lng, filters);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.title.toLowerCase().includes(q) ||
      (it.description || "").toLowerCase().includes(q) ||
      (it.city || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const byRing = useMemo(() => {
    const groups: Record<number, RadarItem[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const it of filtered) groups[it.ringId]?.push(it);
    return groups;
  }, [filtered]);

  const startChat = (it: RadarItem, intent: "interest" | "negotiate" | "buy") => {
    if (!user) {
      navigate("/app/auth?redirect=/app/chat");
      return;
    }
    const distance = formatDistance(it.distanceKm);
    const phrases: Record<string, string> = {
      interest: `Bonjour 👋, je suis intéressé(e) par "${it.title}" vu sur le Radar WAOUH (${distance}). Est-il toujours disponible ?`,
      negotiate: `Bonjour, vu sur le Radar WAOUH à ${distance} : "${it.title}"${it.priceMin ? ` à ${it.priceMin.toLocaleString("fr-FR")} FCFA` : ""}. Je voudrais négocier le prix, est-ce possible ?`,
      buy: `Je veux acheter "${it.title}" (Radar WAOUH · ${distance})${it.priceMin ? ` à ${it.priceMin.toLocaleString("fr-FR")} FCFA` : ""}. Comment on procède ?`,
    };
    const prefill = encodeURIComponent(phrases[intent]);
    navigate(`/app/chat/waouh?new=1&prefill=${prefill}`);
  };

  const toggleUrgent = () => {
    const next = { ...filters, urgent: !filters.urgent };
    setFilters(next);
    refresh();
  };

  return (
    <div className="pb-24">
      {/* Control bar */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filters.urgent ? "default" : "outline"}
          onClick={toggleUrgent}
          className={filters.urgent ? "bg-red-600 hover:bg-red-700 text-white" : ""}
        >
          <Siren className="h-4 w-4 mr-1" /> Urgence
        </Button>
        <Button size="sm" variant="outline" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="h-4 w-4 mr-1" /> Filtres
          {(filters.category || filters.priceMin || filters.priceMax || filters.types.length) ? (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">●</Badge>
          ) : null}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { refresh(); scan(); }} disabled={loading}>
          {loading || geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
        <div className="ml-auto inline-flex rounded-md overflow-hidden border">
          <button
            onClick={() => setView("radar")}
            className={"px-2 py-1.5 text-xs " + (view === "radar" ? "bg-emerald-600 text-white" : "")}
            aria-label="Vue radar"
          >
            <RadarIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={"px-2 py-1.5 text-xs " + (view === "list" ? "bg-emerald-600 text-white" : "")}
            aria-label="Vue liste"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-4 text-[11px] text-muted-foreground flex items-center gap-1">
        <Map className="h-3 w-3" />
        Autour de <span className="font-medium text-foreground">{geo.city}</span>
        {geo.district ? ` · ${geo.district}` : ""}
        {" · "} portée {maxRadiusKm} km
        {scanAt ? ` · ${filtered.length} résultat${filtered.length > 1 ? "s" : ""}` : ""}
      </div>

      {view === "radar" && (
        <div className="pt-4">
          <RadarCanvas items={filtered} maxRadiusKm={maxRadiusKm} scanning={loading || true} onPick={setPicked} />
          <div className="px-4 pt-3 grid grid-cols-2 gap-2">
            {RADAR_RINGS.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded border border-border bg-muted/30">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.label}
                </span>
                <span className="font-semibold">{byRing[r.id]?.length ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List section (always present below for scrollable accessibility, or as main view) */}
      <div className="px-3 pt-4 space-y-4">
        {RADAR_RINGS.map((ring) => {
          const list = byRing[ring.id] || [];
          if (!list.length && view === "radar") return null;
          return (
            <section key={ring.id}>
              <h3 className="text-xs font-bold uppercase tracking-wide px-1 mb-2 flex items-center gap-2" style={{ color: ring.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ring.color }} />
                {ring.label} · {list.length}
              </h3>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">Aucune opportunité dans ce rayon.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {list.slice(0, 12).map((it) => (
                    <button
                      key={it.id}
                      onClick={() => setPicked(it)}
                      className="text-left rounded-lg overflow-hidden border bg-card active:scale-[0.98] transition-transform"
                    >
                      <div className="relative aspect-square bg-muted">
                        {it.photo ? (
                          <img src={it.photo} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-emerald-400 to-teal-600" />
                        )}
                        <span
                          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: it.ringColor }}
                        >
                          {formatDistance(it.distanceKm)}
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium line-clamp-1">{it.title}</p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold line-clamp-1">{priceLabel(it)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <RadarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
            Aucun résultat dans la zone. Élargissez les filtres ou activez le mode Urgence.
          </div>
        )}
      </div>

      <RadarFiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} value={filters} onChange={setFilters} />
      <RadarItemSheet item={picked} onClose={() => setPicked(null)} onStartChat={startChat} />
    </div>
  );
}
