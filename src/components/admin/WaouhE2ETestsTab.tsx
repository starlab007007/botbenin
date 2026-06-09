import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Play, Download } from "lucide-react";

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

function statusBadge(s: "ok" | "warn" | "fail" | "partial" | "failed" | "running" | string) {
  if (s === "ok") return <Badge className="bg-emerald-600">✅ OK</Badge>;
  if (s === "warn" || s === "partial") return <Badge className="bg-amber-500">⚠️ Écart</Badge>;
  if (s === "fail" || s === "failed") return <Badge variant="destructive">❌ Fail</Badge>;
  if (s === "running") return <Badge variant="secondary">⏳ En cours</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export default function WaouhE2ETestsTab() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selected, setSelected] = useState<RunRow | null>(null);
  const [running, setRunning] = useState(false);

  const loadRuns = async () => {
    const { data } = await supabase
      .from("waouh_e2e_test_runs" as any)
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    setRuns((data as any) || []);
    if (data && (data as any).length && !selected) setSelected((data as any)[0]);
  };

  useEffect(() => { loadRuns(); }, []);

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
    await loadRuns();
  };

  const exportMd = () => {
    if (!selected) return;
    const cells = (selected.steps as CellResult[]) || [];
    const bySource: Record<string, CellResult[]> = { chat: [], partner: [], radar: [] };
    cells.forEach(c => { (bySource[c.source] ||= []).push(c); });
    let md = `# Rapport E2E WAOUH\n\nRun: ${selected.id}\nStatut: ${selected.status}\nDémarré: ${selected.started_at}\n\n`;
    for (const src of ["chat", "partner", "radar"]) {
      md += `\n## Source: ${src.toUpperCase()}\n\n| Cell | Statut | Étape | Attendu | Reçu | Écart |\n|---|---|---|---|---|---|\n`;
      for (const c of bySource[src] || []) {
        for (const s of c.steps) {
          md += `| ${c.cell} | ${c.status} | ${s.step} | ${s.expected} | ${s.got} | ${s.status} |\n`;
        }
      }
    }
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tests E2E WhatsApp (A/B/C × chat/partenaire/radar)</span>
            <div className="flex gap-2">
              <Button onClick={runAll} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Exécuter tests WhatsApp
              </Button>
              <Button variant="outline" onClick={exportMd} disabled={!selected}>
                <Download className="h-4 w-4 mr-2" />Exporter rapport
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Lance 9 scénarios automatisés (vendeur/acheteur sur WA, App, ou mixte ; annonce de chat, partenaire ou radar IA).
            Comparaison messages attendus vs réellement reçus avec statut d'écart.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Runs récents</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {runs.map(r => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${selected?.id === r.id ? "bg-muted" : ""}`}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource[src].length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-4">Aucune donnée pour cette source.</TableCell></TableRow>
                )}
                {bySource[src].flatMap(c =>
                  c.steps.map((s, i) => (
                    <TableRow key={`${c.cell}-${i}`}>
                      <TableCell><Badge variant="outline">{c.cell}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{s.step}</TableCell>
                      <TableCell className="text-xs">{s.expected}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate" title={s.got}>{s.got}</TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
