import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, AlertTriangle, CheckCircle2, Database, Loader2, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Health = {
  ok: boolean;
  window: { hours: number; since: string };
  last_webhook_at: string | null;
  totals: {
    articles_with_messages: number;
    messages_in_window: number;
    negotiations_in_window: number;
    queue_pending: number;
    queue_failed_in_window: number;
  };
  top_articles: Array<{ article_id: string; total: number; in: number; out: number; last: string }>;
  divergences: {
    negotiations_without_messages: Array<{ id: string; article_id: string; state: string; created_at: string }>;
    orphan_article_ids: string[];
    negotiations_without_trace: Array<{ id: string; article_id: string; state: string; created_at: string }>;
  };
  generated_at: string;
};

const AdminWaouhHealthCheckPage: React.FC = () => {
  const [hours, setHours] = useState<number>(24);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("waouh-health-check", {
        body: { hours, top: 30 },
      });
      if (err) throw err;
      if (!(res as any)?.ok) throw new Error((res as any)?.error || "failed");
      setData(res as Health);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    void load();
  }, [load]);

  const lastWebhookAgo = data?.last_webhook_at
    ? formatDistanceToNow(new Date(data.last_webhook_at), { addSuffix: true, locale: fr })
    : "—";

  const totalDivergences =
    (data?.divergences.negotiations_without_messages.length ?? 0) +
    (data?.divergences.orphan_article_ids.length ?? 0) +
    (data?.divergences.negotiations_without_trace.length ?? 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold">WAOUH — Health Check</h1>
        </div>
        <Badge variant="outline" className="text-xs">
          mem://features/waouh-chat-sync-flow · LOCKED v1
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 heure</SelectItem>
              <SelectItem value="6">6 heures</SelectItem>
              <SelectItem value="24">24 heures</SelectItem>
              <SelectItem value="72">3 jours</SelectItem>
              <SelectItem value="168">7 jours</SelectItem>
              <SelectItem value="720">30 jours</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Rafraîchir</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Dernier webhook</div>
          <div className="text-lg font-semibold">{lastWebhookAgo}</div>
          {data?.last_webhook_at && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {format(new Date(data.last_webhook_at), "Pp", { locale: fr })}
            </div>
          )}
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Articles actifs</div>
          <div className="text-lg font-semibold">{data?.totals.articles_with_messages ?? "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Messages</div>
          <div className="text-lg font-semibold">{data?.totals.messages_in_window ?? "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Négociations</div>
          <div className="text-lg font-semibold">{data?.totals.negotiations_in_window ?? "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Queue WhatsApp</div>
          <div className="text-lg font-semibold">
            {data?.totals.queue_pending ?? 0}
            <span className="text-xs text-muted-foreground"> en attente</span>
          </div>
          {(data?.totals.queue_failed_in_window ?? 0) > 0 && (
            <div className="text-[10px] text-destructive mt-0.5">
              {data!.totals.queue_failed_in_window} en échec
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {totalDivergences === 0 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
          <h2 className="font-semibold">Divergences détectées</h2>
          <Badge variant={totalDivergences === 0 ? "secondary" : "destructive"}>{totalDivergences}</Badge>
        </div>

        {totalDivergences === 0 && (
          <p className="text-sm text-muted-foreground">
            ✅ Aucune divergence sur la fenêtre sélectionnée — synchro saine.
          </p>
        )}

        {!!data?.divergences.negotiations_without_messages.length && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">Négociations sans messages ({data.divergences.negotiations_without_messages.length})</div>
            <div className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
              {data.divergences.negotiations_without_messages.map((n) => (
                <div key={n.id} className="font-mono">{n.id} · article {n.article_id?.slice(0, 8)} · {n.state}</div>
              ))}
            </div>
          </div>
        )}

        {!!data?.divergences.negotiations_without_trace.length && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">Négociations sans trace events ({data.divergences.negotiations_without_trace.length})</div>
            <div className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
              {data.divergences.negotiations_without_trace.map((n) => (
                <div key={n.id} className="font-mono">{n.id} · article {n.article_id?.slice(0, 8)}</div>
              ))}
            </div>
          </div>
        )}

        {!!data?.divergences.orphan_article_ids.length && (
          <div>
            <div className="text-sm font-medium mb-1">article_id orphelins (messages sans article) ({data.divergences.orphan_article_ids.length})</div>
            <div className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto font-mono">
              {data.divergences.orphan_article_ids.map((id) => <div key={id}>{id}</div>)}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-cyan-600" />
          <h2 className="font-semibold">Top articles par volume de messages</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>article_id</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead>Dernier message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.top_articles ?? []).map((a) => (
                <TableRow key={a.article_id}>
                  <TableCell className="font-mono text-xs">{a.article_id}</TableCell>
                  <TableCell className="text-right">{a.total}</TableCell>
                  <TableCell className="text-right">{a.in}</TableCell>
                  <TableCell className="text-right">{a.out}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.last), { addSuffix: true, locale: fr })}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.top_articles.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    Aucun message sur la fenêtre sélectionnée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {data?.generated_at && (
        <div className="text-xs text-muted-foreground text-right">
          Généré : {format(new Date(data.generated_at), "Pp", { locale: fr })}
        </div>
      )}
    </div>
  );
};

export default AdminWaouhHealthCheckPage;
