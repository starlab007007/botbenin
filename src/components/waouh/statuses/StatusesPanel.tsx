import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useStatuses, type StatusType } from "@/hooks/useStatuses";
import { StatusCard } from "./StatusCard";
import { StatusComposer } from "./StatusComposer";
import { Sparkles } from "lucide-react";

const FILTERS: { key: StatusType | "all"; label: string; dot: string }[] = [
  { key: "all",      label: "Tous",     dot: "bg-foreground" },
  { key: "sell",     label: "Vente",    dot: "bg-red-500" },
  { key: "buy",      label: "Achat",    dot: "bg-emerald-500" },
  { key: "announce", label: "Annonce",  dot: "bg-amber-500" },
];

interface Props {
  /** mobile: vertical list ; web: 2-col grid ; web-strip: horizontal scroller (stories) */
  variant?: "mobile" | "web" | "web-strip";
  /** Optional search query to filter statuses */
  query?: string;
}

function CardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-muted animate-pulse",
        compact ? "h-[88px]" : "h-[104px]"
      )}
    />
  );
}

export function StatusesPanel({ variant = "mobile" }: Props) {
  const [filter, setFilter] = useState<StatusType | "all">("all");
  const { statuses, loading, deleteStatus } = useStatuses(filter);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const list = useMemo(() => statuses, [statuses]);
  const isStrip = variant === "web-strip";

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        variant === "mobile" ? "p-3" : "p-2"
      )}
    >
      {/* Header : Composer + filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusComposer />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full shrink-0 border inline-flex items-center gap-1.5 transition-colors",
                filter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border hover:border-foreground/40"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", f.dot)} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div
          className={cn(
            isStrip
              ? "flex gap-2 overflow-x-auto scrollbar-none"
              : variant === "web"
                ? "grid grid-cols-1 md:grid-cols-2 gap-2"
                : "grid grid-cols-1 gap-2"
          )}
        >
          {Array.from({ length: isStrip ? 4 : 3 }).map((_, i) => (
            <div key={i} className={cn(isStrip && "min-w-[280px] shrink-0")}>
              <CardSkeleton compact={isStrip} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && list.length === 0 && (
        <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-border bg-card/50">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="font-semibold text-sm mb-1">Aucun statut actif</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Publiez une vente urgente, une recherche ou une promo — visible 24h pour toute la communauté WAOUH.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && list.length > 0 && (
        <div
          className={cn(
            isStrip
              ? "flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1"
              : variant === "web"
                ? "grid grid-cols-1 md:grid-cols-2 gap-2"
                : "grid grid-cols-1 gap-2"
          )}
        >
          {list.map((s) => (
            <div
              key={s.id}
              className={cn(isStrip && "min-w-[280px] max-w-[300px] shrink-0 snap-start")}
            >
              <StatusCard
                status={s}
                canDelete={uid === s.user_id}
                onDelete={deleteStatus}
                compact={isStrip}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
