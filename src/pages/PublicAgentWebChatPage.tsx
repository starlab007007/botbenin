import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
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
    return crypto.randomUUID().split("-").join("");
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

function prettyMeta(item: FeaturedItem) {
  const parts = [item.category || item.kind, item.duration, item.format].filter(Boolean);
  if (typeof item.price === "number") parts.push(`${item.price.toLocaleString("fr-FR")} FCFA`);
  return parts.join(" • ");
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
              className="group relative block overflow-hidden rounded-2xl bg-slate-100"
            >
              <img
                src={item.url}
                alt={caption}
                loading="lazy"
                className={`w-full object-cover transition duration-300 group-hover:scale-[1.02] ${
                  visible.length === 1 || featured ? "h-44 sm:h-56" : "h-28 sm:h-36"
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
                className={`${visible.length === 1 || featured ? "h-44 sm:h-56" : "h-28 sm:h-36"} w-full object-cover`}
              />
            </div>
          );
        }

        if (kind === "audio") {
          return (
            <div key={key} className="col-span-full rounded-2xl border border-slate-200 bg-slate-100 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
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
            className="col-span-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
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
    <article className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`w-fit max-w-[92%] min-w-[120px] rounded-[24px] px-4 py-3 shadow-sm sm:max-w-[78%] lg:max-w-[70%] ${
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
          className={`prose prose-sm max-w-none break-words leading-relaxed sm:prose-base ${
            isUser
              ? "prose-headings:text-white prose-p:text-white prose-strong:text-white prose-li:text-white prose-code:text-white prose-pre:text-white"
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

function FeaturedPanel({
  items,
  collapsed,
  onToggle,
  onSelect,
}: {
  items: FeaturedItem[];
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (prompt: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="mx-auto w-full max-w-4xl rounded-[26px] border border-slate-200 bg-slate-100/95 p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 sm:text-base">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <span>Contenus mis en avant</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Produits, formations et présentations disponibles pour cette discussion.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          aria-expanded={!collapsed}
        >
          {collapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          <span>{collapsed ? "Afficher" : "Réduire"}</span>
        </button>
      </div>

      {collapsed ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.slice(0, 4).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(`Présentez-moi ${item.name} avec les visuels disponibles.`)}
              className="rounded-full bg-white px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50"
            >
              {item.name}
            </button>
          ))}
          {items.length > 4 ? (
            <span className="inline-flex items-center rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
              +{items.length - 4} autres
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const first = item.media?.[0];
            const kind = first ? mediaKind(first) : null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(`Présentez-moi ${item.name} avec les visuels disponibles.`)}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-36 bg-gradient-to-br from-emerald-100 to-teal-50">
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
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div>
                    <p className="line-clamp-2 text-sm font-extrabold text-slate-900">{item.name}</p>
                    {prettyMeta(item) ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{prettyMeta(item)}</p>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
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
  const [payloadCollapsed, setPayloadCollapsed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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
        setPayloadCollapsed((payload.featured?.length || 0) > 3);
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

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "0px";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
  }, [input]);

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 md:px-4 md:py-5">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl grid-rows-[auto_auto_1fr_auto] overflow-hidden bg-white/95 shadow-2xl backdrop-blur md:min-h-[calc(100vh-2.5rem)] md:rounded-[2rem]">
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 px-4 pb-5 pt-5 text-white sm:px-6 sm:py-6">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
          <div className="relative flex items-start gap-3 sm:items-center sm:gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-black sm:text-2xl">{agentName}</h1>
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-bold sm:hidden">
                  ● En ligne
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-emerald-50/85">{subtitle}</p>
            </div>
            <span className="hidden rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold sm:inline-flex">
              ● En ligne
            </span>
          </div>
        </header>

        <section className="border-b border-emerald-100 bg-white px-3 py-3 sm:px-5">
          {suggestions.length ? (
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  disabled={sending}
                  className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="overflow-y-auto bg-[#f5faf8] px-2 py-3 sm:px-4 sm:py-4">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            {featured.length ? (
              <FeaturedPanel
                items={featured}
                collapsed={payloadCollapsed}
                onToggle={() => setPayloadCollapsed((current) => !current)}
                onSelect={(prompt) => void sendMessage(prompt)}
              />
            ) : null}

            {fatalError ? (
              <div className="mx-auto w-full max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                {fatalError}
              </div>
            ) : null}

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
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
          </div>
        </section>

        <footer className="border-t border-emerald-100 bg-white px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
          {attachment ? (
            <div className="mx-auto mb-2 flex max-w-4xl items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-800">
              {attachment.type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : null}
              {attachment.type.startsWith("video/") ? <Video className="h-4 w-4" /> : null}
              {attachment.type.startsWith("audio/") ? <FileAudio className="h-4 w-4" /> : null}
              {!/^(image|video|audio)\//.test(attachment.type) ? <FileText className="h-4 w-4" /> : null}
              <span className="min-w-0 flex-1 truncate font-semibold">{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)} aria-label="Retirer le fichier" className="rounded-full p-1 hover:bg-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="mx-auto grid max-w-4xl grid-cols-[auto_1fr_auto] items-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 sm:h-12 sm:w-12"
              aria-label="Joindre un fichier"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              ref={inputRef}
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
              className="min-h-11 w-full resize-none overflow-y-auto rounded-[22px] border border-emerald-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:min-h-12"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending || (!input.trim() && !attachment)}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-emerald-700 px-3 text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-45 sm:h-12 sm:min-w-12 sm:px-4"
              aria-label="Envoyer"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <div className="mx-auto mt-2 flex max-w-4xl items-center justify-between gap-3 px-1 text-[11px] text-slate-400 sm:text-xs">
            <span>Entrée pour envoyer • Maj + Entrée pour aller à la ligne</span>
            {featured.length ? (
              <button
                type="button"
                onClick={() => setPayloadCollapsed((current) => !current)}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700"
              >
                {payloadCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                {payloadCollapsed ? "Afficher les contenus" : "Réduire les contenus"}
              </button>
            ) : null}
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
