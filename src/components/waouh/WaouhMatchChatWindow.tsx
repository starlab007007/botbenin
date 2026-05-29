import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ShoppingBag, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatImage } from "@/app-mobile/components/ChatImage";
import { cn } from "@/lib/utils";
import { formatMatchLabel } from "@/app-mobile/utils/chatLabel";

export type MatchChatMeta = {
  key: string;
  article_id: string | null;
  buyer_profile_id?: string | null;
  counterpart_user_id?: string | null;
  title: string;
  price: number | null;
  city?: string | null;
  photo?: string | null;
  kind: "buyer" | "seller";
};

type Msg = {
  id: string;
  direction: "in" | "out";
  text: string;
  created_at: string;
  attachments?: any;
};

/**
 * Full-screen match chat — fills parent flex container exactly like the main
 * WAOUH chat (no card chrome, auto-grow textarea, multi-line composer).
 */
export function WaouhMatchChatWindow({
  match,
  sessionId,
  waouhIds,
  active,
}: {
  match: MatchChatMeta;
  sessionId: string;
  waouhIds: string[];
  active: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!match.article_id) return;
      const ors: string[] = [`web_session_id.eq.${sessionId}`];
      if (waouhIds.length) ors.push(`user_id.in.(${waouhIds.join(",")})`);
      const { data } = await (supabase
        .from("waouh_messages") as any)
        .select("id,direction,text,created_at,attachments,meta,article_id")
        .eq("article_id", match.article_id)
        .or(ors.join(","))
        .order("created_at", { ascending: true })
        .limit(300);
      if (!alive) return;
      setMessages((data ?? []) as any);
    })();
    return () => {
      alive = false;
    };
  }, [match.article_id, sessionId, waouhIds.join(",")]);

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
          if (m?.article_id !== match.article_id && m?.meta?.article_id !== match.article_id) return;
          setMessages((prev) => {
            // Dedup by id
            if (prev.find((x) => x.id === m.id)) return prev;
            // Dedup optimistic temp by signature (same direction + text within 10s)
            const tempIdx = prev.findIndex(
              (x) =>
                x.id.startsWith("temp-") &&
                x.direction === m.direction &&
                x.text === m.text &&
                Math.abs(new Date(x.created_at).getTime() - new Date(m.created_at).getTime()) < 10000
            );
            if (tempIdx >= 0) {
              const copy = [...prev];
              copy[tempIdx] = m;
              return copy;
            }
            return [...prev, m];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [match.article_id, sessionId, match.key]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (active) {
      setTimeout(() => textareaRef.current?.focus(), 50);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [active]);

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
      const invokeP = supabase.functions.invoke("waouh-channel-in", {
        body: {
          channel: "web",
          sessionId,
          text: contextPrefix + text,
          attachments: [],
          authUserId: null,
          meta: {
            article_id: match.article_id,
            buyer_profile_id: match.buyer_profile_id ?? null,
            counterpart_user_id: match.counterpart_user_id ?? null,
            role: match.kind,
          },
        },
      });
      const timeoutP = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 20000)
      );
      const { data } = (await Promise.race([invokeP, timeoutP])) as any;
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
      // Bump inbox ordering
      window.dispatchEvent(
        new CustomEvent("waouh:match-updated", { detail: { article_id: match.article_id } })
      );
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text); // restore so user can retry
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 30);
    }
  };

  const Icon = match.kind === "buyer" ? Target : ShoppingBag;
  const matchLabel = formatMatchLabel({
    articleId: match.article_id,
    userKey: match.buyer_profile_id || match.counterpart_user_id || sessionId,
    role: match.kind,
  });

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Sub-header with product info */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shrink-0">
        {match.photo ? (
          <img src={match.photo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider opacity-80 font-mono">{matchLabel}</div>
          <div className="text-sm font-semibold truncate">{match.title}</div>
          <div className="text-[11px] opacity-90 truncate">
            {match.price ? `${Number(match.price).toLocaleString("fr-FR")} FCFA` : ""}
            {match.city ? ` · ${match.city}` : ""}
            {" · "}
            {match.kind === "buyer" ? "Discutez avec le vendeur" : "Discutez avec l'acheteur"}
          </div>
        </div>
      </div>

      {/* Messages area — fills */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-muted/20">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-12 px-6">
            Démarrez la discussion avec {match.kind === "buyer" ? "le vendeur" : "l'acheteur"} à propos de
            <span className="block font-semibold text-foreground mt-1">{match.title}</span>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words shadow-sm",
              m.direction === "in"
                ? "ml-auto bg-emerald-600 text-white rounded-br-sm"
                : "mr-auto bg-card border rounded-bl-sm"
            )}
          >
            {Array.isArray(m.attachments) &&
              m.attachments.map((a: any, i: number) => (
                <ChatImage key={i} src={a.url} alt="" className="rounded-lg mb-1 max-h-60" />
              ))}
            <div className="whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>

      {/* Composer — same look as main WAOUH */}
      <div
        className="flex items-end gap-2 p-2 border-t bg-background shrink-0"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      >
        <Textarea
          ref={textareaRef}
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
          className="resize-none min-h-[40px] max-h-32 text-sm flex-1 rounded-2xl"
        />
        <Button
          size="icon"
          onClick={send}
          disabled={sending || !input.trim()}
          className="h-10 w-10 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
