import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { biRepository } from "@/lib/waouh/biRepository";
import { stockRepository } from "@/lib/waouh/stockRepository";
import { presenceRepository } from "@/lib/waouh/presenceRepository";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Package, MapPin, ChevronRight } from "lucide-react";

type Agent = { id: string; name: string; kind: "bi" | "stock" | "attendance"; sub?: string; updated_at: string };

const META: Record<Agent["kind"], { label: string; icon: any; route: (id: string) => string; color: string }> = {
  bi:         { label: "BI / Analyse",   icon: BarChart3, route: (id) => `/app/agents/bi/${id}`,         color: "bg-blue-100 text-blue-700" },
  stock:      { label: "Gestion stock",  icon: Package,   route: () => `/app/agents/stock`,              color: "bg-amber-100 text-amber-700" },
  attendance: { label: "Présence QR",    icon: MapPin,    route: (id) => `/app/agents/attendance/${id}`, color: "bg-fuchsia-100 text-fuchsia-700" },
};

export default function MyAiAgentsSection() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [agents, setAgents] = useState<Agent[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [bi, products, sites] = await Promise.all([
        biRepository.fetchSources().catch(() => []),
        stockRepository.fetchProducts().catch(() => []),
        presenceRepository.fetchSites().catch(() => []),
      ]);

      const list: Agent[] = [
        ...bi.slice(0, 10).map((r) => ({
          id: r.id, name: r.name, kind: "bi" as const,
          sub: `${r.row_count || 0} lignes`, updated_at: r.updated_at,
        })),
        ...(products.length
          ? [{
              id: "stock", name: "Stock IA", kind: "stock" as const,
              sub: `${products.length} produits`,
              updated_at: products[0].updated_at,
            }]
          : []),
        ...sites.slice(0, 10).map((s) => ({
          id: s.id, name: s.name, kind: "attendance" as const,
          sub: s.address || undefined, updated_at: s.updated_at,
        })),
      ].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      setAgents(list);
    })();
  }, [user]);

  if (!user || agents === null || agents.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">Mes agents IA</div>
      {agents.map((a) => {
        const m = META[a.kind];
        const Icon = m.icon;
        return (
          <Card key={`${a.kind}-${a.id}`} className="cursor-pointer active:scale-[0.99] transition" onClick={() => navigate(m.route(a.id))}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${m.color}`}><Icon className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
                <div className="font-semibold text-sm truncate">{a.name}</div>
                {a.sub && <div className="text-xs text-muted-foreground truncate">{a.sub}</div>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
