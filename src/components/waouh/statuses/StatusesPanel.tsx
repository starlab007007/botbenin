import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useStatuses, type StatusType } from "@/hooks/useStatuses";
import { StatusCard } from "./StatusCard";
import { StatusComposer } from "./StatusComposer";

const FILTERS: { key: StatusType | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "sell", label: "🔴 Vente" },
  { key: "buy", label: "🟢 Achat" },
  { key: "announce", label: "🟡 Annonce" },
];

interface Props {
  variant?: "mobile" | "web";
}

export function StatusesPanel({ variant = "mobile" }: Props) {
  const [filter, setFilter] = useState<StatusType | "all">("all");
  const { statuses, loading, deleteStatus } = useStatuses(filter);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const list = useMemo(() => statuses, [statuses]);

  return (
    <div className={cn("flex flex-col gap-3", variant === "mobile" ? "p-3" : "p-2")}>
      <div className="flex items-center gap-2">
        <StatusComposer />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full shrink-0 border",
                filter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center text-sm text-muted-foreground py-8">Chargement…</div>
      )}

      {!loading && list.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-10 px-6">
          <p className="font-medium mb-1">Aucun statut actif</p>
          <p className="text-xs">
            Publiez une vente urgente, une recherche ou une promo — visible 24h pour toute la communauté WAOUH.
          </p>
        </div>
      )}

      <div className={cn("grid gap-2", variant === "web" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
        {list.map((s) => (
          <StatusCard
            key={s.id}
            status={s}
            canDelete={uid === s.user_id}
            onDelete={deleteStatus}
          />
        ))}
      </div>
    </div>
  );
}
