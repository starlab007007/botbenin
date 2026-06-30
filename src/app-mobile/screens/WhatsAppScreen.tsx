import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useWAHADashboard, WAHASession } from "@/hooks/useWAHADashboard";
import { useBots } from "@/components/bot-conversation/hooks/useBots";
import { PhoneBjInput } from "../components/bots/SmartFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Plus, RefreshCw, QrCode, Play, Square, Trash2, Send, Link2, Webhook,
  CheckCircle2, AlertCircle, Loader2, Smartphone, Bot, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PairCodeFlow from "@/components/whatsapp/PairCodeFlow";
import { KeyRound } from "lucide-react";

// ============================================================
// Status helpers
// ============================================================
const statusMeta = (s?: string) => {
  switch (s) {
    case "WORKING":
    case "connected":
      return { label: "Connecté", cls: "bg-emerald-500 text-white", icon: CheckCircle2 };
    case "SCAN_QR_CODE":
      return { label: "Scanner le QR", cls: "bg-amber-500 text-white", icon: QrCode };
    case "STARTING":
      return { label: "Démarrage…", cls: "bg-blue-500 text-white", icon: Loader2 };
    case "FAILED":
      return { label: "Échec", cls: "bg-red-500 text-white", icon: AlertCircle };
    case "STOPPED":
    default:
      return { label: s || "Arrêtée", cls: "bg-slate-400 text-white", icon: Square };
  }
};

// ============================================================
// Main Screen
// ============================================================
export default function WhatsAppScreen() {
  const { user } = useMobileAuth();
  const {
    sessions, loading, createSession, startSession, stopSession,
    deleteSession, getQRCode, sendTestMessage, refreshData,
  } = useWAHADashboard();

  const [dbSessions, setDbSessions] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [qrSession, setQrSession] = useState<string | null>(null);
  const [actionSession, setActionSession] = useState<string | null>(null);
  const [testSession, setTestSession] = useState<string | null>(null);
  const [linkSession, setLinkSession] = useState<string | null>(null);
  const [webhookSession, setWebhookSession] = useState<string | null>(null);

  const loadDb = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("whatsapp_accounts")
      .select("id, session_name, status, phone_number, user_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDbSessions(data ?? []);
  }, [user]);

  useEffect(() => { loadDb(); }, [loadDb]);

  // Realtime — strictly scoped to current user
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`wa_mobile_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_accounts", filter: `user_id=eq.${user.id}` },
        () => loadDb()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadDb]);

  // Merge DB + live WAHA — strict per-user: ignore live sessions not owned by current user
  const merged: WAHASession[] = useMemo(() => {
    const allowed = new Set(dbSessions.map((d) => d.session_name));
    const map = new Map<string, WAHASession>();
    for (const db of dbSessions) {
      map.set(db.session_name, {
        name: db.session_name,
        status: (db.status as any) || "STOPPED",
        server: "WAHA",
        config: { metadata: { phone_number: db.phone_number ?? undefined } },
      });
    }
    for (const live of sessions) {
      if (!allowed.has(live.name)) continue; // hide other users' WAHA sessions
      const prev = map.get(live.name);
      map.set(live.name, { ...prev, ...live, config: { ...prev?.config, ...live.config } });
    }
    return Array.from(map.values());
  }, [dbSessions, sessions]);


  const handleRefresh = async () => {
    await Promise.all([refreshData(), loadDb()]);
    toast.success("Synchronisé");
  };

  const handleCreate = async (name: string) => {
    const clean = name.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);
    if (!clean) return toast.error("Nom invalide");
    try {
      await createSession(clean);
      await supabase.from("whatsapp_accounts").upsert(
        { user_id: user!.id, session_name: clean, status: "disconnected" },
        { onConflict: "user_id,session_name" }
      );
      await loadDb();
      setOpenCreate(false);
      // Auto-start so WAHA reaches SCAN_QR_CODE before requesting QR
      try { await startSession(clean); } catch { /* ignore */ }
      setQrSession(clean);
    } catch { /* toasts handled in hook */ }
  };

  const handleStart = async (name: string) => {
    try { await startSession(name); } catch { /* ignore */ }
    setQrSession(name);
  };

  const handleStop = async (name: string) => {
    await stopSession(name);
    await loadDb();
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Supprimer la session "${name}" ?`)) return;
    try {
      await deleteSession(name);
    } catch { /* ignore — may not exist server-side */ }
    if (user?.id) {
      await supabase.from("whatsapp_accounts").delete().eq("user_id", user.id).eq("session_name", name);
    }
    setActionSession(null);
    await loadDb();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background overscroll-contain">
      {/* Header */}
      <header className="shrink-0 bg-[hsl(165_91%_18%)] text-white px-4 pt-3 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">WhatsApp IA</h1>
            <p className="text-xs text-white/70">Gestion des sessions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon" variant="ghost"
              className="text-white hover:bg-white/15 h-9 w-9"
              onClick={handleRefresh}
              aria-label="Rafraîchir"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#1da851] text-white h-9"
              onClick={() => setOpenCreate(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Nouvelle
            </Button>
          </div>
        </div>
      </header>

      {/* List */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 py-4 space-y-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        {loading && merged.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
          </div>
        )}

        {!loading && merged.length === 0 && (
          <div className="text-center py-16">
            <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Aucune session WhatsApp IA</p>
            <Button onClick={() => setOpenCreate(true)} className="bg-[#25D366] hover:bg-[#1da851]">
              <Plus className="h-4 w-4 mr-1" /> Créer ma première session
            </Button>
          </div>
        )}

        {merged.map((s) => {
          const meta = statusMeta(s.status);
          const Icon = meta.icon;
          const phone = s.config?.metadata?.phone_number;
          return (
            <div
              key={s.name}
              className="rounded-2xl border bg-card p-4 active:scale-[0.99] transition"
              onClick={() => setActionSession(s.name)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {phone ? `+${phone}` : "Aucun numéro lié"}
                  </div>
                </div>
                <Badge className={`${meta.cls} gap-1 shrink-0`}>
                  <Icon className={`h-3 w-3 ${s.status === "STARTING" ? "animate-spin" : ""}`} />
                  {meta.label}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.status !== "WORKING" && (
                  <Button size="sm" variant="outline" className="h-8"
                    onClick={(e) => { e.stopPropagation(); handleStart(s.name); }}>
                    <Play className="h-3.5 w-3.5 mr-1" /> Démarrer
                  </Button>
                )}
                {(s.status === "SCAN_QR_CODE" || s.status === "STARTING") && (
                  <Button size="sm" className="h-8 bg-amber-500 hover:bg-amber-600"
                    onClick={(e) => { e.stopPropagation(); setQrSession(s.name); }}>
                    <QrCode className="h-3.5 w-3.5 mr-1" /> Scanner
                  </Button>
                )}
                {s.status === "WORKING" && (
                  <Button size="sm" className="h-8 bg-[#25D366] hover:bg-[#1da851]"
                    onClick={(e) => { e.stopPropagation(); setTestSession(s.name); }}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Tester
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 ml-auto"
                  onClick={(e) => { e.stopPropagation(); setActionSession(s.name); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </main>

      {/* Sheets */}
      <CreateSessionSheet open={openCreate} onOpenChange={setOpenCreate} onCreate={handleCreate} />
      <QrSheet
        open={!!qrSession}
        sessionName={qrSession}
        onOpenChange={(o) => { if (!o) { setQrSession(null); loadDb(); } }}
        getQRCode={getQRCode}
        startSession={startSession}
        sessions={merged}
      />
      <ActionsSheet
        open={!!actionSession}
        sessionName={actionSession}
        session={merged.find((m) => m.name === actionSession) || null}
        onOpenChange={(o) => { if (!o) setActionSession(null); }}
        onStart={(n) => { setActionSession(null); handleStart(n); }}
        onStop={(n) => { setActionSession(null); handleStop(n); }}
        onQr={(n) => { setActionSession(null); setQrSession(n); }}
        onTest={(n) => { setActionSession(null); setTestSession(n); }}
        onLink={(n) => { setActionSession(null); setLinkSession(n); }}
        onWebhook={(n) => { setActionSession(null); setWebhookSession(n); }}
        onDelete={handleDelete}
      />
      <TestMessageSheet
        open={!!testSession}
        sessionName={testSession}
        onOpenChange={(o) => { if (!o) setTestSession(null); }}
        sendTestMessage={sendTestMessage}
      />
      <LinkBotSheet
        open={!!linkSession}
        sessionName={linkSession}
        onOpenChange={(o) => { if (!o) setLinkSession(null); }}
      />
      <WebhookSheet
        open={!!webhookSession}
        sessionName={webhookSession}
        onOpenChange={(o) => { if (!o) setWebhookSession(null); }}
      />
    </div>
  );
}

// ============================================================
// Bottom sheets
// ============================================================
function SheetShell({ open, onOpenChange, title, children }: any) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] max-h-[92dvh] p-0 flex flex-col rounded-t-3xl"
      >
        <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-muted mb-3" />
          <SheetTitle className="text-left">{title}</SheetTitle>
        </SheetHeader>
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-5 py-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreateSessionSheet({ open, onOpenChange, onCreate }: any) {
  const [name, setName] = useState("");
  useEffect(() => { if (open) setName(`session-${Date.now().toString().slice(-6)}`); }, [open]);
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Nouvelle session WhatsApp IA">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Nom de la session</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: ma-boutique"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Lettres, chiffres, tirets uniquement.
          </p>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>Après création, un QR code s'affichera pour connecter votre compte WhatsApp.</p>
        </div>
        <Button
          className="w-full h-12 bg-[#25D366] hover:bg-[#1da851] text-white text-base"
          onClick={() => onCreate(name)}
        >
          <Plus className="h-4 w-4 mr-2" /> Créer la session
        </Button>
      </div>
    </SheetShell>
  );
}

function QrSheet({ open, onOpenChange, sessionName, getQRCode, startSession, sessions }: any) {
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<any>(null);
  const startedRef = useRef<string | null>(null);

  const current = sessions.find((s: WAHASession) => s.name === sessionName);
  const status = current?.status;
  const isWorking = status === "WORKING";

  const fetchQr = useCallback(async () => {
    if (!sessionName) return;
    // If session is stopped, auto-start once
    if (status === "STOPPED" && startedRef.current !== sessionName) {
      startedRef.current = sessionName;
      setBusy(true);
      setHint("Démarrage de la session…");
      try { await startSession(sessionName); } catch { /* ignore */ }
      setBusy(false);
      return; // wait for next tick / status refresh
    }
    // Only ask QR when WAHA is ready or unknown
    if (status === "STARTING") {
      setHint("Préparation de la session…");
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      const data = await getQRCode(sessionName);
      setQr(data.qr);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("422") || msg.toLowerCase().includes("status")) {
        setHint("Session pas encore prête, nouvel essai…");
      }
    } finally { setBusy(false); }
  }, [sessionName, status, getQRCode, startSession]);

  useEffect(() => {
    if (open && sessionName && !isWorking) {
      fetchQr();
      timer.current = setInterval(fetchQr, 4000);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [open, sessionName, isWorking, fetchQr]);

  useEffect(() => {
    if (!open) { setQr(null); setHint(null); startedRef.current = null; }
  }, [open]);

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Connecter WhatsApp IA">
      <div className="space-y-5">
        {isWorking ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-lg">Session connectée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Votre WhatsApp est lié et fonctionne.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr" className="gap-2">
                <QrCode className="h-4 w-4" /> QR Code
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-2">
                <KeyRound className="h-4 w-4" /> Code à 8 chiffres
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-4 space-y-4">
              <div className="bg-white rounded-2xl p-6 flex items-center justify-center min-h-[300px] border-2 border-dashed">
                {qr ? (
                  <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
                    alt="QR WhatsApp" className="w-64 h-64 object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground text-sm">
                    {busy || hint ? (
                      <>
                        <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" />
                        <p>{hint ?? "Récupération du QR…"}</p>
                      </>
                    ) : (
                      <>
                        <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>QR indisponible</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-2">Comment scanner :</p>
                <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Ouvrez WhatsApp sur votre téléphone</li>
                  <li>Menu → Appareils connectés</li>
                  <li>Touchez "Connecter un appareil"</li>
                  <li>Scannez ce code</li>
                </ol>
              </div>
              <Button variant="outline" className="w-full h-11" onClick={fetchQr} disabled={busy}>
                <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} />
                Régénérer le QR
              </Button>
            </TabsContent>

            <TabsContent value="code" className="mt-4">
              <PairCodeFlow
                sessionName={sessionName}
                onConnected={() => setTimeout(() => onOpenChange(false), 2500)}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </SheetShell>
  );
}


function ActionsSheet({ open, onOpenChange, sessionName, session, onStart, onStop, onQr, onTest, onLink, onWebhook, onDelete }: any) {
  if (!sessionName) return null;
  const isWorking = session?.status === "WORKING";
  const meta = statusMeta(session?.status);
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title={sessionName}>
      <div className="space-y-3">
        <div className="rounded-xl border p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Statut</div>
            <div className="font-medium">{meta.label}</div>
          </div>
          <Badge className={meta.cls}>{session?.status}</Badge>
        </div>

        <ActionRow icon={QrCode} label="Voir / Scanner QR" onClick={() => onQr(sessionName)} />
        {!isWorking && <ActionRow icon={Play} label="Démarrer" onClick={() => onStart(sessionName)} />}
        {isWorking && <ActionRow icon={Square} label="Arrêter" onClick={() => onStop(sessionName)} />}
        {isWorking && <ActionRow icon={Send} label="Envoyer un message test" onClick={() => onTest(sessionName)} />}
        <ActionRow icon={Link2} label="Lier à un bot" onClick={() => onLink(sessionName)} />
        <ActionRow icon={Webhook} label="Configurer webhook" onClick={() => onWebhook(sessionName)} />
        <ActionRow icon={Trash2} label="Supprimer la session" danger onClick={() => onDelete(sessionName)} />
      </div>
    </SheetShell>
  );
}

function ActionRow({ icon: Icon, label, onClick, danger }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl border p-4 active:scale-[0.99] transition text-left ${
        danger ? "text-red-600 border-red-200" : ""
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function TestMessageSheet({ open, onOpenChange, sessionName, sendTestMessage }: any) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Bonjour ! Ceci est un message test depuis bot.bj 🤖");
  const [sending, setSending] = useState(false);

  useEffect(() => { if (!open) { setPhone(""); } }, [open]);

  const send = async () => {
    if (!sessionName || !phone || !message) return;
    const clean = phone.replace(/\s+/g, "");
    const to = clean.startsWith("+") ? `${clean.slice(1)}@c.us` : `${clean}@c.us`;
    setSending(true);
    try {
      await sendTestMessage(sessionName, to, message);
      onOpenChange(false);
    } finally { setSending(false); }
  };

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Message test">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Destinataire</label>
          <PhoneBjInput value={phone} onChange={setPhone} placeholder="Numéro WhatsApp" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Message</label>
          <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <Button
          className="w-full h-12 bg-[#25D366] hover:bg-[#1da851]"
          disabled={sending || !phone || !message}
          onClick={send}
        >
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Envoyer
        </Button>
      </div>
    </SheetShell>
  );
}

function LinkBotSheet({ open, onOpenChange, sessionName }: any) {
  const { bots, loadingBots } = useBots();
  const [selected, setSelected] = useState<string>("");
  const [linking, setLinking] = useState(false);

  useEffect(() => { if (!open) setSelected(""); }, [open]);

  const link = async () => {
    if (!selected || !sessionName) return;
    setLinking(true);
    try {
      const bot = bots.find((b: any) => b.id === selected);
      const { data: botData } = await supabase.from("bots").select("webhook_url").eq("id", selected).single();
      const webhookUrl = botData?.webhook_url || `https://bot.bj/api/webhook/${selected}`;
      const { data: cfg, error: ge } = await supabase.functions.invoke("waha-dashboard-proxy", {
        body: { path: `/api/sessions/${sessionName}`, method: "GET" },
      });
      if (ge) throw new Error(ge.message);
      const existing = cfg?.config?.webhooks ?? [];
      const updated = {
        name: sessionName,
        config: {
          ...cfg?.config,
          webhooks: [...existing, {
            url: webhookUrl,
            events: ["message", "message.reaction", "message.status", "session.status"],
            hmac: false, retries: 3,
          }],
        },
      };
      const { error: ue } = await supabase.functions.invoke("waha-dashboard-proxy", {
        body: { path: `/api/sessions/${sessionName}`, method: "PUT", body: updated },
      });
      if (ue) throw new Error(ue.message);
      toast.success(`Bot "${bot?.name}" lié à ${sessionName}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du liage");
    } finally { setLinking(false); }
  };

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Lier un bot">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Le bot recevra les messages entrants de la session <b>{sessionName}</b>.
        </p>
        {loadingBots ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : bots.length === 0 ? (
          <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground text-center">
            Aucun bot disponible. Créez-en un d'abord.
          </div>
        ) : (
          <div className="space-y-2">
            {bots.map((b: any) => (
              <button
                key={b.id}
                onClick={() => setSelected(b.id)}
                className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left active:scale-[0.99] transition ${
                  selected === b.id ? "border-[#25D366] bg-[#25D366]/5" : ""
                }`}
              >
                <Bot className="h-5 w-5 text-[#25D366]" />
                <span className="flex-1 font-medium">{b.name}</span>
                {selected === b.id && <CheckCircle2 className="h-5 w-5 text-[#25D366]" />}
              </button>
            ))}
          </div>
        )}
        <Button
          className="w-full h-12 bg-[#25D366] hover:bg-[#1da851]"
          disabled={!selected || linking}
          onClick={link}
        >
          {linking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
          Lier le bot
        </Button>
      </div>
    </SheetShell>
  );
}

function WebhookSheet({ open, onOpenChange, sessionName }: any) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) setUrl(""); }, [open]);

  const save = async () => {
    if (!url || !sessionName) return;
    setSaving(true);
    try {
      const { data: cfg } = await supabase.functions.invoke("waha-dashboard-proxy", {
        body: { path: `/api/sessions/${sessionName}`, method: "GET" },
      });
      const existing = cfg?.config?.webhooks ?? [];
      const { error } = await supabase.functions.invoke("waha-dashboard-proxy", {
        body: {
          path: `/api/sessions/${sessionName}`, method: "PUT",
          body: {
            name: sessionName,
            config: {
              ...cfg?.config,
              webhooks: [...existing, {
                url,
                events: ["message", "message.status", "session.status"],
                hmac: false, retries: 3,
              }],
            },
          },
        },
      });
      if (error) throw new Error(error.message);
      toast.success("Webhook ajouté");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally { setSaving(false); }
  };

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Configurer webhook">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">URL du webhook</label>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhook"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Cette URL recevra les événements <code>message</code>, <code>status</code>, etc.
          </p>
        </div>
        <Button
          className="w-full h-12 bg-[#25D366] hover:bg-[#1da851]"
          disabled={!url || saving}
          onClick={save}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Webhook className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>
    </SheetShell>
  );
}
