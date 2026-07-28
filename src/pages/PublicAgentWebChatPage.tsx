import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react";

const PUBLIC_AGENT_API_BASE =
  "https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/a";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

type PublicMedia = {
  type?: string;
  filename?: string;
  mime_type?: string;
  url?: string;
  caption?: string;
};

type FeaturedItem = {
  id: string;
  name: string;
  kind?: string;
  category?: string;
  description?: string;
  price?: number | null;
  duration?: string;
  format?: string;
  media?: PublicMedia[];
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  media: PublicMedia[];
};

type BootstrapPayload = {
  ok: boolean;
  agent: { name: string; subtitle?: string };
  suggestions?: string[];
  featured?: FeaturedItem[];
  welcome?: string;
  welcome_media?: PublicMedia[];
};

type PublicAgentWebChatPageProps = {
  slug: string;
};

function randomSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
}

function mediaKind(media: PublicMedia) {
  const mime = media.mime_type ?? "";
  if (media.type === "image" || mime.startsWith("image/")) return "image";
  if (media.type === "video" || mime.startsWith("video/")) return "video";
  if (media.type === "audio" || mime.startsWith("audio/")) return "audio";
  return "document";
}

function PublicMediaGallery({ media, featured = false }: { media: PublicMedia[]; featured?: boolean }) {
  const visible = media.filter((item) => Boolean(item.url));
  if (!visible.length) return null;

  return (
    <div
      className={`grid gap-2 overflow-hidden ${
        visible.length === 1 || featured ? "grid-cols-1" : "grid-cols-2"
      }`}
    >
      {visible.map((item, index) => {
        const kind = mediaKind(item);
        const key = `${item.url}-${index}`;
        const caption = item.caption || item.filename || "Média associé";

        if (kind === "image") {
          return (
            <a
              key={key}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-2xl bg-emerald-50"
            >
              <img
                src={item.url}
                alt={caption}
                loading="lazy"
                className={`w-full object-cover transition duration-300 group-hover:scale-[1.02] ${
                  visible.length === 1 || featured ? "h-52 sm:h-64" : "h-36 sm:h-44"
                }`}
              />
              {caption ? (
                <span className="absolute inset-x-2 bottom-2 rounded-xl bg-black/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
                  {caption}
                </span>
              ) : null}
            </a>
          );
        }

        if (kind === "video") {
          return (
            <div key={key} className="overflow-hidden rounded-2xl bg-slate-950">
              <video
                src={item.url}
                controls
                playsInline
                preload="metadata"
                className={`${visible.length === 1 || featured ? "h-52 sm:h-64" : "h-36 sm:h-44"} w-full object-cover`}
              />
            </div>
          );
        }

        if (kind === "audio") {
          return (
            <div key={key} className="col-span-full rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                <FileAudio className="h-4 w-4" />
                <span>{caption}</span>
              </div>
              <audio src={item.url} controls preload="metadata" className="w-full" />
            </div>
          );
        }

        return (
          <a
            key={key}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="col-span-full flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">{caption}</span>
          </a>
        );
      })}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
          isUser
            ? "rounded-br-lg bg-emerald-700 text-white"
            : "rounded-bl-lg border border-emerald-100 bg-white text-slate-900"
        }`}
      >
        {!isUser && message.media.length ? (
          <div className="mb-3">
            <PublicMediaGallery media={message.media} featured />
          </div>
        ) : null}

        <div
          className={`prose prose-sm max-w-none leading-relaxed ${
            isUser
              ? "prose-headings:text-white prose-p:text-white prose-strong:text-white prose-li:text-white"
              : "prose-headings:text-emerald-950 prose-strong:text-emerald-950"
          }`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>

        {isUser && message.media.length ? (
          <div className="mt-3">
            <PublicMediaGallery media={message.media} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

async function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? value.split(",").pop() ?? "" : value);
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export default function PublicAgentWebChatPage({ slug }: PublicAgentWebChatPageProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("Agent IA");
  const [subtitle, setSubtitle] = useState("Assistant intelligent sécurisé");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const sessionId = useMemo(() => {
    const key = `waouh_public_agent_session_${slug}`;
    const current = localStorage.getItem(key);
    if (current && /^[a-zA-Z0-9_-]{16,90}$/.test(current)) return current;
    const next = randomSessionId();
    localStorage.setItem(key, next);
    return next;
  }, [slug]);

  const endpoint = `${PUBLIC_AGENT_API_BASE}/${encodeURIComponent(slug)}`;

  const callApi = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, slug, session_id: sessionId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Le Web Chat est momentanément indisponible.");
      }
      return data;
    },
    [endpoint, sessionId, slug],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFatalError(null);

    callApi({ action: "bootstrap" })
      .then((payload: BootstrapPayload) => {
        if (!active) return;
        setAgentName(payload.agent?.name || "Agent IA");
        setSubtitle(payload.agent?.subtitle || "Assistant intelligent sécurisé");
        setSuggestions(payload.suggestions || []);
        setFeatured(payload.featured || []);
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            role: "assistant",
            content: payload.welcome || "Bonjour 👋 Comment puis-je vous aider ?",
            media: payload.welcome_media || [],
          },
        ]);
        document.title = `${payload.agent?.name || "Agent IA"} — Web Chat`;
      })
      .catch((error: Error) => {
        if (active) setFatalError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [callApi]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const sendMessage = useCallback(
    async (forcedText?: string) => {
      const text = (forcedText ?? input).trim();
      if (sending || (!text && !attachment)) return;

      if (attachment && attachment.size > MAX_FILE_BYTES) {
        setFatalError("Le fichier dépasse 8 Mo.");
        return;
      }

      setSending(true);
      setFatalError(null);

      const localMedia: PublicMedia[] = attachment
        ? [
            {
              type: attachment.type.split("/")[0],
              filename: attachment.name,
              mime_type: attachment.type,
              url: URL.createObjectURL(attachment),
              caption: attachment.name,
            },
          ]
        : [];

      const outgoingText = text || "Média joint";
      setMessages((current) => [
        ...current,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: outgoingText,
          media: localMedia,
        },
      ]);
      setInput("");

      try {
        const encodedAttachment = attachment
          ? {
              filename: attachment.name,
              mime_type: attachment.type || "application/octet-stream",
              type: attachment.type.split("/")[0],
              data: await toBase64(attachment),
            }
          : null;

        const payload = await callApi({
          action: "chat",
          message: text || "Analyse ce média et réponds de façon professionnelle.",
          attachment: encodedAttachment,
        });

        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: payload.reply || "Je n’ai pas pu produire de réponse.",
            media: payload.attachments || [],
          },
        ]);
        setAttachment(null);
        if (fileRef.current) fileRef.current.value = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : "Envoi impossible.";
        setMessages((current) => [
          ...current,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `**Erreur temporaire**\n\n${message}`,
            media: [],
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [attachment, callApi, input, sending],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-emerald-700 text-white shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <h1 className="text-xl font-extrabold text-emerald-950">Ouverture du Web Chat…</h1>
          <p className="mt-2 text-sm text-slate-500">Connexion sécurisée à l’agent</p>
        </div>
      </div>
    );
  }

  if (fatalError && messages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-7 text-center shadow-xl">
          <Bot className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">Web Chat indisponible</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{fatalError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 sm:px-4 sm:py-5">
      <main className="mx-auto grid min-h-screen w-full max-w-5xl grid-rows-[auto_auto_1fr_auto] overflow-hidden bg-white/90 shadow-2xl backdrop-blur sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[2rem]">
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 px-5 pb-5 pt-6 text-white sm:px-8 sm:py-7">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-black sm:text-2xl">{agentName}</h1>
              <p className="mt-1 line-clamp-2 text-sm text-emerald-50/85">{subtitle}</p>
            </div>
            <span className="hidden rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold sm:inline-flex">
              ● En ligne
            </span>
          </div>
        </header>

        <section className="border-b border-emerald-100 bg-white px-4 py-3 sm:px-6">
          {suggestions.length ? (
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  disabled={sending}
                  className="shrink-0 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {featured.length ? (
            <div className="flex gap-3 overflow-x-auto pb-1 pt-1 [scrollbar-width:none]">
              {featured.map((item) => {
                const first = item.media?.[0];
                const kind = first ? mediaKind(first) : null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void sendMessage(`Présentez-moi ${item.name} avec les visuels disponibles.`)}
                    className="w-52 shrink-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="h-28 bg-gradient-to-br from-emerald-100 to-teal-50">
                      {first?.url && kind === "image" ? (
                        <img src={first.url} alt={item.name} className="h-full w-full object-cover" />
                      ) : first?.url && kind === "video" ? (
                        <div className="relative h-full w-full">
                          <video src={first.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 grid place-items-center bg-black/15">
                            <Video className="h-9 w-9 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid h-full place-items-center text-emerald-700">
                          <ImageIcon className="h-9 w-9" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-sm font-extrabold text-slate-900">{item.name}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.category || item.kind || "Catalogue"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="overflow-y-auto bg-[#f5faf8] px-3 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {sending ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                  L’agent analyse…
                </div>
              </div>
            ) : null}
            <div ref={chatEndRef} />
          </div>
        </section>

        <footer className="border-t border-emerald-100 bg-white px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
          {attachment ? (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {attachment.type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : null}
              {attachment.type.startsWith("video/") ? <Video className="h-4 w-4" /> : null}
              {attachment.type.startsWith("audio/") ? <FileAudio className="h-4 w-4" /> : null}
              {!/^(image|video|audio)\//.test(attachment.type) ? <FileText className="h-4 w-4" /> : null}
              <span className="min-w-0 flex-1 truncate font-semibold">{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)} aria-label="Retirer le fichier">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="mx-auto grid max-w-4xl grid-cols-[auto_1fr_auto] items-end gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
              aria-label="Joindre un fichier"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Écrivez votre message…"
              rows={1}
              className="max-h-32 min-h-12 w-full resize-none rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending || (!input.trim() && !attachment)}
              className="grid h-12 min-w-12 place-items-center rounded-2xl bg-emerald-700 px-3 text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Envoyer"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*,video/*,audio/*,application/pdf,text/plain,text/csv,application/json,text/markdown"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && file.size > MAX_FILE_BYTES) {
                setFatalError("Le fichier dépasse 8 Mo.");
                event.target.value = "";
                return;
              }
              setAttachment(file);
            }}
          />
        </footer>
      </main>
    </div>
  );
}
