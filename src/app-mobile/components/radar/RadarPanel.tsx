import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCcw,
  SlidersHorizontal,
  Siren,
  Map,
  List,
  Radar as RadarIcon,
  Play,
  PauseCircle,
} from "lucide-react";
import { useWaouhGeolocation } from "@/hooks/useWaouhGeolocation";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { RADAR_RINGS, formatDistance } from "../../utils/geo";
import { DEFAULT_FILTERS, useRadarScan, type RadarFilters, type RadarItem } from "../../hooks/useRadarScan";
import { useRadarLifecycle } from "../../hooks/useRadarLifecycle";
import { RadarCanvas } from "./RadarCanvas";
import { RadarFiltersSheet } from "./RadarFilters";
import { RadarItemSheet } from "./RadarItemSheet";
import {
  readRadarPauseReason,
  clearRadarPauseReason,
  type RadarPauseReason,
} from "../../utils/radarAutosend";

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

  // Auto-pause duration: urgence = 30s, otherwise filter setting (default 90s).
  const autoPauseMs = filters.urgent ? 30_000 : (filters.autoPauseMs ?? 90_000);
  const { paused, countdownMs, resume } = useRadarLifecycle({
    autoPauseMs,
    onResume: () => { refresh(); scan(); },
    scanKey: scanAt,
  });

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
    const distance = formatDistance(it.distanceKm);
    const price = it.priceMin || it.priceMax || "";
    const params = new URLSearchParams({
      new: "1",
      autosend: "1",
      intent,
      article: it.id,
      title: it.title,
      distance,
      ...(price ? { price: String(price), devise: it.devise || "FCFA" } : {}),
    });
    const target = `/app/chat/waouh?${params.toString()}`;
    if (!user) {
      navigate(`/app/auth?redirect=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  const toggleUrgent = () => {
    const next = { ...filters, urgent: !filters.urgent };
    setFilters(next);
    refresh();
  };

  const countdownSec = countdownMs != null ? Math.ceil(countdownMs / 1000) : null;

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
        <Button
          size="sm"
          variant={paused ? "default" : "ghost"}
          onClick={paused ? resume : () => { refresh(); scan(); }}
          disabled={loading}
          className={paused ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
        >
          {loading || geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : paused ? (
            <><Play className="h-4 w-4 mr-1" /> Relancer</>
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
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

      <div className="px-4 text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
        <Map className="h-3 w-3" />
        Autour de <span className="font-medium text-foreground">{geo.city}</span>
        {geo.district ? ` · ${geo.district}` : ""}
        {" · "} portée {maxRadiusKm} km
        {scanAt ? ` · ${filtered.length} résultat${filtered.length > 1 ? "s" : ""}` : ""}
        {!paused && countdownSec != null && countdownSec > 0 && (
          <span className="ml-auto text-[10px] inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <PauseCircle className="h-3 w-3" /> pause dans {countdownSec}s
          </span>
        )}
      </div>

      {/* Auto-pause banner */}
      {paused && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-200/60 bg-emerald-50/70 dark:bg-emerald-900/20 dark:border-emerald-800/60 p-3 flex items-center gap-3">
          <PauseCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">📡 Radar en pause</p>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 truncate">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""} • Relancez pour voir les nouveautés.
            </p>
          </div>
          <Button size="sm" onClick={resume} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Play className="h-4 w-4 mr-1" /> Relancer
          </Button>
        </div>
      )}

      {view === "radar" && (
        <div className="pt-4">
          <RadarCanvas items={filtered} maxRadiusKm={maxRadiusKm} scanning={!paused} onPick={setPicked} />
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
      <RadarItemSheet item={picked} onClose={() => setPicked(null)} onStartChat={(it, intent) => { setPicked(null); startChat(it, intent); }} />
    </div>
  );
}
