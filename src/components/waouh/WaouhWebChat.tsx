import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send, X, Loader2, Paperclip, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useWaouhGeolocation } from "@/hooks/useWaouhGeolocation";
import { WaouhCityBadge } from "./WaouhCityBadge";
import { WaouhTransactionCard } from "./WaouhTransactionCard";
import { WaouhAuthGate } from "./WaouhAuthGate";
import { WaouhPaymentDialog } from "./WaouhPaymentDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Att = { url: string; type: string };
type Msg = {
  id: string;
  direction: "in" | "out";
  text: string;
  created_at: string;
  attachments?: Att[] | null;
  meta?: { transaction_id?: string | null; intent?: string | null } | null;
};

const SESSION_KEY = "waouh_web_session_id";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto as any).randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export const WaouhWebChat: React.FC<{ embedded?: boolean; fullscreen?: boolean }> = ({ embedded = false, fullscreen = false }) => {
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAtts, setPendingAtts] = useState<Att[]>([]);
  const [uploading, setUploading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const sessionId = useRef(getSessionId()).current;
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { geo, loading: geoLoading, setCity, refresh } = useWaouhGeolocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Load history + realtime
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("waouh_messages")
        .select("id,direction,text,created_at,attachments,meta")
        .eq("web_session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (active && data) setMessages(data as any);
    })();

    const ch = supabase
      .channel(`waouh_msgs_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waouh_messages", filter: `web_session_id=eq.${sessionId}` },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [open, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const MAX_PHOTOS = 2;
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = MAX_PHOTOS - pendingAtts.length;
    if (remaining <= 0) {
      toast({ title: "Limite atteinte", description: `Maximum ${MAX_PHOTOS} photos par annonce.`, variant: "destructive" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    try {
      for (const file of toUpload) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `web/${sessionId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("waouh-uploads").upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("waouh-uploads").getPublicUrl(path);
        setPendingAtts((prev) => [...prev, { url: pub.publicUrl, type: file.type }]);
      }
      if (files.length > remaining) {
        toast({ title: "Photos limitées", description: `Seules ${remaining} photo(s) ajoutées (max ${MAX_PHOTOS}).` });
      }
    } catch (err: any) {
      toast({ title: "Upload échoué", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && pendingAtts.length === 0) || sending) return;
    setInput("");
    const atts = pendingAtts;
    setPendingAtts([]);
    setSending(true);
    const now = new Date().toISOString();
    const tempInId = `temp-in-${Date.now()}`;
    const tempOutId = `temp-out-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempInId,
        direction: "in",
        text: text || "(image)",
        created_at: now,
        attachments: atts,
      },
    ]);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-channel-in", {
        body: {
          channel: "web",
          sessionId,
          text,
          attachments: atts,
          lat: geo.lat,
          lng: geo.lng,
          city: geo.city,
          authUserId: user?.id ?? null,
        },
      });
      if (error) throw error;

      const { data: fresh } = await supabase
        .from("waouh_messages")
        .select("id,direction,text,created_at,attachments,meta")
        .eq("web_session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (fresh && fresh.length > 0) {
        setMessages(fresh as any);
      } else if ((data as any)?.reply) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempOutId),
          {
            id: tempOutId,
            direction: "out",
            text: (data as any).reply,
            created_at: new Date().toISOString(),
            attachments: null,
            meta: {
              intent: (data as any).intent ?? null,
              transaction_id: (data as any).transaction_id ?? null,
            },
          },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempInId && m.id !== tempOutId));
      setInput(text);
      setPendingAtts(atts);
      toast({ title: "Envoi échoué", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const [paymentTx, setPaymentTx] = useState<{ id: string; amount: number } | null>(null);
  const onPay = (tx: any) => {
    if (!user) {
      setAuthOpen(true);
    } else {
      setPaymentTx({ id: tx.id, amount: tx.amount });
    }
  };

  const Panel = (
    <Card
      className={cn(
        "flex flex-col bg-background overflow-hidden",
        fullscreen
          ? "w-full h-full rounded-none border-0 shadow-none pb-[env(safe-area-inset-bottom)]"
          : embedded
            ? "w-full h-[70vh] max-h-[100dvh] rounded-lg border shadow-2xl"
            : "fixed bottom-20 right-4 w-[92vw] sm:w-[400px] h-[70vh] max-h-[100dvh] rounded-2xl z-50 border shadow-2xl"
      )}
    >
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <div className="font-semibold leading-tight">WAOUH</div>
            <div className="text-xs opacity-90">Achetez · Vendez · Négociez · Payez</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WaouhCityBadge geo={geo} loading={geoLoading} onSetCity={setCity} onRefresh={refresh} compact />
          {!embedded && (
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8 px-4">
            👋 Bonjour ! Tapez « Je vends ... » ou « Je cherche ... » pour démarrer.
            <br />📍 Annonces proposées autour de <strong>{geo.city}</strong>.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id}>
            <div className={cn("flex", m.direction === "in" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm prose prose-sm dark:prose-invert prose-p:my-1",
                  m.direction === "in"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border rounded-bl-sm"
                )}
              >
                {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 mb-1 not-prose">
                    {m.attachments.map((a, i) => (
                      <img key={i} src={a.url} alt="" loading="lazy" className="rounded-md max-h-40 object-cover w-full" />
                    ))}
                  </div>
                )}
                {m.text && m.text !== "(image)" && <ReactMarkdown>{m.text}</ReactMarkdown>}
              </div>
            </div>
            {m.meta?.transaction_id && (
              <div className="flex justify-start mt-1">
                <WaouhTransactionCard transactionId={m.meta.transaction_id} onPay={onPay} />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-2xl px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> WAOUH réfléchit…
            </div>
          </div>
        )}
      </div>

      {pendingAtts.length > 0 && (
        <div className="px-2 pt-2 flex gap-2 border-t bg-muted/20">
          {pendingAtts.map((a, i) => (
            <div key={i} className="relative">
              <img src={a.url} className="w-14 h-14 rounded-md object-cover border" alt="" />
              <button
                type="button"
                onClick={() => setPendingAtts((p) => p.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] leading-none"
              >×</button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 p-2 border-t bg-background"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || sending || pendingAtts.length >= MAX_PHOTOS}
          aria-label={`Ajouter une photo (${pendingAtts.length}/${MAX_PHOTOS})`}
          title={`${pendingAtts.length}/${MAX_PHOTOS} photos`}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message…"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || (!input.trim() && pendingAtts.length === 0)}>
          <Send className="w-4 h-4" />
        </Button>
      </form>

      <WaouhAuthGate open={authOpen} onOpenChange={setAuthOpen} sessionId={sessionId} />
      {paymentTx && (
        <WaouhPaymentDialog
          open={!!paymentTx}
          onOpenChange={(v) => !v && setPaymentTx(null)}
          transactionId={paymentTx.id}
          amount={paymentTx.amount}
        />
      )}
    </Card>
  );

  if (embedded || fullscreen) return Panel;

  return (
    <>
      {open && Panel}
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-cyan-500 to-blue-500 hover:scale-105 transition z-50"
        aria-label="Ouvrir WAOUH"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>
    </>
  );
};

export default WaouhWebChat;
