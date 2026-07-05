import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Package, MapPin, ChevronRight } from "lucide-react";

type Agent = { id: string; name: string; kind: "bi" | "stock" | "attendance"; sub?: string; updated_at: string };

const META: Record<Agent["kind"], { label: string; icon: any; route: (id: string) => string; color: string }> = {
  bi:         { label: "BI / Analyse",   icon: BarChart3, route: (id) => `/app/agents/bi/${id}`,         color: "bg-blue-100 text-blue-700" },
  stock:      { label: "Gestion stock",  icon: Package,   route: (id) => `/app/agents/stock/${id}`,      color: "bg-amber-100 text-amber-700" },
  attendance: { label: "Présence QR",    icon: MapPin,    route: (id) => `/app/agents/attendance/${id}`, color: "bg-fuchsia-100 text-fuchsia-700" },
};

export default function MyAiAgentsSection() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [agents, setAgents] = useState<Agent[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [bi, stock, att] = await Promise.all([
        supabase.from("waouh_bi_datasources").select("id, name, row_count, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10),
        supabase.from("waouh_stock_agents").select("id, name, business_name, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10),
        supabase.from("waouh_attendance_sites").select("id, name, address, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10),
      ]);
      const list: Agent[] = [
        ...(bi.data || []).map((r) => ({ id: r.id, name: r.name, kind: "bi" as const, sub: `${r.row_count || 0} lignes`, updated_at: r.updated_at })),
        ...(stock.data || []).map((r) => ({ id: r.id, name: r.name, kind: "stock" as const, sub: r.business_name || undefined, updated_at: r.updated_at })),
        ...(att.data || []).map((r) => ({ id: r.id, name: r.name, kind: "attendance" as const, sub: r.address || undefined, updated_at: r.updated_at })),
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
