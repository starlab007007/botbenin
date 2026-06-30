import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Approval {
  id: string; campaign_id: string | null; requested_by: string;
  audience_filters: any; audience_snapshot: any;
  message_template: string; media_url: string | null;
  quota_requested: number; quota_approved: number | null;
  status: string; reason: string | null;
  created_at: string;
}

export default function AdminDiffusionApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending"|"all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { quota?: number; reason?: string; template?: string }>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from("waouh_diffusion_approvals" as any).select("*").order("created_at", { ascending: false }).limit(100);
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setItems((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const act = async (a: Approval, action: "approve"|"reject") => {
    setBusy(a.id);
    try {
      const ov = overrides[a.id] || {};
      const { data, error } = await supabase.functions.invoke("waouh-diffusion-approve", {
        body: {
          approval_id: a.id, action,
          quota_approved: ov.quota ?? a.quota_requested,
          reason: ov.reason,
          message_template_override: ov.template,
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error);
      toast.success(action === "approve" ? "✅ Approuvée" : "❌ Rejetée");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📣 Validations de diffusion</h1>
        <div className="flex gap-2">
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>En attente</Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Toutes</Button>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading && <p className="text-center text-muted-foreground py-8">Chargement…</p>}
      {!loading && items.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune demande</p>}

      {items.map(a => (
        <Card key={a.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">Demande #{a.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
            </div>
            <Badge variant={a.status === "pending" ? "default" : a.status === "approved" ? "secondary" : "destructive"}>{a.status}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Info k="Total audience" v={a.audience_snapshot?.total ?? "—"} />
            <Info k="Plafond demandé" v={a.quota_requested} />
            <Info k="Secteurs" v={(a.audience_filters?.secteurs ?? []).join(", ") || "Tous"} />
            <Info k="Villes" v={(a.audience_filters?.villes ?? []).join(", ") || "Toutes"} />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Message</div>
            <Textarea value={overrides[a.id]?.template ?? a.message_template} rows={3}
              onChange={e => setOverrides(o => ({ ...o, [a.id]: { ...o[a.id], template: e.target.value }}))}
              disabled={a.status !== "pending"} />
          </div>

          {a.status === "pending" && (
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm whitespace-nowrap">Plafond approuvé :</label>
                <Input type="number" defaultValue={a.quota_requested} className="w-28"
                  onChange={e => setOverrides(o => ({ ...o, [a.id]: { ...o[a.id], quota: parseInt(e.target.value) || 0 }}))} />
              </div>
              <Input placeholder="Motif (optionnel)" className="flex-1"
                onChange={e => setOverrides(o => ({ ...o, [a.id]: { ...o[a.id], reason: e.target.value }}))} />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => act(a, "reject")} disabled={busy === a.id}>
                  <X className="h-4 w-4 mr-1" /> Rejeter
                </Button>
                <Button size="sm" className="bg-[hsl(165_91%_18%)]" onClick={() => act(a, "approve")} disabled={busy === a.id}>
                  {busy === a.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Approuver
                </Button>
              </div>
            </div>
          )}

          {a.status !== "pending" && a.reason && <p className="text-xs italic text-muted-foreground">Motif : {a.reason}</p>}
        </Card>
      ))}
    </div>
  );
}

function Info({ k, v }: { k: string; v: any }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <div className="text-muted-foreground">{k}</div>
      <div className="font-medium truncate">{String(v)}</div>
    </div>
  );
}
