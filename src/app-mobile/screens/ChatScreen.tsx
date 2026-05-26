import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { markConversationRead } from "../hooks/useUnreadCounts";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  direction: "in" | "out" | string;
  text: string | null;
  created_at: string;
};

export default function ChatScreen() {
  const { id: convId } = useParams();
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [meta, setMeta] = useState<{ phone_number: string | null; channel: string | null } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!convId || !user) return;
    let mounted = true;
    (async () => {
      const [{ data: c }, { data: m }] = await Promise.all([
        supabase.from("waouh_conversations").select("phone_number,channel").eq("id", convId).maybeSingle(),
        supabase.from("waouh_messages").select("id,direction,text,created_at").eq("conversation_id", convId).order("created_at"),
      ]);
      if (!mounted) return;
      setMeta(c as any);
      setMsgs((m as any) ?? []);
    })();
    const ch = supabase.channel(`mobile-conv-${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_messages", filter: `conversation_id=eq.${convId}` },
        (p) => setMsgs((cur) => [...cur, p.new as any]))
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [convId, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const send = async () => {
    if (!text.trim() || !convId || !user) return;
    setSending(true);
    const body = text.trim();
    setText("");
    try {
      await supabase.from("waouh_messages").insert({
        conversation_id: convId,
        user_id: user.id,
        phone_number: meta?.phone_number ?? null,
        channel: meta?.channel ?? "web",
        direction: "out",
        text: body,
      });
      await supabase.from("waouh_conversations").update({ last_message: body, updated_at: new Date().toISOString() }).eq("id", convId);
      // If WhatsApp channel, try to send via WAHA
      if (meta?.channel === "whatsapp" && meta?.phone_number) {
        await supabase.functions.invoke("waha-send-message", {
          body: { sessionName: "default", to: meta.phone_number.replace(/^\+/, ""), message: body },
        }).catch(() => {});
      }
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#ECE5DD] dark:bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-2 py-2 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/chat")} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{meta?.phone_number ?? "Conversation"}</div>
          <div className="text-xs text-white/70">{meta?.channel ?? ""}</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {msgs.map(m => (
          <div key={m.id} className={cn("flex", m.direction === "out" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[78%] rounded-lg px-3 py-2 text-sm shadow-sm",
              m.direction === "out" ? "bg-[#DCF8C6] dark:bg-primary/20 text-foreground rounded-br-sm" : "bg-white dark:bg-card text-foreground rounded-bl-sm"
            )}>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </main>

      <footer className="bg-background border-t p-2 flex items-end gap-2 sticky bottom-0">
        <Button variant="ghost" size="icon"><Paperclip /></Button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message"
          rows={1}
          className="flex-1 resize-none rounded-2xl border bg-muted px-3 py-2 text-sm max-h-32 outline-none"
        />
        <Button onClick={send} disabled={sending || !text.trim()} size="icon" className="bg-[#25D366] hover:bg-[#1da851] text-white rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}
