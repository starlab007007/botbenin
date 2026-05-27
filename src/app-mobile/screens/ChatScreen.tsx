import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useWaouhIdentity } from "../hooks/useWaouhIdentity";
import { markConversationRead } from "../hooks/useUnreadCounts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { formatConvLabel, channelBadge, type WaouhUserLike } from "../utils/chatLabel";
import { buildChatGroups } from "../utils/chatGrouping";
import { ChatBubble } from "../components/ChatBubble";
import { ChatDaySeparator } from "../components/ChatDaySeparator";
import { ChatImage } from "../components/ChatImage";

type Att = { url: string; caption?: string | null; type?: string | null };
type Msg = {
  id: string;
  direction: "in" | "out" | string;
  text: string | null;
  created_at: string;
  attachments?: Att[] | null;
};

const IMG_URL_RE = /(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|bmp|svg|avif)(?:\?[^\s]*)?)/gi;
function extractImageUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(IMG_URL_RE.source, "gi");
  while ((m = re.exec(text))) out.add(m[1]);
  return Array.from(out);
}
function stripImageUrls(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(IMG_URL_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

type ConvMeta = {
  id: string;
  phone_number: string | null;
  channel: string | null;
  user_id: string | null;
};

export default function ChatScreen() {
  const { id: convId } = useParams();
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const { sessionId } = useWaouhIdentity();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [meta, setMeta] = useState<ConvMeta | null>(null);
  const [convUser, setConvUser] = useState<WaouhUserLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAtts, setPendingAtts] = useState<Att[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!convId) return;
    let mounted = true;

    (async () => {
      const { data: c } = await supabase
        .from("waouh_conversations")
        .select("id,phone_number,channel,user_id")
        .eq("id", convId)
        .maybeSingle();
      if (!mounted) return;
      const conv = (c as ConvMeta) ?? null;
      setMeta(conv);

      // user metadata for header label
      if (conv?.user_id) {
        const { data: u } = await supabase
          .from("waouh_users")
          .select("id,display_name,phone_number,channel,auth_user_id")
          .eq("id", conv.user_id)
          .maybeSingle();
        if (mounted) setConvUser((u as WaouhUserLike) ?? null);
      }

      // Run inclusive queries in parallel — covers legacy rows missing conversation_id.
      const webSessionMatch = conv?.phone_number?.startsWith("web:") ? conv.phone_number.slice(4) : null;
      const queries: Promise<{ data: any[] | null }>[] = [
        supabase.from("waouh_messages").select("id,direction,text,created_at,attachments").eq("conversation_id", convId).order("created_at", { ascending: true }).limit(500) as any,
      ];
      if (conv?.phone_number) queries.push(supabase.from("waouh_messages").select("id,direction,text,created_at,attachments").eq("phone_number", conv.phone_number).order("created_at", { ascending: true }).limit(500) as any);
      if (conv?.user_id) queries.push(supabase.from("waouh_messages").select("id,direction,text,created_at,attachments").eq("user_id", conv.user_id).order("created_at", { ascending: true }).limit(500) as any);
      if (webSessionMatch) queries.push(supabase.from("waouh_messages").select("id,direction,text,created_at,attachments").eq("web_session_id", webSessionMatch).order("created_at", { ascending: true }).limit(500) as any);
      const results = await Promise.all(queries);
      if (!mounted) return;
      const seen = new Set<string>();
      const unique: any[] = [];
      results.forEach(({ data }) => {
        (data ?? []).forEach((x: any) => { if (!seen.has(x.id)) { seen.add(x.id); unique.push(x); } });
      });
      unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMsgs(unique);
      setLoading(false);
      markConversationRead(convId);
    })().catch(() => { if (mounted) setLoading(false); });

    const suffix = Math.random().toString(36).slice(2, 6);
    const onInsert = (p: any) => {
      const m = p.new as any;
      setMsgs((cur) => (cur.find((x) => x.id === m.id) ? cur : [...cur, m]));
      markConversationRead(convId);
    };
    const ch = supabase
      .channel(`mobile-conv-${convId}-${suffix}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_messages", filter: `conversation_id=eq.${convId}` }, onInsert)
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [convId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: msgs.length > 30 ? "auto" : "smooth" }); }, [msgs.length]);

  const headerLabel = useMemo(
    () => (meta ? formatConvLabel(meta, convUser) : "Conversation"),
    [meta, convUser]
  );
  const headerBadge = useMemo(
    () => channelBadge(meta?.channel ?? convUser?.channel),
    [meta, convUser]
  );

  const send = async () => {
    if (!text.trim() || !convId) return;
    setSending(true);
    const body = text.trim();
    setText("");
    try {
      const channel = meta?.channel ?? "web";
      await supabase.from("waouh_messages").insert({
        conversation_id: convId,
        user_id: meta?.user_id ?? null,
        phone_number: meta?.phone_number ?? null,
        channel,
        direction: "out",
        text: body,
        web_session_id: channel === "web" ? sessionId : null,
      });
      await supabase
        .from("waouh_conversations")
        .update({ last_message: body, updated_at: new Date().toISOString() })
        .eq("id", convId);

      if (channel === "whatsapp" && meta?.phone_number) {
        await supabase.functions
          .invoke("waha-send-message", {
            body: { sessionName: "default", to: meta.phone_number.replace(/^\+/, ""), message: body },
          })
          .catch(() => {});
      } else {
        // Web / app → ask the WAOUH bot to reply
        await supabase.functions
          .invoke("waouh-webhook", {
            body: {
              phone_number: meta?.phone_number ?? `web:${sessionId}`,
              text: body,
              channel,
              conversation_id: convId,
              web_session_id: channel === "web" ? sessionId : undefined,
            },
          })
          .catch(() => {});
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col waouh-chat-bg">
      <header className="bg-[hsl(165_91%_18%)] text-white px-2 py-2 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/chat")} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-2">
            {headerLabel}
            <Badge className={`${headerBadge.tint} border-0 text-[9px] py-0 px-1.5 h-4`}>{headerBadge.label}</Badge>
          </div>
          <div className="text-xs text-white/70 truncate">{meta?.phone_number ?? ""}</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-3">
        {loading && msgs.length === 0 && (
          <div className="space-y-3 py-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                <div className={`chat-bubble ${i % 2 ? "chat-bubble-out" : "chat-bubble-in"} animate-pulse`} style={{ width: `${50 + (i * 7) % 30}%`, height: 38 }} />
              </div>
            ))}
          </div>
        )}
        {!loading && msgs.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Aucun message pour l'instant. Écrivez un message pour démarrer.
          </div>
        )}
        {buildChatGroups(msgs).map((it) =>
          it.kind === "day" ? (
            <ChatDaySeparator key={it.key} label={it.label} />
          ) : (
            (() => {
              const m: any = it.msg;
              const atts: Att[] = Array.isArray(m.attachments) ? m.attachments.filter((a: any) => a && a.url) : [];
              const inlineImgs = extractImageUrls(m.text);
              const gallery: { url: string; caption?: string }[] = [
                ...atts.map((a) => ({ url: a.url, caption: a.caption || undefined })),
                ...inlineImgs.map((u) => ({ url: u, caption: undefined as string | undefined })),
              ];
              const cleanText = inlineImgs.length ? stripImageUrls(m.text) : (m.text ?? "");
              return (
                <ChatBubble
                  key={it.key}
                  direction={it.msg.direction}
                  createdAt={it.msg.created_at}
                  grouped={it.grouped}
                  showMeta={it.showMeta}
                >
                  {gallery.length > 0 && (
                    <div className={`grid gap-1.5 ${cleanText ? "mb-2" : ""} ${gallery.length === 1 ? "grid-cols-1" : gallery.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {gallery.map((g, i) => (
                        <ChatImage
                          key={`${m.id}-img-${i}`}
                          src={g.url}
                          caption={g.caption}
                          gallery={gallery}
                          index={i}
                          imgClassName={gallery.length === 1 ? "max-h-72" : "aspect-square"}
                        />
                      ))}
                    </div>
                  )}
                  {cleanText && <p className="whitespace-pre-wrap">{cleanText}</p>}
                </ChatBubble>
              );
            })()
          )
        )}
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
