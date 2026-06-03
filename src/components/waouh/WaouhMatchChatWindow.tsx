import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ShoppingBag, Target, CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatImage } from "@/app-mobile/components/ChatImage";
import { cn } from "@/lib/utils";
import { formatMatchLabel } from "@/app-mobile/utils/chatLabel";
import "@/app-mobile/theme/chat-bg.css";

export type MatchChatMeta = {
  key: string;
  article_id: string | null;
  notification_id?: string | null;
  seed_text?: string | null;
  buyer_profile_id?: string | null;
  counterpart_user_id?: string | null;
  title: string;
  price: number | null;
  city?: string | null;
  photo?: string | null;
  kind: "buyer" | "seller";
  closed?: boolean;
};


type Msg = {
  id: string;
  direction: "in" | "out";
  text: string;
  created_at: string;
  attachments?: any;
  meta?: any;
};

type SeedNotif = {
  sent_at: string;
  notification_type: string;
  text: string | null;
};

const CLOSED_STATUSES = new Set(["sold", "closed", "finalized", "completed", "vendu"]);
const PAGE_INITIAL = 10;
const PAGE_OLDER = 20;

function mergeMsgs(prev: Msg[], incoming: Msg[]): Msg[] {
  if (!incoming.length) return prev;
  const incomingIds = new Set(incoming.map((m) => m.id));
  const keepOptimistic = prev.filter(
    (m) =>
      m.id.startsWith("temp-") &&
      !incoming.some(
        (f) =>
          f.direction === m.direction &&
          f.text === m.text &&
          Math.abs(new Date(f.created_at).getTime() - new Date(m.created_at).getTime()) < 30000
      )
  );
  const prevKeep = prev.filter((p) => !incomingIds.has(p.id) && !p.id.startsWith("temp-"));
  return [...prevKeep, ...incoming, ...keepOptimistic].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Full-screen match chat — fills parent flex container exactly like the main
 * WAOUH chat. Pinned with the original notification as a system bubble,
 * strictly scoped to one article until the sale is finalized.
 */
export function WaouhMatchChatWindow({
  match,
  sessionId,
  waouhIds,
  active,
  getCached,
  setCached,
  getHasMore,
  setHasMoreCached,
}: {
  match: MatchChatMeta;
  sessionId: string;
  waouhIds: string[];
  active: boolean;
  getCached?: (key: string) => Msg[];
  setCached?: (key: string, msgs: Msg[]) => void;
  getHasMore?: (key: string) => boolean;
  setHasMoreCached?: (key: string, v: boolean) => void;
}) {
  // Bootstrap from cache so closing/reopening or switching tabs keeps history.
  const [messages, setMessagesState] = useState<Msg[]>(() => getCached?.(match.key) ?? []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [seedNotif, setSeedNotif] = useState<SeedNotif | null>(null);
  const [articleStatus, setArticleStatus] = useState<string | null>(null);
  const [hasMore, setHasMoreState] = useState<boolean>(() => getHasMore?.(match.key) ?? true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Wrap setters to persist into the per-tab cache.
  const setMessages = (updater: Msg[] | ((prev: Msg[]) => Msg[])) => {
    setMessagesState((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      setCached?.(match.key, next);
      return next;
    });
  };
  const setHasMore = (v: boolean) => {
    setHasMoreState(v);
    setHasMoreCached?.(match.key, v);
  };

  const closed = useMemo(
    () => !!match.closed || (articleStatus ? CLOSED_STATUSES.has(articleStatus.toLowerCase()) : false),
    [match.closed, articleStatus]
  );

  // Article-scoped query helper. Widened to catch messages where article_id is
  // only carried in meta->>article_id (legacy rows).
  const fetchArticlePage = async (before: string | null, limit: number): Promise<Msg[]> => {
    if (!match.article_id) return [];
    let q: any = (supabase.from("waouh_messages") as any)
      .select("id,direction,text,created_at,attachments,meta,article_id")
      .or(`article_id.eq.${match.article_id},meta->>article_id.eq.${match.article_id}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data } = await q;
    return ((data ?? []) as Msg[]).slice().reverse();
  };

  // Load initial 10 + seed notification + article status. Merge, never overwrite.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!match.article_id) return;

      const hasInlineSeed = !!match.seed_text;
      if (hasInlineSeed) {
        setSeedNotif({
          sent_at: new Date().toISOString(),
          notification_type: match.kind === "seller" ? "new_buyer" : "match_buyer",
          text: match.seed_text!,
        });
      }

      const promises: Promise<any>[] = [
        fetchArticlePage(null, PAGE_INITIAL),
        (supabase.from("waouh_articles") as any)
          .select("status")
          .eq("id", match.article_id)
          .maybeSingle(),
      ];
      if (!hasInlineSeed) {
        const seedQuery = match.notification_id
          ? (supabase.from("waouh_notifications") as any)
              .select("sent_at,notification_type,payload")
              .eq("id", match.notification_id)
              .maybeSingle()
          : (supabase.from("waouh_notifications") as any)
              .select("sent_at,notification_type,payload")
              .eq("article_id", match.article_id)
              .in("notification_type", ["match", "match_buyer", "match_seller", "new_buyer", "radar_match"])
              .order("sent_at", { ascending: false })
              .limit(1);
        promises.push(seedQuery);
      }

      const results = await Promise.all(promises);
      const pageMsgs = results[0] as Msg[];
      const artRes = results[1];
      const notifRes = hasInlineSeed ? null : results[2];

      if (!alive) return;
      setMessages((prev) => mergeMsgs(prev, pageMsgs));
      setHasMore(pageMsgs.length === PAGE_INITIAL);
      setArticleStatus((artRes?.data as any)?.status ?? null);
      if (!hasInlineSeed) {
        const raw = notifRes?.data;
        const n = Array.isArray(raw) ? raw[0] : raw;
        if (n) {
          setSeedNotif({
            sent_at: n.sent_at,
            notification_type: n.notification_type,
            text: (n.payload as any)?.text ?? null,
          });
        } else {
          setSeedNotif(null);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // Reload only when the article identity changes, NOT when waouhIds is enriched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.article_id, match.notification_id, match.seed_text]);

  // Load older messages on top-scroll
  const loadOlder = async () => {
    if (loadingOlder || !hasMore) return;
    const oldest = messages[0]?.created_at;
    if (!oldest) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    try {
      const page = await fetchArticlePage(oldest, PAGE_OLDER);
      setHasMore(page.length === PAGE_OLDER);
      if (page.length) {
        setMessages((prev) => mergeMsgs(prev, page));
        requestAnimationFrame(() => {
          const el2 = scrollRef.current;
          if (!el2) return;
          el2.scrollTop = el2.scrollHeight - prevHeight + prevTop;
        });
      }
    } finally {
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    const node = topSentinelRef.current;
    const root = scrollRef.current;
    if (!node || !root || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadOlder();
      },
      { root, rootMargin: "200px 0px 0px 0px", threshold: 0 }
    );
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingOlder, messages.length]);



  // Realtime — strictly filtered by article_id, listens on session AND linked users
  useEffect(() => {
    if (!match.article_id) return;
    const suffix = Math.random().toString(36).slice(2, 6);
    const handle = (payload: any) => {
      const m = payload.new;
      if (m?.article_id !== match.article_id && m?.meta?.article_id !== match.article_id) return;
      setMessages((prev) => {
        if (prev.find((x) => x.id === m.id)) return prev;
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
    };

    const ch = supabase.channel(`match_${match.key}_${suffix}`);
    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "waouh_messages", filter: `web_session_id=eq.${sessionId}` },
      handle
    );
    for (const uid of waouhIds) {
      ch.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waouh_messages", filter: `user_id=eq.${uid}` },
        handle
      );
    }
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [match.article_id, sessionId, match.key, waouhIds.join(",")]);

  // Smart scroll + persisted scroll position per match.key
  const prevLenRef = useRef(0);
  const restoredRef = useRef(false);
  const SCROLL_KEY = `waouh_scroll_${sessionId}_${match.key}`;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    const isFirstRender = prevLenRef.current === 0 && messages.length > 0;
    prevLenRef.current = messages.length;
    if (isFirstRender && !restoredRef.current) {
      // Restore saved scroll position if any, else go to bottom
      let restored = false;
      try {
        const raw = localStorage.getItem(SCROLL_KEY);
        if (raw != null) {
          const top = Number(raw);
          if (Number.isFinite(top) && top >= 0) {
            el.scrollTop = Math.min(top, el.scrollHeight);
            restored = true;
          }
        }
      } catch {}
      if (!restored) el.scrollTop = el.scrollHeight;
      restoredRef.current = true;
    } else if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, SCROLL_KEY]);

  // Persist scroll position (throttled via rAF)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        try {
          localStorage.setItem(SCROLL_KEY, String(el.scrollTop));
        } catch {}
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [SCROLL_KEY]);

  // Focus textarea only when this tab becomes active (do NOT force-scroll —
  // the persisted scroll position must be preserved across refreshes).
  useEffect(() => {
    if (active && !closed) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [active, closed]);

  // When the user opens this match (clicks notification/list), mark it read
  useEffect(() => {
    if (!active || !match.notification_id) return;
    supabase
      .from("waouh_notifications" as any)
      .update({ opened: true })
      .eq("id", match.notification_id)
      .then(({ error }) => {
        if (error) console.warn("[waouh-match] markRead error", error);
      });
  }, [active, match.notification_id]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || closed) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    setMessages((prev) => [...prev, { id: tempId, direction: "in", text, created_at: now }]);
    setInput("");
    try {
      // Product context travels via meta only — never pollute the message body
      const invokeP = supabase.functions.invoke("waouh-channel-in", {
        body: {
          channel: "web",
          sessionId,
          text,
          attachments: [],
          authUserId: null,
          meta: {
            article_id: match.article_id,
            buyer_profile_id: match.buyer_profile_id ?? null,
            counterpart_user_id: match.counterpart_user_id ?? null,
            role: match.kind,
            product_title: match.title,
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
      window.dispatchEvent(
        new CustomEvent("waouh:match-updated", { detail: { article_id: match.article_id } })
      );
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
      toast.error("Message non envoyé, réessayez");
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

  const seedTitle =
    match.kind === "seller"
      ? "📩 Nouvel acheteur intéressé par votre annonce"
      : seedNotif?.notification_type === "radar_match"
        ? "🎯 Annonce détectée par le Radar IA"
        : "🎯 Annonce trouvée pour votre recherche";

  const seedDate = seedNotif?.sent_at
    ? new Date(seedNotif.sent_at).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

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
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] uppercase tracking-wider opacity-80 font-mono truncate">{matchLabel}</div>
            {closed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/95 text-emerald-700 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" /> Vente finalisée
              </span>
            )}
          </div>
          <div className="text-sm font-semibold truncate">{match.title}</div>
          <div className="text-[11px] opacity-90 truncate">
            {match.price ? `${Number(match.price).toLocaleString("fr-FR")} FCFA` : ""}
            {match.city ? ` · ${match.city}` : ""}
            {" · "}
            {match.kind === "buyer" ? "Discutez avec le vendeur" : "Discutez avec l'acheteur"}
          </div>
        </div>
      </div>

      {/* Messages area — same WAOUH doodle background */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 waouh-chat-bg">
        {/* Seed notification bubble — always pinned at top */}
        <div className="mx-auto max-w-[92%] rounded-2xl border border-amber-300/70 bg-amber-50/95 dark:bg-amber-900/30 dark:border-amber-700/60 px-3 py-2.5 shadow-sm">
          <div className="flex items-start gap-2.5">
            {match.photo ? (
              <img src={match.photo} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-amber-200/70 dark:bg-amber-800/40 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-amber-700 dark:text-amber-300" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-amber-900 dark:text-amber-100">{seedTitle}</div>
              <div className="text-[12px] text-amber-900/90 dark:text-amber-100/90 truncate">
                {match.title}
                {match.price ? ` · ${Number(match.price).toLocaleString("fr-FR")} FCFA` : ""}
                {match.city ? ` · ${match.city}` : ""}
              </div>
              {seedDate && (
                <div className="text-[10px] text-amber-800/70 dark:text-amber-200/70 mt-0.5">{seedDate}</div>
              )}
            </div>
          </div>
        </div>

        {/* Full original notification message — pinned below seed header */}
        {seedNotif?.text && (
          <div className="mr-auto max-w-[92%] rounded-2xl rounded-bl-sm border bg-card px-3 py-2 text-sm shadow-sm">
            <div className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed">
              {seedNotif.text}
            </div>
          </div>
        )}

        {hasMore && (
          <div ref={topSentinelRef} className="flex items-center justify-center py-2 text-xs text-muted-foreground">
            {loadingOlder ? <Loader2 className="w-3 h-3 animate-spin" /> : "↑ Charger plus d'historique"}
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

      {/* Composer */}
      {closed ? (
        <div
          className="flex items-center gap-2 p-3 border-t bg-muted/60 text-muted-foreground text-sm shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Cette conversation est clôturée — la vente a été finalisée.</span>
        </div>
      ) : (
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
      )}
    </div>
  );
}
