import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AiAgent } from "@/hooks/useAiAgents";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, RefreshCw, Loader2, ExternalLink, Sheet } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#22c55e", "#16a34a", "#4ade80", "#a3e635", "#facc15", "#f97316"];

export function AgentInsightsDialog({ agent, onClose }: { agent: AiAgent; onClose: () => void }) {
  const { toast } = useToast();
  const [sheetUrl, setSheetUrl] = useState(agent.google_sheet_url || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");

  const loadInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-agent-insights", {
        body: { agent_id: agent.id, mode: "overview" },
      });
      if (error) throw error;
      setInsights(data);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadInsights(); /* eslint-disable-next-line */ }, [agent.id]);

  const saveSheet = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("waouh_ai_agents")
      .update({ google_sheet_url: sheetUrl || null }).eq("id", agent.id);
    setSaving(false);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    toast({ title: "✅ Google Sheet lié" });
    loadInsights();
  };

  const askData = async () => {
    if (!question.trim()) return;
    setAsking(true); setAnswer("");
    try {
      const { data, error } = await supabase.functions.invoke("waouh-agent-insights", {
        body: { agent_id: agent.id, mode: "query", question: question.trim() },
      });
      if (error) throw error;
      setAnswer(data?.answer || "Aucune réponse");
    } catch (e: any) {
      setAnswer(`⚠️ ${e.message}`);
    } finally { setAsking(false); }
  };

  const conv = insights?.conversations_per_day || [];
  const topKw = insights?.top_keywords || [];
  const topProducts = insights?.top_products || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            📊 Statistiques & Insights — {agent.name}
            <Button size="sm" variant="ghost" className="ml-auto" onClick={loadInsights}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" /></div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi label="Conversations" value={insights?.total_conversations || 0} />
              <Kpi label="Messages traités" value={insights?.total_messages || 0} />
              <Kpi label="Contacts uniques" value={insights?.unique_contacts || 0} />
              <Kpi label="Handoffs humains" value={insights?.total_handoffs || 0} />
            </div>

            {/* Chart: conversations per day */}
            <div className="border rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">Conversations / jour (30j)</div>
              <div className="h-48">
                <ResponsiveContainer>
                  <LineChart data={conv}>
                    <XAxis dataKey="day" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {/* Top keywords */}
              <div className="border rounded-lg p-3">
                <div className="text-sm font-semibold mb-2">Mots-clés fréquents</div>
                <div className="h-48">
                  <ResponsiveContainer>
                    <BarChart data={topKw}>
                      <XAxis dataKey="word" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Products */}
              <div className="border rounded-lg p-3">
                <div className="text-sm font-semibold mb-2">Produits les plus demandés</div>
                <div className="h-48">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={topProducts} dataKey="count" nameKey="name" outerRadius={60} label>
                        {topProducts.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Google Sheet integration */}
            <div className="border rounded-lg p-3 space-y-2 bg-green-50/40">
              <div className="text-sm font-semibold flex items-center gap-1">
                <Sheet className="w-4 h-4 text-green-600" /> Connecter un Google Sheet (gestion de stock, ventes…)
              </div>
              <div className="text-xs text-muted-foreground">
                Rendez la feuille publique en lecture (Partager → Toute personne avec le lien peut voir) puis collez l'URL.
              </div>
              <div className="flex gap-2">
                <Input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" />
                <Button onClick={saveSheet} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lier"}
                </Button>
                {agent.google_sheet_url && (
                  <Button variant="outline" asChild>
                    <a href={agent.google_sheet_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a>
                  </Button>
                )}
              </div>
              {insights?.sheet && (
                <div className="text-xs">
                  <Badge variant="secondary">{insights.sheet.rows} lignes · {insights.sheet.cols} colonnes</Badge>
                  {insights.sheet.low_stock?.length > 0 && (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-800">
                      ⚠️ Stock faible : {insights.sheet.low_stock.slice(0, 5).map((r: any) => r.name).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ask your data */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-sm font-semibold">🧠 Posez une question sur vos données</div>
              <div className="flex gap-2">
                <Input value={question} onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askData()}
                  placeholder="Ex: Quel produit se vend le plus cette semaine ?" />
                <Button onClick={askData} disabled={asking || !question.trim()}>
                  {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyser"}
                </Button>
              </div>
              {answer && (
                <div className="text-sm bg-muted/40 border rounded p-3 whitespace-pre-wrap">{answer}</div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-3 bg-white text-center">
      <div className="text-2xl font-bold text-green-600">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
