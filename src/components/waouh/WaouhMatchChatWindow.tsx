import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ShoppingBag, Target, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatImage } from "@/app-mobile/components/ChatImage";
import { cn } from "@/lib/utils";
import { formatMatchLabel } from "@/app-mobile/utils/chatLabel";
import "@/app-mobile/theme/chat-bg.css";

export type MatchChatMeta = {
  key: string;
  article_id: string | null;
  notification_id?: string | null;
  notification_ids?: string[];
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
  // Synchronous hydration of meta (status + seed) from localStorage so the first
  // paint shows the full bubble immediately — no spinner, no layout shift.
  const STATUS_KEY = `waouh_match_status_${match.key}`;
  const SEED_KEY = `waouh_match_seed_${match.key}`;
  const readStatus = (): string | null => {
    try { return localStorage.getItem(STATUS_KEY); } catch { return null; }
  };
  const readSeed = (): SeedNotif | null => {
    try {
      const raw = localStorage.getItem(SEED_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  // Bootstrap from cache so closing/reopening or switching tabs keeps history.
  const [messages, setMessagesState] = useState<Msg[]>(() => getCached?.(match.key) ?? []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [seedNotif, setSeedNotif] = useState<SeedNotif | null>(() => {
    if (match.seed_text) {
      return {
        sent_at: new Date().toISOString(),
        notification_type: match.kind === "seller" ? "new_buyer" : "match_buyer",
        text: match.seed_text,
      };
    }
    return readSeed();
  });
  const [articleStatus, setArticleStatus] = useState<string | null>(() => readStatus());
  const [hasMore, setHasMoreState] = useState<boolean>(() => getHasMore?.(match.key) ?? true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(() => (getCached?.(match.key) ?? []).length === 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFetchRef = useRef<number>(0);

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

  // Server-side history fetcher (source of truth). Replaces the previous
  // client-side OR-chained query whose viewer scoping was racy (depended
  // on waouhIds being resolved before the first mount and could miss
  // messages owned by linked waouh_users rows).
  const fetchHistory = async (
    opts: { before?: string | null; limit?: number; includeMeta?: boolean } = {}
  ): Promise<{ messages: Msg[]; hasMore: boolean; articleStatus: string | null; seedNotification: SeedNotif | null }> => {
    if (!match.article_id) return { messages: [], hasMore: false, articleStatus: null, seedNotification: null };
    const { data, error } = await supabase.functions.invoke("waouh-match-history", {
      body: {
        articleId: match.article_id,
        sessionId,
        role: match.kind,
        notificationId: match.notification_id ?? null,
        before: opts.before ?? null,
        limit: opts.limit ?? PAGE_INITIAL,
        includeMeta: opts.includeMeta !== false,
      },
    });
    if (error || !(data as any)?.ok) {
      console.warn("[waouh-match-history] error", error || (data as any)?.error);
      return { messages: [], hasMore: false, articleStatus: null, seedNotification: null };
    }
    return {
      messages: ((data as any).messages ?? []) as Msg[],
      hasMore: !!(data as any).hasMore,
      articleStatus: (data as any).articleStatus ?? null,
      seedNotification: (data as any).seedNotification ?? null,
    };
  };

  // Authoritative load on mount / when target article or session changes.
  // Cache (if any) gives the instant first paint; the network response
  // reconciles authoritatively against DB.
  const runInitialLoad = async () => {
    if (!match.article_id) return;
    const now = Date.now();
    if (now - lastFetchRef.current < 1500) return; // throttle
    lastFetchRef.current = now;

    const hasInlineSeed = !!match.seed_text;
    if (hasInlineSeed) {
      setSeedNotif({
        sent_at: new Date().toISOString(),
        notification_type: match.kind === "seller" ? "new_buyer" : "match_buyer",
        text: match.seed_text!,
      });
    }

    const res = await fetchHistory({ limit: PAGE_INITIAL, includeMeta: true });
    setMessages((prev) => mergeMsgs(prev, res.messages));
    setHasMore(res.messages.length >= PAGE_INITIAL ? res.hasMore : false);
    if (res.articleStatus) {
      setArticleStatus(res.articleStatus);
      try { localStorage.setItem(STATUS_KEY, res.articleStatus); } catch {}
    }
    if (!hasInlineSeed && res.seedNotification) {
      setSeedNotif(res.seedNotification);
      try { localStorage.setItem(SEED_KEY, JSON.stringify(res.seedNotification)); } catch {}
    }
    setSyncedAt(new Date().toISOString());
    setInitialLoading(false);
  };

  useEffect(() => {
    let alive = true;
    const ric: any = (typeof window !== "undefined" && (window as any).requestIdleCallback) || null;
    const handle = ric
      ? ric(() => { if (alive) void runInitialLoad(); }, { timeout: 200 })
      : setTimeout(() => { if (alive) void runInitialLoad(); }, 0);
    return () => {
      alive = false;
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(handle);
      else clearTimeout(handle as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.article_id, match.notification_id, match.seed_text, sessionId]);

  // Refetch when the tab becomes active again (reopen / tab switch back).
  useEffect(() => {
    if (!active) return;
    void runInitialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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
      const res = await fetchHistory({ before: oldest, limit: PAGE_OLDER, includeMeta: false });
      setHasMore(res.messages.length >= PAGE_OLDER ? res.hasMore : false);
      if (res.messages.length) {
        setMessages((prev) => mergeMsgs(prev, res.messages));
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

  // When the user opens this match, mark all related notifications as read
  useEffect(() => {
    if (!active) return;
    const ids = Array.from(
      new Set<string>([
        ...(match.notification_ids || []),
        ...(match.notification_id ? [match.notification_id] : []),
      ])
    );
    if (!ids.length) return;
    supabase
      .from("waouh_notifications" as any)
      .update({ opened: true })
      .in("id", ids)
      .then(({ error }) => {
        if (error) console.warn("[waouh-match] markRead error", error);
      });
  }, [active, match.notification_id, (match.notification_ids || []).join(",")]);


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
      const outboundId = (data as any)?.outbound_message_id;
      setMessages((prev) => {
        const f = prev.filter((m) => m.id !== tempId);
        if (realId && !f.some((m) => m.id === realId)) {
          f.push({ id: realId, direction: "in", text, created_at: now });
        }
        if ((data as any)?.reply) {
          const replyId = outboundId || `temp-out-${Date.now()}`;
          if (!f.some((m) => m.id === replyId)) {
            f.push({
              id: replyId,
              direction: "out",
              text: (data as any).reply,
              created_at: new Date().toISOString(),
            });
          }
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

        {/* Bulle "seedNotif.text" supprimée des deux côtés.
            Le bandeau jaune ci-dessus suffit comme synthèse pinned ;
            chaque partie ne voit ensuite que ses propres bulles et
            les messages reçus en realtime. */}


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
