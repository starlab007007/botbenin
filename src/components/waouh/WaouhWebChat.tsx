import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send, X, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Msg = { id: string; direction: "in" | "out"; text: string; created_at: string };

const SESSION_KEY = "waouh_web_session_id";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto as any).randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface Props {
  embedded?: boolean; // si true, rendu inline (pas de bulle flottante)
}

export const WaouhWebChat: React.FC<Props> = ({ embedded = false }) => {
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const sessionId = useRef(getSessionId()).current;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Geoloc
  useEffect(() => {
    if (!open || coords) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 6.36, lng: 2.42 }),
      { timeout: 5000 }
    );
  }, [open, coords]);

  // Load history + realtime
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("waouh_messages")
        .select("id,direction,text,created_at")
        .eq("web_session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (active && data) setMessages(data as Msg[]);
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

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [open, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      await supabase.functions.invoke("waouh-channel-in", {
        body: {
          channel: "web",
          sessionId,
          text,
          lat: coords?.lat ?? 6.36,
          lng: coords?.lng ?? 2.42,
          city: "Cotonou",
        },
      });
    } finally {
      setSending(false);
    }
  };

  const Panel = (
    <Card
      className={cn(
        "flex flex-col bg-background border shadow-2xl overflow-hidden",
        embedded
          ? "w-full h-[70vh] max-h-[100dvh] rounded-lg"
          : "fixed bottom-20 right-4 w-[92vw] sm:w-[400px] h-[70vh] max-h-[100dvh] rounded-2xl z-50"
      )}
    >
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <div className="font-semibold leading-tight">WAOUH</div>
            <div className="text-xs opacity-80 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {coords ? `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}` : "Cotonou"}
            </div>
          </div>
        </div>
        {!embedded && (
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            👋 Bonjour ! Tapez "Je vends ..." ou "Je cherche ..." pour démarrer.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.direction === "in" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm prose prose-sm dark:prose-invert prose-p:my-1",
                m.direction === "in"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border rounded-bl-sm"
              )}
            >
              <ReactMarkdown>{m.text}</ReactMarkdown>
            </div>
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

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 p-2 border-t bg-background"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message…"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );

  if (embedded) return Panel;

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
