import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, GraduationCap, MessageSquare, Users, ScanLine, AlertTriangle, FileText, RefreshCw, Loader2, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#eab308", "#06b6d4", "#f43f5e", "#84cc16"];

export default function AdminApresBacPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [seriesDist, setSeriesDist] = useState<Array<{ name: string; value: number }>>([]);
  const [topPrograms, setTopPrograms] = useState<Array<{ name: string; value: number }>>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [noSourceRate, setNoSourceRate] = useState<number>(0);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [openMessages, setOpenMessages] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      // KPIs
      const { data: k } = await (supabase as any).from("v_apresbac_kpis").select("*").maybeSingle();
      setKpis(k);

      // Series distribution
      const { data: sess } = await (supabase as any).from("apresbac_chat_sessions").select("bac_series");
      const bySeries: Record<string, number> = {};
      (sess || []).forEach((s: any) => { const k = s.bac_series || "—"; bySeries[k] = (bySeries[k] || 0) + 1; });
      setSeriesDist(Object.entries(bySeries).map(([name, value]) => ({ name, value })));

      // Top programs via sources
      const { data: src } = await (supabase as any).from("apresbac_chat_sources")
        .select("record_id").limit(2000);
      const byRec: Record<string, number> = {};
      (src || []).forEach((s: any) => { if (s.record_id) byRec[s.record_id] = (byRec[s.record_id] || 0) + 1; });
      const topIds = Object.entries(byRec).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (topIds.length) {
        const { data: progs } = await (supabase as any).from("apresbac_program_records")
          .select("id, program_name").in("id", topIds.map(([id]) => id));
        const nameById: Record<string, string> = {};
        (progs || []).forEach((p: any) => { nameById[p.id] = p.program_name; });
        setTopPrograms(topIds.map(([id, v]) => ({ name: (nameById[id] || id).slice(0, 32), value: v })));
      } else setTopPrograms([]);

      // Recent sessions
      const { data: rec } = await (supabase as any).from("apresbac_chat_sessions")
        .select("id, title, bac_series, user_id, created_at, updated_at")
        .order("updated_at", { ascending: false }).limit(20);
      setRecent(rec || []);

      // No-source rate
      const { count: totalAsst } = await (supabase as any).from("apresbac_chat_messages")
        .select("id", { count: "exact", head: true }).eq("role", "assistant");
      const { data: withSrc } = await (supabase as any).from("apresbac_chat_sources").select("message_id");
      const uniq = new Set((withSrc || []).map((s: any) => s.message_id));
      const rate = totalAsst ? 1 - uniq.size / totalAsst : 0;
      setNoSourceRate(Math.round(rate * 100));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openSessionDetail = async (id: string) => {
    setOpenSession(id);
    const { data } = await (supabase as any).from("apresbac_chat_messages")
      .select("id, role, content, created_at").eq("session_id", id).order("created_at");
    setOpenMessages(data || []);
  };

  const kpiCards = useMemo(() => kpis ? [
    { label: "Sessions (total)", value: kpis.sessions_total, sub: `${kpis.sessions_7d} sur 7j · ${kpis.sessions_30d} sur 30j`, icon: MessageSquare, color: "text-blue-500" },
    { label: "Messages", value: kpis.messages_total, sub: `${kpis.messages_user} user · ${kpis.messages_assistant} IA`, icon: MessageSquare, color: "text-indigo-500" },
    { label: "Utilisateurs uniques", value: kpis.unique_users, sub: "étudiants ayant discuté", icon: Users, color: "text-purple-500" },
    { label: "OCR relevés", value: kpis.ocr_total, sub: `${kpis.ocr_ok} ok · ${kpis.ocr_failed} échec`, icon: ScanLine, color: "text-cyan-500" },
    { label: "Anomalies référence", value: kpis.anomalies_open, sub: `sur ${kpis.anomalies_total} total`, icon: AlertTriangle, color: "text-orange-500" },
    { label: "Documents référence", value: kpis.docs_published, sub: `${kpis.docs_total} au total`, icon: FileText, color: "text-emerald-500" },
    { label: "Filières indexées", value: kpis.programs_total, sub: "disponibles pour la RAG", icon: BookOpen, color: "text-teal-500" },
    { label: "Réponses sans source", value: `${noSourceRate}%`, sub: "indicateur hallucinations", icon: AlertTriangle, color: noSourceRate > 30 ? "text-red-500" : "text-yellow-500" },
  ] : [], [kpis, noSourceRate]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><GraduationCap className="h-7 w-7 text-primary" />Après BAC IA — Suivi</h1>
            <p className="text-muted-foreground">Back-office admin : chats, RAG, OCR, anomalies</p>
          </div>
        </div>
        <Button onClick={load} disabled={loading} variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Rafraîchir
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Chargement…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {kpiCards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</span>
                      <Icon className={`h-4 w-4 ${c.color}`} />
                    </div>
                    <div className="text-2xl font-bold">{c.value ?? 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Sessions par série BAC</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                {seriesDist.length ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={seriesDist} dataKey="value" nameKey="name" outerRadius={90} label>
                        {seriesDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-12">Aucune session.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top 10 filières citées</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                {topPrograms.length ? (
                  <ResponsiveContainer>
                    <BarChart data={topPrograms} layout="vertical" margin={{ left: 30 }}>
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-12">Aucune source citée pour l'instant.</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Dernières sessions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Série</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Dernier msg</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="max-w-xs truncate">{s.title || "Sans titre"}</TableCell>
                      <TableCell><Badge variant="outline">{s.bac_series || "—"}</Badge></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{s.user_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs">{new Date(s.updated_at).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openSessionDetail(s.id)}>Ouvrir</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!recent.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aucune session.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={!!openSession} onOpenChange={(o) => !o && setOpenSession(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader><DialogTitle>Fil de la session</DialogTitle></DialogHeader>
              <div className="overflow-y-auto space-y-3 pr-2">
                {openMessages.map((m: any) => (
                  <div key={m.id} className={`rounded-lg p-3 ${m.role === "user" ? "bg-primary/10" : "bg-muted"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={m.role === "user" ? "default" : "secondary"} className="text-xs">{m.role}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
                {!openMessages.length && <p className="text-sm text-muted-foreground">Aucun message.</p>}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
