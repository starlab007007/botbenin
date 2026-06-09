import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Play, Send, AlertTriangle } from "lucide-react";
import RadarContactsTab from "@/components/admin/RadarContactsTab";
import WaouhE2ETestsTab from "@/components/admin/WaouhE2ETestsTab";

type QueueRow = {
  id: string; status: string; event_type: string | null; template: string | null;
  to_phone: string | null; dedupe_key: string | null; last_error: string | null;
  attempts: number; next_attempt_at: string | null; created_at: string; transaction_id: string | null;
};

function classifyError(err: string | null): "422" | "429" | "5xx" | "other" {
  if (!err) return "other";
  const m = /WAHA\s+(\d{3})/.exec(err);
  if (!m) return "other";
  const c = parseInt(m[1], 10);
  if (c === 422) return "422";
  if (c === 429) return "429";
  if (c >= 500) return "5xx";
  return "other";
}

export default function WaouhWhatsAppOpsPage() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cfg, setCfg] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Replay state
  const [replayInput, setReplayInput] = useState("");
  const [replayType, setReplayType] = useState<"dedupe_key" | "transaction_id">("dedupe_key");
  const [replayResult, setReplayResult] = useState<any>(null);
  const [replaying, setReplaying] = useState(false);

  // E2E state
  const [e2eRunning, setE2eRunning] = useState(false);
  const [e2eResult, setE2eResult] = useState<any>(null);
  const [sellerPhone, setSellerPhone] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  const loadQueue = async () => {
    setLoading(true);
    let q = supabase.from("waouh_outbound_queue" as any).select("*").order("created_at", { ascending: false }).limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setQueue((data as any) || []);
    setLoading(false);
  };

  const loadConfig = async () => {
    const { data } = await supabase.from("waouh_alert_config" as any).select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    setCfg(data);
  };
  const loadHistory = async () => {
    const { data } = await supabase.from("waouh_alert_history" as any).select("*").order("created_at", { ascending: false }).limit(20);
    setHistory((data as any) || []);
  };

  useEffect(() => { loadQueue(); loadConfig(); loadHistory(); }, []);
  useEffect(() => { loadQueue(); }, [statusFilter]);
  useEffect(() => {
    const t = setInterval(() => { loadQueue(); }, 10000);
    return () => clearInterval(t);
  }, [statusFilter]);

  // Stats
  const counts = queue.reduce((acc: any, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const failed = queue.filter(r => r.status === "failed");
  const errorBuckets = failed.reduce((acc: any, r) => {
    const c = classifyError(r.last_error);
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, { "422": 0, "429": 0, "5xx": 0, other: 0 });
  const maxBucket = Math.max(1, ...Object.values(errorBuckets).map((v: any) => Number(v)));

  const runReplay = async () => {
    if (!replayInput.trim()) return;
    setReplaying(true); setReplayResult(null);
    const { data, error } = await supabase.functions.invoke("waouh-replay-notification", {
      body: { [replayType]: replayInput.trim() },
    });
    setReplayResult(error ? { error: error.message } : data);
    setReplaying(false);
    loadQueue();
  };

  const runE2E = async (mode: "sim" | "live") => {
    setE2eRunning(true); setE2eResult(null);
    const body: any = { mode };
    if (mode === "live") {
      if (!sellerPhone || !buyerPhone) {
        toast({ title: "Numéros requis", description: "Renseigne vendeur + acheteur pour le mode live.", variant: "destructive" });
        setE2eRunning(false); return;
      }
      body.seller_phone = sellerPhone;
      body.buyer_phone = buyerPhone;
    }
    const { data, error } = await supabase.functions.invoke("waouh-e2e-test", { body });
    setE2eResult(error ? { error: error.message } : data);
    setE2eRunning(false);
    loadQueue();
  };

  const downloadReport = () => {
    if (!e2eResult) return;
    const md = `# Rapport E2E WhatsApp\n\nMode: ${e2eResult.mode}\nRunId: ${e2eResult.runId}\nVendeur: ${e2eResult.sellerPhone}\nAcheteur: ${e2eResult.buyerPhone}\n\n## Étapes\n\n${(e2eResult.steps || []).map((s: any) => `- **${s.step}** ${s.ok ? "✅" : "❌"} (${s.ms}ms)${s.error ? "\n  - Erreur: " + s.error : ""}${s.detail ? "\n  - " + JSON.stringify(s.detail) : ""}`).join("\n")}\n\n## Notifications en queue\n\n${JSON.stringify(e2eResult.queued, null, 2)}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `e2e-waouh-${e2eResult.runId}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const saveConfig = async () => {
    if (!cfg) return;
    const { error } = await supabase.from("waouh_alert_config" as any).update({
      enabled: cfg.enabled,
      window_minutes: cfg.window_minutes,
      threshold_422: cfg.threshold_422,
      threshold_429: cfg.threshold_429,
      threshold_5xx: cfg.threshold_5xx,
      threshold_global_pct: cfg.threshold_global_pct,
      webhook_url: cfg.webhook_url,
      webhook_secret: cfg.webhook_secret,
      cooldown_minutes: cfg.cooldown_minutes,
      updated_at: new Date().toISOString(),
    }).eq("id", cfg.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Configuration enregistrée" });
  };

  const testWebhook = async () => {
    const { data, error } = await supabase.functions.invoke("waouh-alerts-check", { body: {} });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Vérification déclenchée", description: JSON.stringify(data) });
    loadHistory();
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp Ops · WAOUH</h1>
        <p className="text-sm text-muted-foreground">Monitoring queue WAHA, replay manuel, tests E2E et alertes.</p>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="errors">Erreurs WAHA</TabsTrigger>
          <TabsTrigger value="replay">Replay</TabsTrigger>
          <TabsTrigger value="tests">Tests & Alertes</TabsTrigger>
          <TabsTrigger value="radar-contacts">Contacts Radar</TabsTrigger>
          <TabsTrigger value="e2e">Tests E2E</TabsTrigger>
        </TabsList>

        <TabsContent value="radar-contacts"><RadarContactsTab /></TabsContent>
        <TabsContent value="e2e"><WaouhE2ETestsTab /></TabsContent>


        <TabsContent value="queue" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["pending", "sending", "sent", "failed"].map(s => (
              <Card key={s}><CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">{s}</div>
                <div className="text-2xl font-bold">{counts[s] || 0}</div>
              </CardContent></Card>
            ))}
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase">Total visible</div>
              <div className="text-2xl font-bold">{queue.length}</div>
            </CardContent></Card>
          </div>
          <div className="flex gap-2 items-center">
            {["all", "pending", "sending", "sent", "failed"].map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>{s}</Button>
            ))}
            <Button size="sm" variant="ghost" onClick={loadQueue}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <Card><CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Status</TableHead><TableHead>Event</TableHead><TableHead>To</TableHead>
                <TableHead>Attempts</TableHead><TableHead>Next attempt</TableHead><TableHead>Last error</TableHead><TableHead>Dedupe</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {queue.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant={r.status === "failed" ? "destructive" : r.status === "sent" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{r.event_type || r.template}</TableCell>
                    <TableCell className="text-xs">{r.to_phone}</TableCell>
                    <TableCell>{r.attempts}</TableCell>
                    <TableCell className="text-xs">{r.next_attempt_at ? new Date(r.next_attempt_at).toLocaleTimeString() : "-"}</TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate" title={r.last_error || ""}>{r.last_error || "-"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.dedupe_key?.slice(0, 16) || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card><CardHeader><CardTitle>Répartition des erreurs WAHA (failed visibles)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(errorBuckets).map(([code, count]) => (
                <div key={code} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-mono">{code}</div>
                  <div className="flex-1 bg-muted rounded h-6 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(Number(count) / maxBucket) * 100}%` }} />
                  </div>
                  <div className="w-12 text-right text-sm">{Number(count)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Top erreurs</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Message</TableHead><TableHead>To</TableHead><TableHead>Dedupe</TableHead></TableRow></TableHeader>
                <TableBody>
                  {failed.slice(0, 30).map(r => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="destructive">{classifyError(r.last_error)}</Badge></TableCell>
                      <TableCell className="text-xs max-w-[400px] truncate">{r.last_error}</TableCell>
                      <TableCell className="text-xs">{r.to_phone}</TableCell>
                      <TableCell className="text-xs font-mono">{r.dedupe_key?.slice(0, 20)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="replay" className="space-y-4">
          <Card><CardHeader><CardTitle>Relancer une notification</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button size="sm" variant={replayType === "dedupe_key" ? "default" : "outline"} onClick={() => setReplayType("dedupe_key")}>Dedupe key</Button>
                <Button size="sm" variant={replayType === "transaction_id" ? "default" : "outline"} onClick={() => setReplayType("transaction_id")}>Transaction ID</Button>
              </div>
              <div className="flex gap-2">
                <Input placeholder={replayType} value={replayInput} onChange={e => setReplayInput(e.target.value)} />
                <Button onClick={runReplay} disabled={replaying}>{replaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Relancer</Button>
              </div>
              {replayResult && (
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[400px]">{JSON.stringify(replayResult, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card><CardHeader><CardTitle>Test E2E parcours WhatsApp</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Vendeur (live only)</Label><Input value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} placeholder="22965..." /></div>
                <div><Label>Acheteur (live only)</Label><Input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="22988..." /></div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => runE2E("sim")} disabled={e2eRunning}>{e2eRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}Simulation</Button>
                <Button variant="secondary" onClick={() => runE2E("live")} disabled={e2eRunning}><Play className="h-4 w-4 mr-2" />Live (envoie réel)</Button>
                {e2eResult && <Button variant="outline" onClick={downloadReport}>Télécharger rapport MD</Button>}
              </div>
              {e2eResult && (
                <div className="space-y-2">
                  {(e2eResult.steps || []).map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-sm border-l-2 pl-3" style={{ borderColor: s.ok ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                      <Badge variant={s.ok ? "default" : "destructive"}>{s.ok ? "OK" : "FAIL"}</Badge>
                      <span className="font-mono">{s.step}</span>
                      <span className="text-muted-foreground text-xs">{s.ms}ms</span>
                      {s.error && <span className="text-destructive text-xs">{s.error}</span>}
                    </div>
                  ))}
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[300px]">{JSON.stringify(e2eResult.queued, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {cfg && (
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Alertes WAHA (webhook)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={cfg.enabled} onCheckedChange={v => setCfg({ ...cfg, enabled: v })} />
                  <Label>Alertes activées</Label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label>Fenêtre (min)</Label><Input type="number" value={cfg.window_minutes} onChange={e => setCfg({ ...cfg, window_minutes: parseInt(e.target.value) })} /></div>
                  <div><Label>Cooldown (min)</Label><Input type="number" value={cfg.cooldown_minutes} onChange={e => setCfg({ ...cfg, cooldown_minutes: parseInt(e.target.value) })} /></div>
                  <div><Label>Seuil global %</Label><Input type="number" value={cfg.threshold_global_pct} onChange={e => setCfg({ ...cfg, threshold_global_pct: parseInt(e.target.value) })} /></div>
                  <div><Label>Seuil 422</Label><Input type="number" value={cfg.threshold_422} onChange={e => setCfg({ ...cfg, threshold_422: parseInt(e.target.value) })} /></div>
                  <div><Label>Seuil 429</Label><Input type="number" value={cfg.threshold_429} onChange={e => setCfg({ ...cfg, threshold_429: parseInt(e.target.value) })} /></div>
                  <div><Label>Seuil 5xx</Label><Input type="number" value={cfg.threshold_5xx} onChange={e => setCfg({ ...cfg, threshold_5xx: parseInt(e.target.value) })} /></div>
                </div>
                <div><Label>Webhook URL (n8n, Telegram, WhatsApp...)</Label><Input value={cfg.webhook_url || ""} onChange={e => setCfg({ ...cfg, webhook_url: e.target.value })} placeholder="https://..." /></div>
                <div><Label>Secret (optionnel, envoyé en X-Webhook-Secret)</Label><Input value={cfg.webhook_secret || ""} onChange={e => setCfg({ ...cfg, webhook_secret: e.target.value })} /></div>
                <div className="flex gap-2">
                  <Button onClick={saveConfig}>Enregistrer</Button>
                  <Button variant="outline" onClick={testWebhook}>Forcer la vérification maintenant</Button>
                </div>
                <div className="text-xs text-muted-foreground">Cron exécute la vérification toutes les 5 minutes. Dernière alerte: {cfg.last_alert_sent_at ? new Date(cfg.last_alert_sent_at).toLocaleString() : "jamais"}.</div>
              </CardContent>
            </Card>
          )}

          <Card><CardHeader><CardTitle>Historique des alertes</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Sévérité</TableHead><TableHead>Règle</TableHead><TableHead>Count</TableHead><TableHead>Livré</TableHead><TableHead>Erreur</TableHead></TableRow></TableHeader>
                <TableBody>
                  {history.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={h.severity === "critical" ? "destructive" : "secondary"}>{h.severity}</Badge></TableCell>
                      <TableCell className="text-xs">{h.rule}</TableCell>
                      <TableCell>{h.count}</TableCell>
                      <TableCell>{h.delivered ? "✅" : "❌"}</TableCell>
                      <TableCell className="text-xs">{h.error || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
