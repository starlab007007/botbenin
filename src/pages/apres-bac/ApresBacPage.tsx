import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, GraduationCap, Upload, Loader2, Plus, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SERIES = ["A1", "A2", "B", "C", "D", "E", "F", "G", "H"];

type Msg = { id: string; role: "user" | "assistant"; content: string; sources?: any[] };

export default function ApresBacPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [series, setSeries] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("apresbac_chat_sessions")
      .select("id, title, bac_series, updated_at").eq("user_id", user.id)
      .order("updated_at", { ascending: false }).limit(20);
    setSessions(data || []);
  }, [user]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("apresbac_student_profiles")
      .select("bac_series").eq("user_id", user.id).maybeSingle();
    if (data?.bac_series) setSeries(data.bac_series);
  }, [user]);

  const loadMessages = useCallback(async (sid: string) => {
    const { data } = await (supabase as any).from("apresbac_chat_messages")
      .select("id, role, content").eq("session_id", sid).order("created_at");
    setMessages((data as Msg[]) || []);
  }, []);

  useEffect(() => { loadSessions(); loadProfile(); }, [loadSessions, loadProfile]);
  useEffect(() => { if (sessionId) loadMessages(sessionId); }, [sessionId, loadMessages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [messages]);

  const persistSeries = async (s: string) => {
    setSeries(s);
    if (!user) return;
    await (supabase as any).from("apresbac_student_profiles")
      .upsert({ user_id: user.id, bac_series: s }, { onConflict: "user_id" });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const localId = `local-${Date.now()}`;
    setMessages(m => [...m, { id: localId, role: "user", content: text }]);
    setInput("");
    try {
      const { data, error } = await supabase.functions.invoke("apresbac-chat", {
        body: { session_id: sessionId, message: text, bac_series: series || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      if (!sessionId) { setSessionId(d.session_id); loadSessions(); }
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: "assistant", content: d.reply, sources: d.sources }]);
    } catch (e: any) {
      const msg = e?.message || "Erreur";
      toast({
        title: msg.includes("429") ? "Trop de requêtes" : msg.includes("402") ? "Crédits IA épuisés" : "Erreur",
        description: msg, variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleOcr = async (file: File) => {
    setOcrBusy(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("apresbac-ocr", {
        body: { image_data_url: dataUrl, bac_series: series || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const ex = (data as any)?.extraction || {};
      // save confirmed notes
      if (user && Array.isArray(ex.notes)) {
        const rows = ex.notes.map((n: any) => ({
          user_id: user.id, bac_series: ex.bac_series || series || null,
          subject_name: String(n.subject_name || "").slice(0, 120),
          score: Number(n.score) || 0, source: "ocr", confirmed: true,
        })).filter((r: any) => r.subject_name);
        if (rows.length) await (supabase as any).from("apresbac_student_subject_results").insert(rows);
      }
      if (user && (ex.general_average || ex.mention || ex.bac_series)) {
        await (supabase as any).from("apresbac_student_profiles").upsert({
          user_id: user.id,
          bac_series: ex.bac_series || series || null,
          general_average: ex.general_average || null,
          mention: ex.mention || null,
        }, { onConflict: "user_id" });
        if (ex.bac_series) setSeries(ex.bac_series);
      }
      toast({ title: "Relevé importé", description: `${ex.notes?.length || 0} matières détectées` });
      setOcrOpen(false);
    } catch (e: any) {
      toast({ title: "OCR échoué", description: e?.message || "", variant: "destructive" });
    } finally {
      setOcrBusy(false);
    }
  };

  const newSession = () => { setSessionId(null); setMessages([]); };

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Après BAC IA</h1>
          <p className="text-muted-foreground text-sm">Conseiller d'orientation post-BAC (Bénin) — 615 filières indexées</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ta série BAC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={series} onValueChange={persistSeries}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {SERIES.map(s => <SelectItem key={s} value={s}>Série {s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Dialog open={ocrOpen} onOpenChange={setOcrOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full"><Upload className="mr-2 h-4 w-4" />Importer mon relevé</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Importer mon relevé de notes</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Photo ou scan du relevé — l'IA extrait les matières et notes automatiquement.</p>
                  <Input type="file" accept="image/*" disabled={ocrBusy}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOcr(f); }} />
                  {ocrBusy && <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Analyse en cours…</div>}
                </div>
              </DialogContent>
            </Dialog>

            <Button className="w-full" onClick={newSession}><Plus className="mr-2 h-4 w-4" />Nouvelle conversation</Button>

            <div className="pt-3 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2">CONVERSATIONS</p>
              <div className="space-y-1 max-h-[400px] overflow-auto">
                {sessions.map(s => (
                  <button key={s.id}
                    onClick={() => setSessionId(s.id)}
                    className={`w-full text-left text-sm rounded-md px-2 py-1.5 hover:bg-accent ${sessionId === s.id ? "bg-accent" : ""}`}>
                    <div className="truncate">{s.title || "Sans titre"}</div>
                    <div className="text-xs text-muted-foreground">{s.bac_series || "—"}</div>
                  </button>
                ))}
                {!sessions.length && <p className="text-xs text-muted-foreground">Aucune conversation.</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 flex flex-col" style={{ height: "72vh" }}>
          <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                  <GraduationCap className="mx-auto h-12 w-12 opacity-30 mb-3" />
                  <p className="font-medium">Commence la conversation</p>
                  <p className="text-sm">Ex : "Quelles filières pour la série D avec 13 de moyenne ?"</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.sources.map((s: any) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {s.name} {s.page ? `· p.${s.page}` : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />L'IA analyse les filières…
                  </div>
                </div>
              )}
            </div>
            <div className="border-t pt-3 mt-3 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={series ? `Pose ta question orientation (Série ${series})…` : "Sélectionne d'abord ta série BAC puis pose ta question…"}
                rows={2}
                disabled={sending}
              />
              <Button onClick={send} disabled={sending || !input.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
