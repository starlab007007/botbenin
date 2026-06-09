import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Play, Download, Trash2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

type Scenario = "A" | "B" | "C";
type Source = "chat" | "partner" | "radar";

interface StepResult {
  step: string;
  expected: string;
  got: string;
  status: "ok" | "warn" | "fail";
}

interface CellResult {
  scenario: Scenario;
  source: Source;
  cell: string;
  status: "ok" | "partial" | "failed";
  steps: StepResult[];
  artifacts: Record<string, string | undefined>;
}

interface RunRow {
  id: string;
  scenario: string;
  source: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary: any;
  steps: any;
}

function statusBadge(s: string) {
  if (s === "ok") return <Badge className="bg-emerald-600">✅ OK</Badge>;
  if (s === "warn" || s === "partial") return <Badge className="bg-amber-500">⚠️ Écart</Badge>;
  if (s === "fail" || s === "failed") return <Badge variant="destructive">❌ Fail</Badge>;
  if (s === "running") return <Badge variant="secondary">⏳ En cours</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return id.slice(0, 8);
}

export default function WaouhE2ETestsTab() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [purging, setPurging] = useState(false);

  const selected = useMemo(() => runs.find(r => r.id === selectedId) || null, [runs, selectedId]);

  const loadRuns = async (forceSelectLatest = false) => {
    const { data } = await supabase
      .from("waouh_e2e_test_runs" as any)
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30);
    const list = (data as any as RunRow[]) || [];
    setRuns(list);
    if (list.length === 0) {
      setSelectedId(null);
      return;
    }
    if (forceSelectLatest || !selectedId || !list.find(r => r.id === selectedId)) {
      setSelectedId(list[0].id);
    }
  };

  useEffect(() => { loadRuns(true); }, []);

  const runAll = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("waouh-e2e-test", {
      body: { scenarios: ["A", "B", "C"], sources: ["chat", "partner", "radar"] },
    });
    setRunning(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tests E2E terminés", description: `Statut: ${data?.status} · ${data?.summary?.ok}/${data?.summary?.cells} OK` });
    await loadRuns(true);
  };

  const purgeOldFails = async () => {
    const lastOk = runs.find(r => r.status === "ok");
    if (!lastOk) {
      toast({ title: "Aucun run OK", description: "Impossible de purger sans run OK de référence.", variant: "destructive" });
      return;
    }
    setPurging(true);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await supabase
      .from("waouh_e2e_test_runs" as any)
      .delete({ count: "exact" })
      .neq("status", "ok")
      .lt("started_at", lastOk.started_at)
      .lt("started_at", cutoff);
    setPurging(false);
    if (error) {
      toast({ title: "Erreur purge", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Purge effectuée", description: `${count ?? 0} run(s) supprimé(s)` });
    await loadRuns(true);
  };

  const exportMd = () => {
    if (!selected) return;
    const cells = (selected.steps as CellResult[]) || [];
    const bySource: Record<string, CellResult[]> = { chat: [], partner: [], radar: [] };
    cells.forEach(c => { (bySource[c.source] ||= []).push(c); });
    let md = `# Rapport E2E WAOUH\n\nRun: ${selected.id}\nStatut: ${selected.status}\nDémarré: ${selected.started_at}\nRésumé: ${selected.summary?.ok ?? 0} OK · ${selected.summary?.partial ?? 0} warn · ${selected.summary?.failed ?? 0} fail\n\n`;
    for (const src of ["chat", "partner", "radar"]) {
      md += `\n## Source: ${src.toUpperCase()}\n\n| Cell | Statut | Étape | Attendu | Reçu | Écart |\n|---|---|---|---|---|---|\n`;
      for (const c of bySource[src] || []) {
        for (const s of c.steps) {
          md += `| ${c.cell} | ${c.status} | ${s.step} | ${s.expected} | ${s.got.replace(/\|/g, "\\|")} | ${s.status} |\n`;
        }
      }
      md += `\n### Artefacts ${src.toUpperCase()}\n\n`;
      for (const c of bySource[src] || []) {
        md += `- **${c.cell}**: ${JSON.stringify(c.artifacts || {})}\n`;
      }
    }
    md += `\n## Détail JSON brut (warn/fail)\n\n\`\`\`json\n${JSON.stringify(cells.filter(c => c.status !== "ok"), null, 2)}\n\`\`\`\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `e2e-waouh-${selected.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cells = (selected?.steps as CellResult[]) || [];
  const bySource: Record<Source, CellResult[]> = { chat: [], partner: [], radar: [] };
  cells.forEach(c => { bySource[c.source]?.push(c); });

  const latest = runs[0];
  const oldFailCount = runs.filter(r => r.status !== "ok").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>Tests E2E WhatsApp (A/B/C × chat/partenaire/radar)</span>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={runAll} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Exécuter tests WhatsApp
              </Button>
              <Button variant="outline" onClick={exportMd} disabled={!selected}>
                <Download className="h-4 w-4 mr-2" />Exporter rapport
              </Button>
              <Button variant="outline" onClick={purgeOldFails} disabled={purging || oldFailCount === 0}>
                {purging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Purger anciens Fails
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Lance 9 scénarios automatisés (vendeur/acheteur sur WA, App, ou mixte ; annonce de chat, partenaire ou radar IA).
            Comparaison messages attendus vs réellement reçus avec statut d'écart.
          </p>
          {latest && (
            <div className={`flex items-center gap-3 p-3 rounded-md border ${latest.status === "ok" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"}`}>
              {latest.status === "ok"
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                : <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
              <div className="text-sm">
                <strong>Dernier run : {latest.status === "ok" ? "OK" : "Fail"}</strong>
                {" · "}{latest.summary?.ok ?? 0}/{latest.summary?.cells ?? 0} cellules OK
                {(latest.summary?.partial ?? 0) > 0 && ` · ${latest.summary.partial} warn`}
                {(latest.summary?.failed ?? 0) > 0 && ` · ${latest.summary.failed} fail`}
                {" · "}<span className="text-muted-foreground">{timeAgo(latest.started_at)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Runs récents</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {runs.map(r => (
            <div
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${selectedId === r.id ? "bg-muted ring-1 ring-primary/30" : ""}`}
            >
              {statusBadge(r.status)}
              <span className="text-xs font-mono">{r.id.slice(0, 8)}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString()}</span>
              <span className="text-xs ml-auto">
                {r.summary?.ok ?? 0}✅ · {r.summary?.partial ?? 0}⚠️ · {r.summary?.failed ?? 0}❌
              </span>
            </div>
          ))}
          {runs.length === 0 && <p className="text-sm text-muted-foreground">Aucun run pour le moment.</p>}
        </CardContent>
      </Card>

      {selected && (["chat", "partner", "radar"] as Source[]).map(src => (
        <Card key={src}>
          <CardHeader>
            <CardTitle className="capitalize">Annonce source : {src === "chat" ? "Chat" : src === "partner" ? "Partenaire" : "Radar IA"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cell</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead>Attendu</TableHead>
                  <TableHead>Reçu</TableHead>
                  <TableHead>Écart</TableHead>
                  <TableHead>Artefacts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource[src].length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-4">Aucune donnée pour cette source.</TableCell></TableRow>
                )}
                {bySource[src].flatMap(c => {
                  const articleId = c.artifacts?.article_id;
                  const negId = c.artifacts?.negotiation_id;
                  const dealId = c.artifacts?.deal_id;
                  const traceHref = articleId ? `/admin/waouh/historique?article_id=${articleId}` : null;
                  return c.steps.map((s, i) => (
                    <TableRow key={`${c.cell}-${i}`}>
                      <TableCell><Badge variant="outline">{c.cell}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{s.step}</TableCell>
                      <TableCell className="text-xs">{s.expected}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate" title={s.got}>{s.got}</TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {i === 0 && (
                          <div className="flex flex-col gap-0.5">
                            {articleId && <span title={articleId}>art: {shortId(articleId)}</span>}
                            {negId && <span title={negId}>neg: {shortId(negId)}</span>}
                            {dealId && <span title={dealId}>deal: {shortId(dealId)}</span>}
                            {traceHref && (
                              <a href={traceHref} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                                trace <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
