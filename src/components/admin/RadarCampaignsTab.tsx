import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Pause, Trash2, Plus, Zap, AlertTriangle, RefreshCw } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  mode: "announcement" | "search" | "notice" | "reminder";
  message_template: string;
  segment: any;
  schedule: any;
  status: "draft" | "active" | "paused" | "done";
  rate_limit_per_hour: number;
  max_per_contact_per_week: number;
  next_run_at: string | null;
  last_run_at: string | null;
};

const MODE_LABELS: Record<string, string> = {
  announcement: "📢 Annonce",
  search: "🔍 Recherche",
  notice: "ℹ️ Avis",
  reminder: "⏰ Relance",
};

const WEEKDAYS = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mer" },
  { v: 4, l: "Jeu" }, { v: 5, l: "Ven" }, { v: 6, l: "Sam" }, { v: 0, l: "Dim" },
];

function emptyCampaign(): Partial<Campaign> {
  return {
    name: "", mode: "announcement", message_template: "",
    segment: { categories: [], cities: [], intent: "ANY", min_signals: 0, last_seen_within_days: 30 },
    schedule: { type: "one_shot", hour: 10, minute: 0, days_of_week: [1] },
    status: "draft", rate_limit_per_hour: 60, max_per_contact_per_week: 1,
  };
}

export default function RadarCampaignsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [diag, setDiag] = useState<{ invalid: number; merged: any[] } | null>(null);
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ count: number; sample: any[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (action: string, body: any = {}) => {
    const { data, error } = await supabase.functions.invoke("waouh-radar-campaign-manager", { body: { action, ...body } });
    if (error) throw new Error(error.message);
    if (data && data.ok === false) throw new Error(data.error || "Erreur");
    return data;
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await call("list");
      setCampaigns(r.campaigns || []);
      setStats(r.stats || {});
      const d = await call("normalize_diagnostic").catch(() => null);
      if (d) setDiag({ invalid: d.invalid, merged: d.merged });
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const previewSegment = async () => {
    if (!editing) return;
    setPreviewing(true);
    try {
      const r = await call("preview_segment", { segment: editing.segment });
      setPreview({ count: r.count, sample: r.sample || [] });
    } catch (e: any) {
      toast({ title: "Erreur preview", description: e.message, variant: "destructive" });
    } finally { setPreviewing(false); }
  };

  const save = async () => {
    if (!editing?.name || !editing?.message_template) {
      toast({ title: "Nom et message requis", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      if ((editing as any).id) {
        await call("update", { id: (editing as any).id, patch: editing });
      } else {
        await call("create", { campaign: editing });
      }
      toast({ title: "Campagne enregistrée" });
      setEditing(null); setPreview(null);
      load();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggle = async (c: Campaign) => {
    try {
      await call(c.status === "active" ? "pause" : "resume", { id: c.id });
      load();
    } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const runNow = async (c: Campaign) => {
    try {
      await call("run_now", { id: c.id });
      toast({ title: "Exécution déclenchée" });
      setTimeout(load, 2000);
    } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const del = async (c: Campaign) => {
    if (!confirm(`Supprimer la campagne "${c.name}" ?`)) return;
    try { await call("delete", { id: c.id }); load(); }
    catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-cyan-500" /> Campagnes Radar IA programmées</h2>
          <p className="text-sm text-muted-foreground">Diffusions automatiques d'annonces, recherches et avis ciblés vers les contacts collectés.</p>
        </div>
        <Button onClick={() => setEditing(emptyCampaign())}><Plus className="w-4 h-4 mr-2" /> Nouvelle campagne</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-3 h-3 mr-1" />Réessayer</Button>
          </AlertDescription>
        </Alert>
      )}

      {diag && (diag.invalid > 0 || diag.merged.length > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Diagnostic normalisation : <strong>{diag.invalid}</strong> numéros invalides,{" "}
            <strong>{diag.merged.length}</strong> groupes de doublons fusionnés automatiquement.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Aucune campagne. Créez-en une pour notifier automatiquement les contacts ciblés par segment.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaigns.map(c => {
            const s = stats[c.id] || { total: 0, sent: 0, replied: 0, failed: 0, opted_out: 0 };
            return (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <div className="flex gap-2 mt-1 items-center text-xs">
                        <Badge variant="outline">{MODE_LABELS[c.mode] || c.mode}</Badge>
                        <Badge variant={c.status === "active" ? "default" : c.status === "paused" ? "secondary" : "outline"}>{c.status}</Badge>
                        <span className="text-muted-foreground">{c.schedule?.type || "one_shot"}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => runNow(c)} title="Exécuter maintenant"><Play className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toggle(c)} title={c.status === "active" ? "Pause" : "Activer"}>
                        {c.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); }} title="Modifier">✏️</Button>
                      <Button size="icon" variant="ghost" onClick={() => del(c)} title="Supprimer"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="line-clamp-2 text-muted-foreground italic">"{c.message_template}"</div>
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                    <div><div className="text-muted-foreground">Envois</div><div className="font-semibold">{s.sent}</div></div>
                    <div><div className="text-muted-foreground">Réponses</div><div className="font-semibold text-emerald-600">{s.replied}</div></div>
                    <div><div className="text-muted-foreground">Échecs</div><div className="font-semibold text-red-600">{s.failed}</div></div>
                    <div><div className="text-muted-foreground">Opt-out</div><div className="font-semibold text-amber-600">{s.opted_out}</div></div>
                  </div>
                  {c.next_run_at && <div className="text-muted-foreground">Prochaine exéc. : {new Date(c.next_run_at).toLocaleString("fr-FR")}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setPreview(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(editing as any)?.id ? "Modifier" : "Nouvelle"} campagne Radar</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nom *</Label>
                  <Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={editing.mode} onValueChange={(v: any) => setEditing({ ...editing, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Message *</Label>
                <Textarea rows={4} value={editing.message_template || ""} onChange={e => setEditing({ ...editing, message_template: e.target.value })}
                  placeholder="Bonjour {{display_name}}, nouvelle annonce dans {{categorie_top}} à {{ville}}..." />
                <p className="text-xs text-muted-foreground mt-1">Variables : {"{{display_name}}, {{ville}}, {{categorie_top}}"}</p>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">🎯 Segment</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Catégories (virgule)</Label>
                      <Input value={(editing.segment?.categories || []).join(", ")}
                        onChange={e => setEditing({ ...editing, segment: { ...editing.segment, categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} />
                    </div>
                    <div>
                      <Label className="text-xs">Villes (virgule)</Label>
                      <Input value={(editing.segment?.cities || []).join(", ")}
                        onChange={e => setEditing({ ...editing, segment: { ...editing.segment, cities: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} />
                    </div>
                    <div>
                      <Label className="text-xs">Intention</Label>
                      <Select value={editing.segment?.intent || "ANY"} onValueChange={v => setEditing({ ...editing, segment: { ...editing.segment, intent: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ANY">Toutes</SelectItem>
                          <SelectItem value="BUY">Acheteurs</SelectItem>
                          <SelectItem value="SELL">Vendeurs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Min signaux</Label>
                      <Input type="number" value={editing.segment?.min_signals ?? 0}
                        onChange={e => setEditing({ ...editing, segment: { ...editing.segment, min_signals: parseInt(e.target.value, 10) || 0 } })} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Vu il y a moins de (jours)</Label>
                      <Input type="number" value={editing.segment?.last_seen_within_days ?? 30}
                        onChange={e => setEditing({ ...editing, segment: { ...editing.segment, last_seen_within_days: parseInt(e.target.value, 10) || 0 } })} />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={previewSegment} disabled={previewing}>
                    {previewing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null} Aperçu ciblage
                  </Button>
                  {preview && <div className="text-xs"><strong>{preview.count}</strong> contacts ciblés. Échantillon : {preview.sample.slice(0, 3).map((s: any) => s.phone_e164_normalized).join(", ")}</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">⏰ Planification</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Select value={editing.schedule?.type || "one_shot"} onValueChange={v => setEditing({ ...editing, schedule: { ...editing.schedule, type: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_shot">Une seule fois</SelectItem>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    </SelectContent>
                  </Select>
                  {editing.schedule?.type !== "one_shot" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Heure (UTC)</Label>
                        <Input type="number" min={0} max={23} value={editing.schedule?.hour ?? 10}
                          onChange={e => setEditing({ ...editing, schedule: { ...editing.schedule, hour: parseInt(e.target.value, 10) || 0 } })} />
                      </div>
                      <div>
                        <Label className="text-xs">Minute</Label>
                        <Input type="number" min={0} max={59} value={editing.schedule?.minute ?? 0}
                          onChange={e => setEditing({ ...editing, schedule: { ...editing.schedule, minute: parseInt(e.target.value, 10) || 0 } })} />
                      </div>
                    </div>
                  )}
                  {editing.schedule?.type === "weekly" && (
                    <div>
                      <Label className="text-xs">Jours</Label>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {WEEKDAYS.map(d => {
                          const selected = (editing.schedule?.days_of_week || []).includes(d.v);
                          return (
                            <Button key={d.v} size="sm" type="button" variant={selected ? "default" : "outline"}
                              onClick={() => {
                                const cur: number[] = editing.schedule?.days_of_week || [];
                                const nxt = selected ? cur.filter((x: number) => x !== d.v) : [...cur, d.v];
                                setEditing({ ...editing, schedule: { ...editing.schedule, days_of_week: nxt } });
                              }}>{d.l}</Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Plafond / heure (envois)</Label>
                  <Input type="number" value={editing.rate_limit_per_hour ?? 60}
                    onChange={e => setEditing({ ...editing, rate_limit_per_hour: parseInt(e.target.value, 10) || 60 })} />
                </div>
                <div>
                  <Label className="text-xs">Max / contact / 7 jours</Label>
                  <Input type="number" value={editing.max_per_contact_per_week ?? 1}
                    onChange={e => setEditing({ ...editing, max_per_contact_per_week: parseInt(e.target.value, 10) || 1 })} />
                </div>
              </div>

              <div>
                <Label className="text-xs">Statut</Label>
                <Select value={editing.status} onValueChange={(v: any) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Active (planifie l'exécution)</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
