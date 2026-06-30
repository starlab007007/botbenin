import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Send, TrendingUp, MessageCircleReply, Target, Repeat } from "lucide-react";
import { toast } from "sonner";

interface KPI {
  campaign_id: string;
  name: string;
  mode: string;
  status: string;
  created_at: string;
  quota_approved: number | null;
  quota_consumed: number | null;
  total_sent: number;
  total_responded: number;
  total_relaunched: number;
  response_rate_pct: number;
  total_interested: number;
  conversion_rate_pct: number;
}

export default function DiffusionTrackingDashboard() {
  const [rows, setRows] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_diffusion_campaign_kpis" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const relaunch = async (campaign_id: string) => {
    setBusy(campaign_id);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-diffusion-relaunch", {
        body: { campaign_id, min_age_days: 3, max: 200 },
      });
      if (error) throw error;
      const r = data as any;
      toast.success(`Relance J+3 : ${r.relaunched} envois (${r.candidates} candidats)`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur relance");
    } finally {
      setBusy(null);
    }
  };

  const totals = rows.reduce((a, r) => ({
    sent: a.sent + (r.total_sent || 0),
    responded: a.responded + (r.total_responded || 0),
    interested: a.interested + (r.total_interested || 0),
    relaunched: a.relaunched + (r.total_relaunched || 0),
  }), { sent: 0, responded: 0, interested: 0, relaunched: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">📊 Suivi Diffusion IA</h2>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Send className="h-4 w-4" />} label="Envoyés" value={totals.sent} />
        <Stat icon={<MessageCircleReply className="h-4 w-4" />} label="Répondus" value={totals.responded} />
        <Stat icon={<Target className="h-4 w-4" />} label="Intéressés" value={totals.interested} accent />
        <Stat icon={<Repeat className="h-4 w-4" />} label="Relancés J+3" value={totals.relaunched} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune campagne pour le moment. Lancez une diffusion IA pour voir les KPI ici.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.campaign_id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{r.name || "Sans nom"}</span>
                    <Badge variant="outline" className="text-[10px]">{r.mode}</Badge>
                    <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Quota {r.quota_consumed ?? 0}{r.quota_approved ? ` / ${r.quota_approved}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => relaunch(r.campaign_id)}
                  disabled={busy === r.campaign_id || (r.total_sent - r.total_responded) <= 0}
                  title="Relancer les non-répondants ≥ 3 jours"
                >
                  {busy === r.campaign_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Repeat className="h-3 w-3" />}
                  <span className="ml-1 text-xs">Relance J+3</span>
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                <Mini label="Envoyés" value={r.total_sent} />
                <Mini label="Réponses" value={`${r.total_responded} · ${r.response_rate_pct}%`} />
                <Mini label="Convertis" value={`${r.total_interested} · ${r.conversion_rate_pct}%`} accent />
                <Mini label="Relances" value={r.total_relaunched} />
              </div>

              <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600"
                  style={{ width: `${Math.min(100, r.conversion_rate_pct)}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
        <TrendingUp className="h-3 w-3" />
        Conversion = nb d'« intéressés » remontés via le pipeline acheteur sur le nb envoyé.
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <Card className={"p-3 " + (accent ? "border-emerald-500/40 bg-emerald-500/5" : "")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-xl font-bold mt-1">{value.toLocaleString("fr-FR")}</div>
    </Card>
  );
}
function Mini({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className={"rounded border p-1.5 " + (accent ? "border-emerald-500/40 bg-emerald-500/5" : "")}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
