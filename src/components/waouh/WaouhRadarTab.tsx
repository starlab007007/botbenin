import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, RefreshCw, Radar, Users, Activity, Trash2, ArrowUpRight, Target } from "lucide-react";
import { toast } from "sonner";
import RadarApiConfigPanel from "./RadarApiConfigPanel";

type Source = { id: string; type: string; identifier: string; label: string | null; active: boolean; scan_freq_min: number; last_scan_at: string | null; last_signal_count: number };
type Signal = { id: string; source_type: string; intent: string; product: any; price: number | null; city: string | null; contact_phone: string | null; contact_handle: string | null; confidence: number; status: string; captured_at: string; raw_url: string | null; raw_text: string | null; promoted_article_id: string | null; promoted_buyer_profile_id: string | null };
type Profile = { id: string; contact_phone: string; display_name: string | null; role: string; categories: string[]; cities: string[]; signals_count: number; reliability_score: number; last_seen_at: string | null };

const fmtPrice = (n: number | null) => n ? new Intl.NumberFormat("fr-FR").format(n) + " FCFA" : "—";

export default function WaouhRadarTab() {
  const [tab, setTab] = useState("signals");
  const [sources, setSources] = useState<Source[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newSrc, setNewSrc] = useState({ type: "fb_marketplace", identifier: "", label: "" });

  const load = async () => {
    setLoading(true);
    const [s1, s2, s3] = await Promise.all([
      supabase.from("waouh_radar_sources").select("*").order("created_at", { ascending: false }),
      supabase.from("waouh_radar_signals").select("*").order("captured_at", { ascending: false }).limit(100),
      supabase.from("waouh_radar_profiles").select("*").order("signals_count", { ascending: false }).limit(50),
    ]);
    setSources((s1.data as any) || []);
    setSignals((s2.data as any) || []);
    setProfiles((s3.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel(`radar_signals_live_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_radar_signals" }, (p) => {
        setSignals((prev) => [p.new as Signal, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const addSource = async () => {
    if (!newSrc.identifier) return toast.error("Identifiant requis");
    const { error } = await supabase.from("waouh_radar_sources").insert(newSrc);
    if (error) toast.error(error.message);
    else { toast.success("Source ajoutée"); setNewSrc({ type: "fb_marketplace", identifier: "", label: "" }); load(); }
  };

  const toggleSource = async (id: string, active: boolean) => {
    await supabase.from("waouh_radar_sources").update({ active }).eq("id", id);
    load();
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Supprimer cette source ?")) return;
    await supabase.from("waouh_radar_sources").delete().eq("id", id);
    load();
  };

  const triggerScan = async (fn: string) => {
    toast.loading(`Lancement ${fn}…`, { id: fn });
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    toast.dismiss(fn);
    if (error) toast.error(error.message);
    else toast.success(`OK : ${JSON.stringify(data).slice(0, 80)}`);
    load();
  };

  const promoteSignal = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.rpc("waouh_promote_signal" as any, { p_signal_id: id });
    setBusyId(null);
    if (error) toast.error(error.message);
    else { toast.success(`Promu en ${(data as any)?.kind}`); load(); }
  };

  const matchSignal = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.rpc("waouh_match_signal" as any, { p_signal_id: id });
    setBusyId(null);
    if (error) toast.error(error.message);
    else toast.success(`${(data as any)?.count ?? 0} correspondance(s)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Radar className="w-5 h-5 text-cyan-500" /> Radar IA</h2>
          <p className="text-xs text-muted-foreground">Détection vendeurs/acheteurs (sites BJ, Facebook, WhatsApp) — promu vers la base unifiée WAOUH.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => triggerScan("waouh-serpapi-scout")}>SerpAPI</Button>
          <Button variant="outline" size="sm" onClick={() => triggerScan("waouh-radar-apify")}>Apify</Button>
          <Button variant="outline" size="sm" onClick={() => triggerScan("waouh-radar-process")}>Process queue</Button>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Sources actives</div><div className="text-2xl font-bold">{sources.filter(s => s.active).length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Signaux récents</div><div className="text-2xl font-bold">{signals.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Profils détectés</div><div className="text-2xl font-bold">{profiles.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Promus 24h</div><div className="text-2xl font-bold">{signals.filter(s => (s.promoted_article_id || s.promoted_buyer_profile_id) && Date.now() - new Date(s.captured_at).getTime() < 86400000).length}</div></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="signals"><Activity className="w-4 h-4 mr-1" /> Signaux</TabsTrigger>
          <TabsTrigger value="sources"><Radar className="w-4 h-4 mr-1" /> Sources</TabsTrigger>
          <TabsTrigger value="profiles"><Users className="w-4 h-4 mr-1" /> Profils</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-2">
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {signals.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={s.intent === "SELL" ? "default" : s.intent === "BUY" ? "secondary" : "outline"}>{s.intent}</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.source_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">conf {(s.confidence * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                    {(s.promoted_article_id || s.promoted_buyer_profile_id) && (
                      <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40 text-[10px]">Promu</Badge>
                    )}
                  </div>
                  <div className="font-medium text-sm">{s.product?.title || s.raw_text?.slice(0, 100)}</div>
                  <div className="text-xs text-muted-foreground">{fmtPrice(s.price)} · {s.city || "—"} · {s.contact_phone || s.contact_handle || "anon"} · {new Date(s.captured_at).toLocaleString("fr-FR")}</div>
                  {s.raw_url && <a href={s.raw_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-600 hover:underline">Source ↗</a>}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {!s.promoted_article_id && !s.promoted_buyer_profile_id && (s.intent === "SELL" || s.intent === "BUY") && (
                    <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => promoteSignal(s.id)}>
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Promouvoir
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => matchSignal(s.id)}>
                    <Target className="w-3.5 h-3.5 mr-1" /> Matcher
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {signals.length === 0 && !loading && <p className="text-sm text-muted-foreground text-center py-8">Aucun signal capturé. Lancez un scan.</p>}
        </TabsContent>

        <TabsContent value="sources" className="space-y-3">
          <Card className="p-4">
            <div className="font-medium mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter une source</div>
            <div className="grid sm:grid-cols-4 gap-2">
              <Select value={newSrc.type} onValueChange={(v) => setNewSrc({ ...newSrc, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fb_marketplace">FB Marketplace</SelectItem>
                  <SelectItem value="fb_group">FB Groupe</SelectItem>
                  <SelectItem value="fb_page">FB Page</SelectItem>
                  <SelectItem value="wa_group">WhatsApp Groupe (id@g.us)</SelectItem>
                  <SelectItem value="site">Site web</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Identifiant (URL, requête, group@g.us)" value={newSrc.identifier} onChange={(e) => setNewSrc({ ...newSrc, identifier: e.target.value })} />
              <Input placeholder="Label" value={newSrc.label} onChange={(e) => setNewSrc({ ...newSrc, label: e.target.value })} />
              <Button onClick={addSource}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
            </div>
          </Card>

          {sources.map((s) => (
            <Card key={s.id} className="p-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2"><Badge>{s.type}</Badge><span className="font-medium text-sm">{s.label || s.identifier}</span></div>
                <div className="text-xs text-muted-foreground">{s.identifier} · scan {s.scan_freq_min}min · last: {s.last_scan_at ? new Date(s.last_scan_at).toLocaleString("fr-FR") : "jamais"} · {s.last_signal_count} signaux</div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={s.active} onCheckedChange={(v) => toggleSource(s.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => deleteSource(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="profiles" className="space-y-2">
          {profiles.map((p) => (
            <Card key={p.id} className="p-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><Badge variant={p.role === "seller" ? "default" : p.role === "buyer" ? "secondary" : "outline"}>{p.role}</Badge><span className="font-medium">{p.display_name || p.contact_phone}</span></div>
                <div className="text-xs text-muted-foreground">{p.contact_phone} · {p.signals_count} signaux · catégories: {p.categories?.join(", ") || "—"} · villes: {p.cities?.join(", ") || "—"}</div>
              </div>
              <Badge variant="outline">★ {(p.reliability_score * 100).toFixed(0)}%</Badge>
            </Card>
          ))}
          {profiles.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun profil détecté.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
