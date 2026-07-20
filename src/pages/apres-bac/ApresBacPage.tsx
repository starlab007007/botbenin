import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, RefreshCw, RotateCw, Trash2, CloudCheck as CloudCheckIcon, CheckCircle2, LayoutGrid, ChevronUp, ChevronDown,
  BarChart3, ScanLine, BarChart2, Sparkles, ShieldCheck, ListOrdered, Landmark, Search,
  GraduationCap, Send, Loader2, FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const SERIES = ["A1", "A2", "B", "C", "D", "E", "F", "G", "H"];
type Msg = { id: string; role: "user" | "assistant"; content: string; sources?: any[] };

type ToolKey = "notes" | "scan" | "profile" | "reco" | "eligibility" | "ranking" | "universities" | "explore";

const TOOLS: { key: ToolKey; label: string; icon: any; action: "prompt" | "scan" | "notes" }[] = [
  { key: "notes", label: "Ajouter\nmes notes", icon: BarChart3, action: "notes" },
  { key: "scan", label: "Scanner\nmon relevé", icon: ScanLine, action: "scan" },
  { key: "profile", label: "Analyser\nmon profil", icon: BarChart2, action: "prompt" },
  { key: "reco", label: "Mes\nrecommandations", icon: Sparkles, action: "prompt" },
  { key: "eligibility", label: "Mon\néligibilité", icon: ShieldCheck, action: "prompt" },
  { key: "ranking", label: "Classement\npossible", icon: ListOrdered, action: "prompt" },
  { key: "universities", label: "Universités\net écoles", icon: Landmark, action: "prompt" },
  { key: "explore", label: "Explorer\nles filières", icon: Search, action: "prompt" },
];

const TOOL_PROMPTS: Record<ToolKey, string> = {
  notes: "",
  scan: "",
  profile: "Analyse mon profil académique et dis-moi quelles filières correspondent le mieux à mon niveau et ma série.",
  reco: "Donne-moi tes recommandations de filières post-BAC les plus adaptées à mon profil, avec justifications.",
  eligibility: "Vérifie mon éligibilité aux filières sélectives (concours, quotas, moyennes minimales) selon ma série et mes notes.",
  ranking: "Vérifie les calculs de classement possibles pour moi selon mes notes et la série choisie.",
  universities: "Montre les universités et écoles au Bénin qui proposent les filières adaptées à mon profil.",
  explore: "Explore avec moi les filières disponibles au Bénin en 2026 : catégories, débouchés, durée d'études.",
};

const SUGGESTIONS = [
  "Analyse mon profil",
  "Vérifie les calculs de classement possibles",
  "Montre les universités qui proposent ces filières",
];

export default function ApresBacPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [series, setSeries] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [newNote, setNewNote] = useState<{ subject: string; score: string }>({ subject: "", score: "" });
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const [{ data: prof }, { count }] = await Promise.all([
      (supabase as any).from("apresbac_student_profiles").select("bac_series").eq("user_id", user.id).maybeSingle(),
      (supabase as any).from("apresbac_student_subject_results").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    if (prof?.bac_series) setSeries(prof.bac_series);
    setNotesCount(count || 0);
  }, [user]);

  const loadMessages = useCallback(async (sid: string) => {
    const { data } = await (supabase as any).from("apresbac_chat_messages")
      .select("id, role, content").eq("session_id", sid).order("created_at");
    setMessages((data as Msg[]) || []);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { if (sessionId) loadMessages(sessionId); }, [sessionId, loadMessages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [messages, sending]);

  const persistSeries = async (s: string) => {
    setSeries(s);
    if (!user) return;
    await (supabase as any).from("apresbac_student_profiles")
      .upsert({ user_id: user.id, bac_series: s === "all" ? null : s }, { onConflict: "user_id" });
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    setSending(true);
    setMessages(m => [...m, { id: `local-${Date.now()}`, role: "user", content: text }]);
    if (!overrideText) setInput("");
    try {
      const { data, error } = await supabase.functions.invoke("apresbac-chat", {
        body: { session_id: sessionId, message: text, bac_series: series || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      if (!sessionId) setSessionId(d.session_id);
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
      loadProfile();
    } catch (e: any) {
      toast({ title: "OCR échoué", description: e?.message || "", variant: "destructive" });
    } finally {
      setOcrBusy(false);
    }
  };

  const addNote = async () => {
    if (!user || !newNote.subject.trim()) return;
    const score = Number(newNote.score);
    if (!Number.isFinite(score) || score < 0 || score > 20) {
      toast({ title: "Note invalide", description: "Entre 0 et 20", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any).from("apresbac_student_subject_results").insert({
      user_id: user.id, bac_series: series || null,
      subject_name: newNote.subject.trim().slice(0, 120), score, source: "manual", confirmed: true,
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setNewNote({ subject: "", score: "" });
    loadProfile();
    toast({ title: "Note ajoutée" });
  };

  const clearConversation = () => { setSessionId(null); setMessages([]); };

  const onToolClick = (t: (typeof TOOLS)[number]) => {
    if (t.action === "scan") setOcrOpen(true);
    else if (t.action === "notes") setNotesOpen(true);
    else send(TOOL_PROMPTS[t.key]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header vert */}
      <header className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:opacity-80">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight">AprèsBac IA</h1>
          <p className="text-xs opacity-90 truncate">Orientation intelligente, publique et gratuite</p>
        </div>
        <button onClick={loadProfile} className="p-2 hover:opacity-80" aria-label="Synchroniser">
          <RefreshCw className="h-5 w-5" />
        </button>
        <button onClick={() => window.location.reload()} className="p-2 hover:opacity-80" aria-label="Recharger">
          <RotateCw className="h-5 w-5" />
        </button>
        <button onClick={clearConversation} className="p-2 hover:opacity-80" aria-label="Effacer">
          <Trash2 className="h-5 w-5" />
        </button>
      </header>

      {/* Bandeau statut */}
      <div className="bg-primary/5 border-b border-primary/10 px-4 py-3 flex items-center gap-2">
        <CloudCheck className="h-5 w-5 text-primary" />
        <span className="text-sm text-primary font-medium">AprèsBac IA est opérationnel.</span>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-32 space-y-4">
        {/* Outils AprèsBac */}
        <section>
          <button
            onClick={() => setToolsOpen(v => !v)}
            className="w-full flex items-center justify-between mb-3"
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-foreground/70" />
              <span className="font-semibold text-foreground">Outils AprèsBac</span>
            </div>
            <div className="flex items-center gap-1 text-primary text-sm font-medium">
              {toolsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {toolsOpen ? "Réduire" : "Afficher"}
            </div>
          </button>

          {toolsOpen && (
            <div className="grid grid-cols-4 gap-2.5">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                const badge = t.key === "notes" && notesCount > 0 ? notesCount : null;
                return (
                  <button
                    key={t.key}
                    onClick={() => onToolClick(t)}
                    className="relative rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/10 aspect-square flex flex-col items-center justify-center p-2 text-center transition-colors"
                  >
                    {badge !== null && (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                    <Icon className="h-6 w-6 text-primary mb-1.5" />
                    <span className="text-[11px] leading-tight font-semibold text-foreground whitespace-pre-line">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Série du BAC + notes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-3">
            <label className="text-xs text-muted-foreground">Série du Bac</label>
            <Select value={series || "all"} onValueChange={persistSeries}>
              <SelectTrigger className="border-0 shadow-none px-1 h-9 font-semibold text-base focus:ring-0">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Toutes" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {SERIES.map(s => <SelectItem key={s} value={s}>Série {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border bg-card p-3 flex flex-col justify-center">
            <div className="text-base font-bold text-primary">{notesCount} note(s)</div>
            <div className="text-xs text-muted-foreground">615 filières</div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="rounded-2xl border bg-card p-3 space-y-3 min-h-[240px]">
          {messages.length === 0 && (
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left rounded-2xl border border-primary/15 bg-background hover:bg-primary/5 px-3.5 py-3 text-sm flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium">{s}</span>
                </button>
              ))}
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.sources.map((s: any) => (
                      <Badge key={s.id} variant="secondary" className="text-[10px]">
                        <FileText className="h-3 w-3 mr-1" />
                        {s.name}{s.page ? ` · p.${s.page}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-3.5 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />L'IA analyse les filières…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-3 z-40">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Pose une question précise sur une filière, un métier, une série ou un quota…"
            rows={2}
            disabled={sending}
            className="flex-1 resize-none rounded-2xl bg-muted/50 border-0 focus-visible:ring-1"
          />
          <Button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            size="icon"
            className="h-12 w-12 rounded-full flex-shrink-0"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Dialog Scan OCR */}
      <Dialog open={ocrOpen} onOpenChange={setOcrOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Scanner mon relevé de notes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Prends en photo ou importe ton relevé. L'IA extrait les matières et notes automatiquement.</p>
            <Input type="file" accept="image/*" capture="environment" disabled={ocrBusy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOcr(f); }} />
            {ocrBusy && <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Analyse en cours…</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter notes manuellement */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter mes notes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Matière</label>
              <Input value={newNote.subject} onChange={(e) => setNewNote(n => ({ ...n, subject: e.target.value }))} placeholder="Ex : Mathématiques" />
            </div>
            <div>
              <label className="text-sm font-medium">Note /20</label>
              <Input type="number" min={0} max={20} step="0.25" value={newNote.score}
                onChange={(e) => setNewNote(n => ({ ...n, score: e.target.value }))} placeholder="13.5" />
            </div>
            <div className="text-xs text-muted-foreground">Total actuel : {notesCount} note(s)</div>
            <Button onClick={addNote} className="w-full">Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
