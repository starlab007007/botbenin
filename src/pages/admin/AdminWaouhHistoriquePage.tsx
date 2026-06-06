import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2, RefreshCw, History, Activity, AlertCircle, MessageSquare,
  Smartphone, Globe, ArrowRight, Download, Search, AlertTriangle, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Negotiation = {
  id: string; article_id: string; buyer_user_id: string; seller_user_id: string;
  status: string; current_price: number | null; last_price: number | null;
  currency: string | null; created_at: string; updated_at: string; meta: any;
};
type Article = { id: string; title: string; price: number; currency: string; photos: any; status: string };
type User = { id: string; display_name: string | null; phone_number: string | null };

const STATUS_OPTIONS = ["all", "open", "counter", "accepted", "refused", "paid", "closed", "expired"];

function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set<string>()));
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}

function downloadFile(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

const AdminWaouhHistoriquePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, byStatus: {}, traceErrors: 0, waSent: 0, waFailed: 0, waDeliveryRate: 100 });
  const [divergences, setDivergences] = useState<any | null>(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterArticleId, setFilterArticleId] = useState("");
  const [search, setSearch] = useState("");
  const [sinceDays, setSinceDays] = useState(30);
  const [traceIdSearch, setTraceIdSearch] = useState("");
  const [traceLookup, setTraceLookup] = useState<any | null>(null);

  const [selectedNeg, setSelectedNeg] = useState<Negotiation | null>(null);

  const articleMap = useMemo(() => new Map(articles.map(a => [a.id, a])), [articles]);
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, div] = await Promise.all([
        supabase.functions.invoke("waouh-historique", {
          body: { action: "list", status: filterStatus, articleId: filterArticleId || null, search: search || null, sinceDays, limit: 100 },
        }),
        supabase.functions.invoke("waouh-historique", { body: { action: "divergences", sinceDays } }),
      ]);
      if (!list.error && list.data?.ok) {
        setNegotiations(list.data.negotiations || []);
        setArticles(list.data.articles || []);
        setUsers(list.data.users || []);
        setStats(list.data.stats || {});
      }
      if (!div.error && div.data?.ok) setDivergences(div.data);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterArticleId, search, sinceDays]);

  useEffect(() => { refresh(); }, [refresh]);

  const exportAll = async () => {
    setExporting(true);
    try {
      // Aggregate timelines for all displayed negotiations into a single CSV pack.
      const allMsgs: any[] = [], allQueue: any[] = [], allTraces: any[] = [];
      for (const n of negotiations) {
        const { data } = await supabase.functions.invoke("waouh-historique", {
          body: { action: "timeline", negotiationId: n.id, articleId: n.article_id, sinceDays },
        });
        if (data?.ok) {
          (data.messages || []).forEach((m: any) => allMsgs.push({
            negotiation_id: n.id, article_id: n.article_id, id: m.id, channel: m.channel, direction: m.direction,
            text: m.text, trace_id: m?.meta?.trace_id, intent: m?.meta?.intent, created_at: m.created_at,
          }));
          (data.queue || []).forEach((q: any) => allQueue.push({
            negotiation_id: n.id, article_id: n.article_id, id: q.id, channel: q.channel, status: q.status,
            template: q.template, trace_id: q?.payload?.trace_id, transaction_id: q.transaction_id,
            last_error: q.last_error, created_at: q.created_at,
          }));
          (data.traces || []).forEach((t: any) => allTraces.push({
            negotiation_id: n.id, article_id: t.article_id, id: t.id, trace_id: t.trace_id, stage: t.stage,
            status: t.status, intent: t.intent, role: t.role, error: t.error, created_at: t.created_at,
          }));
        }
      }
      const stamp = format(new Date(), "yyyyMMdd-HHmm");
      if (allMsgs.length) downloadFile(`waouh-messages-${stamp}.csv`, toCsv(allMsgs));
      if (allQueue.length) downloadFile(`waouh-whatsapp-queue-${stamp}.csv`, toCsv(allQueue));
      if (allTraces.length) downloadFile(`waouh-traces-${stamp}.csv`, toCsv(allTraces));
      if (!allMsgs.length && !allQueue.length && !allTraces.length) {
        alert("Aucune donnée à exporter sur cette période.");
      }
    } finally {
      setExporting(false);
    }
  };

  const lookupTrace = async () => {
    if (!traceIdSearch.trim()) return;
    const { data } = await supabase.functions.invoke("waouh-historique", {
      body: { action: "timeline", traceId: traceIdSearch.trim(), sinceDays: 365 },
    });
    if (data?.ok) setTraceLookup(data);
  };

  const divSummary = divergences?.summary;
  const hasDivergence = divSummary && (
    divSummary.messages_without_trace > 0 || divSummary.orphan_queue_items > 0 ||
    divSummary.error_traces > 0 || divSummary.failed_queue > 0
  );

  return (
    <div className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Historique WAOUH — Négociations & Messages
          </h1>
          <p className="text-sm text-muted-foreground">Historique persistant chat + WhatsApp avec traces structurées (article_id / transaction).</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportAll} disabled={exporting || !negotiations.length} variant="outline" size="sm">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Export CSV
          </Button>
          <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualiser
          </Button>
        </div>
      </div>

      {/* Divergence alerts */}
      {hasDivergence && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Divergences détectées sur {sinceDays}j</AlertTitle>
          <AlertDescription className="text-xs space-y-0.5 mt-1">
            <div>• {divSummary.messages_without_trace} messages sans trace_id</div>
            <div>• {divSummary.orphan_queue_items} items WhatsApp orphelins (sans trace correspondante)</div>
            <div>• {divSummary.error_traces} traces en erreur · {divSummary.failed_queue} envois WhatsApp échoués</div>
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Négociations</div><div className="text-2xl font-bold">{stats.total ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Ouvertes</div><div className="text-2xl font-bold text-blue-600">{stats.byStatus?.open ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Acceptées / payées</div><div className="text-2xl font-bold text-green-600">{(stats.byStatus?.accepted ?? 0) + (stats.byStatus?.paid ?? 0)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Taux livraison WA</div><div className="text-2xl font-bold">{stats.waDeliveryRate ?? 0}%</div><div className="text-[10px] text-muted-foreground">{stats.waSent ?? 0} sent / {stats.waFailed ?? 0} fail</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Erreurs trace</div><div className="text-2xl font-bold text-red-600">{stats.traceErrors ?? 0}</div></Card>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Statut</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Article (UUID)</label>
            <Input value={filterArticleId} onChange={(e) => setFilterArticleId(e.target.value)} placeholder="article_id..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Recherche</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titre article / id négo" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Profondeur historique</label>
            <Select value={String(sinceDays)} onValueChange={(v) => setSinceDays(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 3, 7, 14, 30, 60, 90, 180, 365].map(d => <SelectItem key={d} value={String(d)}>{d} jours</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-end pt-2 border-t">
          <div className="flex-1 w-full">
            <label className="text-xs text-muted-foreground">Recherche par trace_id / transaction</label>
            <Input value={traceIdSearch} onChange={(e) => setTraceIdSearch(e.target.value)}
              placeholder="trace_id (ex: 01HXYZ...)" onKeyDown={(e) => e.key === "Enter" && lookupTrace()} />
          </div>
          <Button onClick={lookupTrace} variant="default" size="sm" disabled={!traceIdSearch.trim()}>
            <Search className="h-4 w-4 mr-2" /> Tracer
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead><TableHead>Acheteur</TableHead><TableHead>Vendeur</TableHead>
                <TableHead>Statut</TableHead><TableHead>Prix</TableHead><TableHead>MAJ</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {negotiations.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucune négociation sur la période.</TableCell></TableRow>
              )}
              {negotiations.map((n) => {
                const a = articleMap.get(n.article_id);
                const buyer = userMap.get(n.buyer_user_id);
                const seller = userMap.get(n.seller_user_id);
                return (
                  <TableRow key={n.id} className="cursor-pointer" onClick={() => setSelectedNeg(n)}>
                    <TableCell className="font-medium">{a?.title || n.article_id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{buyer?.display_name || buyer?.phone_number || n.buyer_user_id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{seller?.display_name || seller?.phone_number || n.seller_user_id?.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline">{n.status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{n.current_price?.toLocaleString() || "-"} {n.currency || "XOF"}</TableCell>
                    <TableCell className="text-xs">{format(new Date(n.updated_at), "dd MMM HH:mm", { locale: fr })}</TableCell>
                    <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y">
          {negotiations.length === 0 && (<div className="text-center text-sm text-muted-foreground py-8">Aucune négociation.</div>)}
          {negotiations.map((n) => {
            const a = articleMap.get(n.article_id);
            return (
              <div key={n.id} className="p-3 active:bg-muted" onClick={() => setSelectedNeg(n)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{a?.title || n.article_id?.slice(0, 8)}</div>
                  <Badge variant="outline" className="text-[10px]">{n.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {n.current_price?.toLocaleString() || "-"} {n.currency || "XOF"} · {format(new Date(n.updated_at), "dd MMM HH:mm", { locale: fr })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <TimelineDrawer
        negotiation={selectedNeg}
        article={selectedNeg ? articleMap.get(selectedNeg.article_id) : null}
        onClose={() => setSelectedNeg(null)}
        sinceDays={sinceDays}
      />

      {/* Trace lookup result */}
      <Sheet open={!!traceLookup} onOpenChange={(o) => !o && setTraceLookup(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Trace {traceIdSearch.slice(0, 16)}…</SheetTitle>
          </SheetHeader>
          {traceLookup && <TraceTimelineContent data={traceLookup} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const STAGE_ORDER = ["chat_in", "router", "sync", "queue_enqueue", "queue_dispatch", "whatsapp_send", "whatsapp_delivered", "whatsapp_error", "web_mirror"];

const TraceTimelineContent: React.FC<{ data: any }> = ({ data }) => {
  const div = data.divergences || {};
  const traces = (data.traces || []).slice().sort((a: any, b: any) => (a.created_at || "").localeCompare(b.created_at || ""));
  return (
    <div className="space-y-3 mt-3">
      {(div.messages_without_trace > 0 || div.orphan_queue_items > 0 || div.error_traces > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Divergences sur cette trace</AlertTitle>
          <AlertDescription className="text-xs">
            {div.messages_without_trace || 0} msg sans trace · {div.orphan_queue_items || 0} queue orphelins · {div.error_traces || 0} erreurs
          </AlertDescription>
        </Alert>
      )}
      <div className="text-xs text-muted-foreground">
        Chronologie complète : chat → router → sync → queue → WhatsApp ({traces.length} événements, {data.messages?.length || 0} messages, {data.queue?.length || 0} envois)
      </div>
      <div className="relative pl-6 space-y-2">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
        {traces.map((e: any) => (
          <div key={e.id} className="relative">
            <div className={`absolute -left-[18px] top-2 h-3 w-3 rounded-full ${e.status === "error" ? "bg-red-500" : e.status === "skipped" ? "bg-gray-400" : "bg-green-500"}`} />
            <Card className="p-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={e.status === "error" ? "destructive" : "outline"} className="text-[10px]">{e.stage}</Badge>
                  {e.intent && <span className="text-muted-foreground">{e.intent}</span>}
                </div>
                <span className="text-muted-foreground">{format(new Date(e.created_at), "dd/MM HH:mm:ss", { locale: fr })}</span>
              </div>
              {e.error && <div className="text-red-600 mt-1">{e.error}</div>}
              {e.payload && Object.keys(e.payload).length > 0 && (
                <pre className="text-[10px] mt-1 bg-muted p-1 rounded overflow-x-auto">{JSON.stringify(e.payload, null, 0)}</pre>
              )}
            </Card>
          </div>
        ))}
        {traces.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Aucun événement trace trouvé.</div>}
      </div>
    </div>
  );
};

const TimelineDrawer: React.FC<{
  negotiation: Negotiation | null;
  article: Article | null | undefined;
  onClose: () => void;
  sinceDays: number;
}> = ({ negotiation, article, onClose, sinceDays }) => {
  const [data, setData] = useState<any>({ messages: [], queue: [], notifications: [], traces: [], divergences: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!negotiation) return;
    setLoading(true);
    supabase.functions.invoke("waouh-historique", {
      body: { action: "timeline", negotiationId: negotiation.id, articleId: negotiation.article_id, sinceDays },
    }).then(({ data, error }) => {
      if (!error && data?.ok) setData(data);
    }).finally(() => setLoading(false));
  }, [negotiation, sinceDays]);

  const tracesByTrace = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of (data.traces || [])) {
      const k = t.trace_id || "no-trace";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => (a[1][0]?.created_at || "").localeCompare(b[1][0]?.created_at || ""));
  }, [data.traces]);

  const exportNeg = () => {
    const stamp = format(new Date(), "yyyyMMdd-HHmm");
    const id = negotiation?.id?.slice(0, 8) || "neg";
    const msgs = (data.messages || []).map((m: any) => ({
      id: m.id, channel: m.channel, direction: m.direction, text: m.text,
      trace_id: m?.meta?.trace_id, intent: m?.meta?.intent, created_at: m.created_at,
    }));
    const queue = (data.queue || []).map((q: any) => ({
      id: q.id, channel: q.channel, status: q.status, template: q.template,
      trace_id: q?.payload?.trace_id, transaction_id: q.transaction_id, last_error: q.last_error, created_at: q.created_at,
    }));
    const traces = (data.traces || []).map((t: any) => ({
      id: t.id, trace_id: t.trace_id, stage: t.stage, status: t.status, intent: t.intent,
      role: t.role, error: t.error, created_at: t.created_at,
    }));
    if (msgs.length) downloadFile(`waouh-${id}-messages-${stamp}.csv`, toCsv(msgs));
    if (queue.length) downloadFile(`waouh-${id}-queue-${stamp}.csv`, toCsv(queue));
    if (traces.length) downloadFile(`waouh-${id}-traces-${stamp}.csv`, toCsv(traces));
  };

  const div = data.divergences || {};
  const hasDiv = (div.messages_without_trace || 0) > 0 || (div.orphan_queue_items || 0) > 0 || (div.error_traces || 0) > 0;

  return (
    <Sheet open={!!negotiation} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {article?.title || "Négociation"}
          </SheetTitle>
          <div className="text-xs text-muted-foreground">
            Négo: {negotiation?.id?.slice(0, 8)} · Article: {negotiation?.article_id?.slice(0, 8)}
          </div>
        </SheetHeader>

        {hasDiv && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {div.messages_without_trace || 0} msg sans trace · {div.orphan_queue_items || 0} queue orphelin · {div.error_traces || 0} erreurs
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="chain" className="mt-4">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="chain">Chaîne</TabsTrigger>
            <TabsTrigger value="timeline">Messages</TabsTrigger>
            <TabsTrigger value="traces">Traces</TabsTrigger>
            <TabsTrigger value="queue">Queue WA</TabsTrigger>
          </TabsList>

          <TabsContent value="chain" className="mt-3 space-y-2">
            <Button size="sm" variant="outline" onClick={exportNeg}><Download className="h-4 w-4 mr-2" />Exporter CSV</Button>
            <div className="text-xs text-muted-foreground">chat → router → sync → queue → WhatsApp</div>
            {tracesByTrace.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Aucune trace structurée.</div>}
            {tracesByTrace.map(([tid, events]) => {
              const stages = new Set(events.map((e: any) => e.stage));
              return (
                <Card key={tid} className="p-2">
                  <div className="text-xs font-mono text-muted-foreground mb-2">trace: {tid.slice(0, 16)}…</div>
                  <div className="flex flex-wrap items-center gap-1">
                    {STAGE_ORDER.map((s, i) => {
                      const ev = events.find((e: any) => e.stage === s);
                      const seen = stages.has(s);
                      return (
                        <React.Fragment key={s}>
                          <Badge variant={ev?.status === "error" ? "destructive" : seen ? "outline" : "secondary"}
                            className={`text-[10px] ${!seen ? "opacity-40" : ""}`}>{s}</Badge>
                          {i < STAGE_ORDER.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-2 mt-3">
            {loading && <Loader2 className="h-5 w-5 animate-spin mx-auto" />}
            {!loading && (data.messages || []).length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Aucun message.</div>}
            {(data.messages || []).map((m: any) => (
              <div key={m.id} className="border rounded p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 font-medium">
                    {m.channel === "whatsapp" ? <Smartphone className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    {m.channel} · {m.direction}
                  </div>
                  <div className="text-muted-foreground">{format(new Date(m.created_at), "dd MMM HH:mm:ss", { locale: fr })}</div>
                </div>
                <div className="mt-1 whitespace-pre-wrap">{m.text}</div>
                {m.meta?.trace_id && <div className="mt-1 text-[10px] text-muted-foreground font-mono">trace: {m.meta.trace_id.slice(0, 8)}</div>}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="traces" className="space-y-3 mt-3">
            {tracesByTrace.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Aucune trace.</div>}
            {tracesByTrace.map(([tid, events]) => (
              <Card key={tid} className="p-2">
                <div className="text-xs font-mono text-muted-foreground mb-2">trace: {tid.slice(0, 12)}…</div>
                <div className="space-y-1">
                  {events.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <Badge variant={e.status === "error" ? "destructive" : e.status === "skipped" ? "secondary" : "outline"} className="text-[10px]">{e.stage}</Badge>
                      <span className="text-muted-foreground">{format(new Date(e.created_at), "HH:mm:ss", { locale: fr })}</span>
                      <span className="flex-1 truncate">{e.intent || e.role || ""}</span>
                      {e.error && <span className="text-red-600 truncate max-w-[140px]" title={e.error}>{e.error}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="queue" className="space-y-2 mt-3">
            {(data.queue || []).length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Queue vide.</div>}
            {(data.queue || []).map((q: any) => (
              <div key={q.id} className="border rounded p-2 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant={q.status === "failed" ? "destructive" : "outline"}>{q.status}</Badge>
                  <span className="text-muted-foreground">{format(new Date(q.created_at), "dd MMM HH:mm", { locale: fr })}</span>
                </div>
                <div className="mt-1">canal: {q.channel} · template: {q.template}</div>
                {q.last_error && <div className="text-red-600 mt-1 truncate">{q.last_error}</div>}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default AdminWaouhHistoriquePage;
