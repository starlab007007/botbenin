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
import { Loader2, RefreshCw, History, Activity, AlertCircle, MessageSquare, Smartphone, Globe, ArrowRight } from "lucide-react";
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

const AdminWaouhHistoriquePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, byStatus: {}, traceErrors: 0, waSent: 0, waFailed: 0, waDeliveryRate: 100 });

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterArticleId, setFilterArticleId] = useState("");
  const [search, setSearch] = useState("");
  const [sinceDays, setSinceDays] = useState(30);

  const [selectedNeg, setSelectedNeg] = useState<Negotiation | null>(null);

  const articleMap = useMemo(() => new Map(articles.map(a => [a.id, a])), [articles]);
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-historique", {
        body: { action: "list", status: filterStatus, articleId: filterArticleId || null, search: search || null, sinceDays, limit: 100 },
      });
      if (!error && data?.ok) {
        setNegotiations(data.negotiations || []);
        setArticles(data.articles || []);
        setUsers(data.users || []);
        setStats(data.stats || {});
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterArticleId, search, sinceDays]);

  useEffect(() => { refresh(); }, [refresh]);

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
        <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Négociations</div>
          <div className="text-2xl font-bold">{stats.total ?? 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Ouvertes</div>
          <div className="text-2xl font-bold text-blue-600">{stats.byStatus?.open ?? 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Acceptées / payées</div>
          <div className="text-2xl font-bold text-green-600">{(stats.byStatus?.accepted ?? 0) + (stats.byStatus?.paid ?? 0)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Taux livraison WA</div>
          <div className="text-2xl font-bold">{stats.waDeliveryRate ?? 0}%</div>
          <div className="text-[10px] text-muted-foreground">{stats.waSent ?? 0} sent / {stats.waFailed ?? 0} fail</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Erreurs trace</div>
          <div className="text-2xl font-bold text-red-600">{stats.traceErrors ?? 0}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Statut</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
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
            <label className="text-xs text-muted-foreground">Période (jours)</label>
            <Select value={String(sinceDays)} onValueChange={(v) => setSinceDays(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[7, 14, 30, 60, 90, 180, 365].map(d => <SelectItem key={d} value={String(d)}>{d} jours</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Acheteur</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>MAJ</TableHead>
                <TableHead></TableHead>
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
                    <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {negotiations.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">Aucune négociation.</div>
          )}
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
    </div>
  );
};

const TimelineDrawer: React.FC<{
  negotiation: Negotiation | null;
  article: Article | null | undefined;
  onClose: () => void;
  sinceDays: number;
}> = ({ negotiation, article, onClose, sinceDays }) => {
  const [data, setData] = useState<{ messages: any[]; queue: any[]; notifications: any[]; traces: any[] }>({ messages: [], queue: [], notifications: [], traces: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!negotiation) return;
    setLoading(true);
    supabase.functions.invoke("waouh-historique", {
      body: { action: "timeline", negotiationId: negotiation.id, articleId: negotiation.article_id, sinceDays },
    }).then(({ data, error }) => {
      if (!error && data?.ok) setData({ messages: data.messages || [], queue: data.queue || [], notifications: data.notifications || [], traces: data.traces || [] });
    }).finally(() => setLoading(false));
  }, [negotiation, sinceDays]);

  // Group traces by trace_id
  const tracesByTrace = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of data.traces) {
      const k = t.trace_id || "no-trace";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => (a[1][0]?.created_at || "").localeCompare(b[1][0]?.created_at || ""));
  }, [data.traces]);

  const exportTrace = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `waouh-trace-${negotiation?.id || "all"}.json`; a.click();
    URL.revokeObjectURL(url);
  };

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

        <Tabs defaultValue="timeline" className="mt-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="traces">Traces</TabsTrigger>
            <TabsTrigger value="queue">Queue WA</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-2 mt-3">
            {loading && <Loader2 className="h-5 w-5 animate-spin mx-auto" />}
            {!loading && data.messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Aucun message.</div>}
            {data.messages.map((m) => (
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
            <Button size="sm" variant="outline" onClick={exportTrace}>Exporter JSON</Button>
            {tracesByTrace.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Aucune trace.</div>}
            {tracesByTrace.map(([tid, events]) => (
              <Card key={tid} className="p-2">
                <div className="text-xs font-mono text-muted-foreground mb-2">trace: {tid.slice(0, 12)}…</div>
                <div className="space-y-1">
                  {events.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <Badge variant={e.status === "error" ? "destructive" : e.status === "skipped" ? "secondary" : "outline"} className="text-[10px]">{e.stage}</Badge>
                      <span className="text-muted-foreground">{format(new Date(e.created_at), "HH:mm:ss.SSS", { locale: fr })}</span>
                      <span className="flex-1 truncate">{e.intent || e.role || ""}</span>
                      {e.error && <span className="text-red-600 truncate max-w-[140px]" title={e.error}>{e.error}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="queue" className="space-y-2 mt-3">
            {data.queue.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Queue vide.</div>}
            {data.queue.map((q) => (
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
