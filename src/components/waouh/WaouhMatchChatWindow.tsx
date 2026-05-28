import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, X, ChevronUp, ChevronDown, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatImage } from "@/app-mobile/components/ChatImage";
import { cn } from "@/lib/utils";

export type MatchChatMeta = {
  key: string; // unique key (article_id or negotiation_id)
  article_id: string | null;
  title: string;
  price: number | null;
  city?: string | null;
  photo?: string | null;
  kind: "buyer" | "seller"; // role of the user in this match
};

type Msg = {
  id: string;
  direction: "in" | "out";
  text: string;
  created_at: string;
  attachments?: any;
};

export function WaouhMatchChatWindow({
  match,
  sessionId,
  waouhIds,
  onClose,
}: {
  match: MatchChatMeta;
  sessionId: string;
  waouhIds: string[];
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages tied to this article for this user.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!match.article_id) return;
      const ors: string[] = [`web_session_id.eq.${sessionId}`];
      if (waouhIds.length) ors.push(`user_id.in.(${waouhIds.join(",")})`);
      const { data } = await supabase
        .from("waouh_messages")
        .select("id,direction,text,created_at,attachments,meta")
        .or(ors.join(","))
        .order("created_at", { ascending: true })
        .limit(200);
      if (!active) return;
      const filtered = (data ?? []).filter((m: any) => {
        const aid = m.meta?.article_id;
        if (aid && aid === match.article_id) return true;
        // Match by mentions of article title fallback
        return false;
      });
      setMessages(filtered as any);
    })();
    return () => {
      active = false;
    };
  }, [match.article_id, sessionId, waouhIds.join(",")]);

  // Realtime: append any new message tagged with this article
  useEffect(() => {
    if (!match.article_id) return;
    const suffix = Math.random().toString(36).slice(2, 6);
    const ch = supabase
      .channel(`match_${match.key}_${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waouh_messages", filter: `web_session_id=eq.${sessionId}` },
        (payload: any) => {
          const m = payload.new;
          if (m?.meta?.article_id !== match.article_id) return;
          setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [match.article_id, sessionId, match.key]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    setMessages((prev) => [...prev, { id: tempId, direction: "in", text, created_at: now }]);
    setInput("");
    try {
      const contextPrefix = match.kind === "buyer" ? `[Annonce ${match.title}] ` : `[Acheteur ${match.title}] `;
      const { data } = await supabase.functions.invoke("waouh-channel-in", {
        body: {
          channel: "web",
          sessionId,
          text: contextPrefix + text,
          attachments: [],
          authUserId: null,
        },
      });
      const realId = (data as any)?.inbound_message_id;
      setMessages((prev) => {
        const f = prev.filter((m) => m.id !== tempId);
        if (realId && !f.some((m) => m.id === realId)) {
          f.push({ id: realId, direction: "in", text, created_at: now });
        }
        if ((data as any)?.reply) {
          f.push({
            id: `temp-out-${Date.now()}`,
            direction: "out",
            text: (data as any).reply,
            created_at: new Date().toISOString(),
          });
        }
        return f;
      });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="w-full border shadow-md overflow-hidden mb-2">
      <div className="flex items-center justify-between gap-2 p-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
        >
          {match.photo ? (
            <img src={match.photo} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">
              {match.kind === "buyer" ? "🎯 " : "🛒 "}
              {match.title}
            </div>
            <div className="text-[10px] opacity-90 truncate">
              {match.price ? `${Number(match.price).toLocaleString("fr-FR")} FCFA` : ""}
              {match.city ? ` · ${match.city}` : ""}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {open && (
        <>
          <div ref={scrollRef} className="max-h-[40vh] overflow-y-auto p-2 space-y-1.5 bg-muted/30">
            {messages.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                Démarrez la discussion avec {match.kind === "buyer" ? "le vendeur" : "l'acheteur"}.
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm break-words",
                  m.direction === "in"
                    ? "ml-auto bg-emerald-600 text-white"
                    : "mr-auto bg-card border"
                )}
              >
                {Array.isArray(m.attachments) &&
                  m.attachments.map((a: any, i: number) => (
                    <ChatImage key={i} src={a.url} alt="" className="rounded mb-1 max-h-40" />
                  ))}
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-1.5 p-2 border-t bg-background">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Votre message…"
              rows={1}
              className="resize-none min-h-[36px] max-h-24 text-sm"
            />
            <Button size="icon" onClick={send} disabled={sending || !input.trim()} className="h-9 w-9 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
