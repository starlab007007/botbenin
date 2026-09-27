import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, AlertTriangle, CheckCircle2, Database, Loader2, RefreshCw, Wrench } from "lucide-react";
import { toast } from "sonner";
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
  commerce_integrity: {
    open_negotiations_without_thread: number;
    accepted_without_deal_in_window: number;
    deals_without_thread: number;
    deals_without_negotiation: number;
    deals_waiting_courier: number;
    accepted_threadless_legacy: number;
  };
  // Réconciliation du chat (plan du 27/09/2026) — absente avant migration.
  chat_integrity?: ChatIntegrity;
  generated_at: string;
};

type ChatIntegrity = {
  available?: boolean;
  mode?: "report" | "apply";
  r1_messages_linkable_30d?: number;
  r1_messages_ambiguous_30d?: number;
  r1_messages_linked?: number;
  r2_open_negotiations_linkable?: number;
  r2_open_negotiations_without_thread_remaining?: number;
  r3_deals_thread_repairable?: number;
  r4_threads_missing_deal_link?: number;
  r4_threads_ambiguous_deals?: number;
  r5_threads_stale_status?: number;
  r6_accepted_without_deal_7d?: number;
  r6_deals_created?: number;
  r6_skipped?: string;
  r6_errors?: Array<{ negotiation_id: string; error: string }>;
  info_deals_waiting_courier_2h?: number;
  info_outbound_failed_24h?: number;
  info_outbound_pending_15min?: number;
};

const CHAT_INTEGRITY_ROWS: Array<{ key: keyof ChatIntegrity; label: string; repairable: boolean }> = [
  { key: "r1_messages_linkable_30d", label: "Messages rattachables à leur thread", repairable: true },
  { key: "r2_open_negotiations_linkable", label: "Négos ouvertes rattachables", repairable: true },
  { key: "r3_deals_thread_repairable", label: "Deals sans thread (réparables)", repairable: true },
  { key: "r4_threads_missing_deal_link", label: "Threads sans lien deal", repairable: true },
  { key: "r4_threads_ambiguous_deals", label: "Threads avec plusieurs deals actifs", repairable: false },
  { key: "r5_threads_stale_status", label: "Threads à clôturer", repairable: true },
  { key: "r6_accepted_without_deal_7d", label: "Accords sans deal (7 j)", repairable: true },
  { key: "r1_messages_ambiguous_30d", label: "Messages ambigus (revue)", repairable: false },
  { key: "info_deals_waiting_courier_2h", label: "Livreur attendu > 2 h", repairable: false },
  { key: "info_outbound_pending_15min", label: "WhatsApp en attente > 15 min", repairable: false },
];

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

  const [reconciling, setReconciling] = useState<"report" | "apply" | null>(null);
  const [reconcileResult, setReconcileResult] = useState<ChatIntegrity | null>(null);
  const runReconcile = useCallback(async (mode: "report" | "apply") => {
    if (mode === "apply" && !window.confirm(
      "Appliquer les réparations sûres (rattachements thread, clôtures, deals manquants) ? Chaque action est journalisée.",
    )) return;
    setReconciling(mode);
    try {
      const { data: res, error: err } = await supabase.rpc("waouh_admin_reconcile_chat", { p_mode: mode });
      if (err) throw err;
      const payload = res as (ChatIntegrity & { ok?: boolean; error?: string }) | null;
      if (payload?.ok === false) throw new Error(payload.error || "failed");
      setReconcileResult(payload);
      toast.success(mode === "apply" ? "Réparations appliquées" : "Analyse terminée");
      if (mode === "apply") void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error && e.message ? e.message : "Réconciliation impossible");
    } finally {
      setReconciling(null);
    }
  }, [load]);
  const chatIntegrity: ChatIntegrity | null = reconcileResult;

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
          <Database className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold">Intégrité commerce E2E</h2>
          <Badge variant={
            data && (
              data.commerce_integrity.open_negotiations_without_thread > 0 ||
              data.commerce_integrity.accepted_without_deal_in_window > 0 ||
              data.commerce_integrity.deals_waiting_courier > 0
            ) ? "destructive" : "secondary"
          }>
            graphe
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Négos ouvertes sans thread</div>
            <div className="text-xl font-bold">{data?.commerce_integrity.open_negotiations_without_thread ?? "—"}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Accords sans deal · fenêtre</div>
            <div className="text-xl font-bold">{data?.commerce_integrity.accepted_without_deal_in_window ?? "—"}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Deals sans thread</div>
            <div className="text-xl font-bold">{data?.commerce_integrity.deals_without_thread ?? "—"}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Deals sans négociation</div>
            <div className="text-xl font-bold">{data?.commerce_integrity.deals_without_negotiation ?? "—"}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">En attente livreur</div>
            <div className="text-xl font-bold">{data?.commerce_integrity.deals_waiting_courier ?? "—"}</div>
          </div>
        </div>
        {(data?.commerce_integrity.accepted_threadless_legacy ?? 0) > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Historique legacy : {data!.commerce_integrity.accepted_threadless_legacy} accord(s) accepted sans thread canonique.
            Les nouveaux parcours sont bloqués par les invariants E2E V3.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Wrench className="w-4 h-4 text-violet-600" />
          <h2 className="font-semibold">Réconciliation du chat</h2>
          <Badge variant="outline" className="text-xs">
            {chatIntegrity?.mode === "apply" ? "réparations appliquées" : "rapport"}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void runReconcile("report")} disabled={!!reconciling}>
              {reconciling === "report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2">Analyser</span>
            </Button>
            <Button size="sm" onClick={() => void runReconcile("apply")} disabled={!!reconciling}>
              {reconciling === "apply" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              <span className="ml-2">Réparer maintenant</span>
            </Button>
          </div>
        </div>
        {!chatIntegrity ? (
          <p className="text-xs text-muted-foreground">
            Réconciliation indisponible : migrations du 27/09/2026 non appliquées, ou analyse non lancée.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {CHAT_INTEGRITY_ROWS.map((row) => {
                const value = Number(chatIntegrity[row.key] ?? 0);
                return (
                  <div key={row.key} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{row.label}</div>
                    <div className={`text-xl font-bold ${value > 0 && row.repairable ? "text-amber-600" : ""}`}>{value}</div>
                  </div>
                );
              })}
            </div>
            {chatIntegrity.r6_skipped === "commission_rate_required" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Accords sans deal non réparés : taux de commission requis (WAOUH_COMMISSION_RATE côté edge function).
              </p>
            )}
            {(chatIntegrity.r6_errors?.length ?? 0) > 0 && (
              <p className="mt-3 text-xs text-destructive">
                {chatIntegrity.r6_errors!.length} accord(s) non réparable(s) automatiquement (article vendu/réservé…) — arbitrage manuel.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Le cron (15 min) ne répare que si l'automatisation « Chat — réconciliation automatique » est activée dans le Command Center.
            </p>
          </>
        )}
      </Card>

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
