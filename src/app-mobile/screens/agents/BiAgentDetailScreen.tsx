import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const COLORS = ["#0ea5e9", "#f97316", "#10b981", "#a855f7", "#ef4444", "#eab308"];

export default function BiAgentDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ds, setDs] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("waouh_bi_datasources").select("*").eq("id", id).maybeSingle();
      setDs(data);
      const { data: q } = await supabase.from("waouh_bi_queries").select("*").eq("datasource_id", id).order("created_at", { ascending: false }).limit(10);
      setHistory(q || []);
    })();
  }, [id]);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-bi-query", { body: { datasource_id: id, question } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setHistory((h) => [{ question, spec: data.spec, result: data.result, summary: data.spec?.summary, created_at: new Date().toISOString() }, ...h]);
      setQuestion("");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const renderChart = (spec: any, result: any) => {
    if (!spec || !result) return null;
    if (spec.chart_type === "kpi") {
      return <div className="text-4xl font-bold text-primary">{Number(result.value || 0).toLocaleString("fr-FR")}</div>;
    }
    if (spec.chart_type === "table") {
      const rows = result.rows || [];
      if (!rows.length) return <p className="text-sm text-muted-foreground">Aucune ligne</p>;
      const cols = Object.keys(rows[0]);
      return (
        <div className="overflow-x-auto text-xs">
          <table className="w-full"><thead><tr>{cols.map(c => <th key={c} className="text-left p-1 border-b">{c}</th>)}</tr></thead>
          <tbody>{rows.slice(0, 10).map((r: any, i: number) => <tr key={i}>{cols.map(c => <td key={c} className="p-1 border-b">{String(r[c] ?? "")}</td>)}</tr>)}</tbody></table>
        </div>
      );
    }
    const pts = result.points || [];
    if (spec.chart_type === "pie") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pts} dataKey="value" nameKey="name" outerRadius={80} label>
              {pts.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (spec.chart_type === "line") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={pts}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} /></LineChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={pts}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill={COLORS[0]} /></BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/bots")} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {ds?.name || "…"}</div>
          <div className="text-xs text-white/70">{ds?.row_count || 0} lignes · {ds?.schema?.length || 0} colonnes</div>
        </div>
      </header>
      <main className="p-3 max-w-md mx-auto space-y-3 pb-32">
        {ds === null ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Chargement de la source…</CardContent></Card>
        ) : ds && ds.row_count === 0 ? (
          <Card><CardContent className="p-6 text-center space-y-2">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div className="font-medium">Aucune donnée détectée</div>
            <p className="text-xs text-muted-foreground">La source est vide ou inaccessible. Vérifiez qu'elle est publique en lecture, puis créez une nouvelle source.</p>
            <Button size="sm" variant="outline" onClick={() => navigate("/app/agents/bi/new")}>Nouvelle source</Button>
          </CardContent></Card>
        ) : null}

        {history.map((h, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <div className="text-sm font-medium">💬 {h.question}</div>
              {h.summary && <p className="text-xs text-muted-foreground">{h.summary}</p>}
              {renderChart(h.spec, h.result)}
            </CardContent>
          </Card>
        ))}

        {ds && ds.row_count > 0 && !history.length && (
          <Card><CardContent className="p-4 text-sm text-muted-foreground space-y-2">
            <div className="font-medium text-foreground">Prêt à analyser {ds.row_count} lignes.</div>
            <div>Posez une question. Ex :</div>
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              <li>« Top 5 produits par ventes »</li>
              <li>« Total du chiffre d'affaires »</li>
              <li>« Ventes par mois »</li>
            </ul>
          </CardContent></Card>
        )}
      </main>
      <div className="fixed bottom-16 left-0 right-0 border-t bg-background p-2">
        <div className="max-w-md mx-auto flex gap-2">
          <Input placeholder="Poser une question…" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
          <Button onClick={ask} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
      </div>
    </div>
  );
}
