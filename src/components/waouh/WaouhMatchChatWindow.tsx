import { assertChatResponse, normalizeChatReply, mergeChatRows, reconcileChatResponse } from "@/lib/chatReply";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ShoppingBag, Target, CheckCircle2, Lock, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatImage } from "@/app-mobile/components/ChatImage";
import { WaouhProductResults } from "@/components/waouh/WaouhProductCard";
import { WaouhAgentBlocks } from "@/components/waouh/WaouhAgentBlocks";
import { invokeWaouhAgentic } from "@/lib/waouh/agenticClient";
import type { AgenticAction } from "@/lib/waouh/agenticContracts";
import { WaouhArticleSummary } from "@/components/waouh/WaouhArticleSummary";
import { WaouhMuseAvatar } from "@/components/waouh/WaouhMuseAvatar";
import { WaouhContactabilityBadge } from "@/components/waouh/WaouhCommerceAgentBar";


import { cn } from "@/lib/utils";
import { formatMatchLabel } from "@/app-mobile/utils/chatLabel";
import "@/app-mobile/theme/chat-bg.css";
import { engageWaouhChatSyncLock } from "./waouhChatSyncLock";
import { correlationIdFor, traceUi } from "./waouhCorrelation";
import type { WaouhWorkspaceDealState } from "@/lib/waouh/workspaceState";

export type MatchChatMeta = {
  key: string;
  article_id: string | null;
  notification_id?: string | null;
  notification_ids?: string[];
  seed_text?: string | null;
  buyer_profile_id?: string | null;
  counterpart_user_id?: string | null;
  thread_id?: string | null;
  negotiation_id?: string | null;
  deal_id?: string | null;
  buyer_user_id?: string | null;
  seller_user_id?: string | null;
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

const mergeMsgs = mergeChatRows<Msg>;

/**
 * Full-screen match chat — fills parent flex container exactly like the main
 * WAOUH chat. Pinned with the original notification as a system bubble,
 * strictly scoped to one article until the sale is finalized.
 */
export function WaouhMatchChatWindow({
  match,
  sessionId,
  authUserId,
  waouhIds,
  active,
  getCached,
  setCached,
  getHasMore,
  setHasMoreCached,
  onDealStateChange,
}: {
  match: MatchChatMeta;
  sessionId: string;
  authUserId?: string | null;
  waouhIds: string[];
  active: boolean;
  getCached?: (key: string) => Msg[];
  setCached?: (key: string, msgs: Msg[]) => void;
  getHasMore?: (key: string) => boolean;
  setHasMoreCached?: (key: string, v: boolean) => void;
  onDealStateChange?: (state: WaouhWorkspaceDealState) => void;
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
  const initialCached = getCached?.(match.key) ?? [];
  const [messages, setMessagesState] = useState<Msg[]>(() => initialCached);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [agentAction, setAgentAction] = useState<AgenticAction | null>(null);
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
  const [dbMsgCount, setDbMsgCount] = useState<number>(() => initialCached.length);
  const [initialLoading, setInitialLoading] = useState<boolean>(() => initialCached.length === 0);

  const handleAgentAction = async (action: AgenticAction, payload: Record<string, unknown>) => {
    if (!authUserId) {
      toast.error("Connectez-vous pour piloter cette mission.");
      return;
    }
    setAgentAction(action);
    try {
      await invokeWaouhAgentic(action, payload);
      toast.success("Action WAOUH enregistrée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible");
    } finally {
      setAgentAction(null);
    }
  };

  // Verrou flux WAOUH chat — sentinelle runtime (voir waouhChatSyncLock.ts)
  useEffect(() => { engageWaouhChatSyncLock(); }, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inFlightRef = useRef<boolean>(false);
  const firstLoadDoneRef = useRef<boolean>(false);

  // Plain setter; cache persistence is handled by a dedicated effect below.
  const setMessages = (updater: Msg[] | ((prev: Msg[]) => Msg[])) => {
    setMessagesState((prev) => (typeof updater === "function" ? (updater as any)(prev) : updater));
  };
  const setHasMore = (v: boolean) => {
    setHasMoreState(v);
    setHasMoreCached?.(match.key, v);
  };

  // Persist messages to cache outside of React updater (StrictMode-safe).
  useEffect(() => {
    setCached?.(match.key, messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, match.key]);

  const closed = useMemo(
    () => !!match.closed || (articleStatus ? CLOSED_STATUSES.has(articleStatus.toLowerCase()) : false),
    [match.closed, articleStatus]
  );

  // v14 — corrélation bout en bout (notification → fenêtre → messages).
  const correlationId = useMemo(
    () => correlationIdFor(match.article_id, match.kind, match.counterpart_user_id ?? null),
    [match.article_id, match.kind, match.counterpart_user_id]
  );

  // Server-side history fetcher (source of truth).
  const fetchHistory = async (
    opts: { before?: string | null; limit?: number; includeMeta?: boolean } = {}
  ): Promise<{ messages: Msg[]; hasMore: boolean; articleStatus: string | null; seedNotification: SeedNotif | null; ok: boolean }> => {
    if (!match.article_id) return { messages: [], hasMore: false, articleStatus: null, seedNotification: null, ok: false };
    const { data, error } = await supabase.functions.invoke("waouh-match-history", {
      body: {
        articleId: match.article_id,
        sessionId,
        authUserId: authUserId ?? null,
        role: match.kind,
        notificationId: match.notification_id ?? null,
        counterpartUserId: match.counterpart_user_id ?? null,
        before: opts.before ?? null,
        limit: opts.limit ?? PAGE_INITIAL,
        includeMeta: opts.includeMeta !== false,
      },
    });

    if (error || !(data as any)?.ok) {
      console.warn("[waouh-match-history] error", error || (data as any)?.error);
      return { messages: [], hasMore: false, articleStatus: null, seedNotification: null, ok: false };
    }
    return {
      messages: ((data as any).messages ?? []) as Msg[],
      hasMore: !!(data as any).hasMore,
      articleStatus: (data as any).articleStatus ?? null,
      seedNotification: (data as any).seedNotification ?? null,
      ok: true,
    };
  };

  // Authoritative load. `silent=true` => do not flip initialLoading (background reconcile).
  const runInitialLoad = async (silent = false) => {
    if (!match.article_id) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const hasInlineSeed = !!match.seed_text;
    if (hasInlineSeed) {
      setSeedNotif({
        sent_at: new Date().toISOString(),
        notification_type: match.kind === "seller" ? "new_buyer" : "match_buyer",
        text: match.seed_text!,
      });
    }

    try {
      const res = await fetchHistory({ limit: PAGE_INITIAL, includeMeta: true });
      if (!res.ok && !silent) {
        toast.error("Historique indisponible — réessayez", { duration: 2500 });
      }
      setMessagesState((prev) => {
        const next = mergeMsgs(prev, res.messages);
        setDbMsgCount(next.length);
        return next;
      });
      if (res.messages.length < PAGE_INITIAL) setHasMore(false);
      else setHasMore(res.hasMore);
      if (res.articleStatus) {
        setArticleStatus(res.articleStatus);
        try { localStorage.setItem(STATUS_KEY, res.articleStatus); } catch {}
      }
      if (!hasInlineSeed && res.seedNotification) {
        setSeedNotif(res.seedNotification);
        try { localStorage.setItem(SEED_KEY, JSON.stringify(res.seedNotification)); } catch {}
      }
      if (res.ok) setSyncedAt(new Date().toISOString());
    } finally {
      if (!silent) setInitialLoading(false);
      else setInitialLoading(false); // also clear in silent mode if it was somehow true
      inFlightRef.current = false;
      firstLoadDoneRef.current = true;
    }
  };

  // Single consolidated loader. First pass uses requestIdleCallback to defer
  // past first paint; subsequent re-activations fetch silently in background.
  useEffect(() => {
    let alive = true;
    if (!active) return;
    const cachedLen = (getCached?.(match.key) ?? []).length;
    const silent = cachedLen > 0 || firstLoadDoneRef.current;

    if (!firstLoadDoneRef.current) {
      const ric: any = (typeof window !== "undefined" && (window as any).requestIdleCallback) || null;
      const handle = ric
        ? ric(() => { if (alive) void runInitialLoad(silent); }, { timeout: 200 })
        : setTimeout(() => { if (alive) void runInitialLoad(silent); }, 0);
      return () => {
        alive = false;
        if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(handle);
        else clearTimeout(handle as any);
      };
    }

    void runInitialLoad(true);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.article_id, match.notification_id, match.seed_text, sessionId, authUserId, active]);

  // Reset scroll/restore refs when switching to a different match key
  useEffect(() => {
    firstLoadDoneRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.key]);

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
    // Avoid mounting a partial channel while waouhIds is still resolving for
    // an authenticated viewer — otherwise the channel is torn down & recreated
    // as soon as the user ids arrive, leaving a gap where partner inserts are missed.
    if (authUserId && waouhIds.length === 0) return;
    const suffix = Math.random().toString(36).slice(2, 6);
    const SELF_ACK_TEMPLATES = new Set([
      "buyer_interest_ack", "negotiation_ack", "payment_ack", "sale_published",
    ]);
    const handle = (payload: any) => {
      const m = payload.new;
      if (m?.article_id !== match.article_id && m?.meta?.article_id !== match.article_id) return;
      // v12/v13 — chaque fenêtre est scoppée par contrepartie. On rejette les
      // évènements realtime qui n'appartiennent pas à cet interlocuteur.
      if (match.counterpart_user_id) {
        const cp = match.counterpart_user_id;
        if (match.kind === "seller") {
          const metaCp =
            m?.meta?.counterpart_user_id ?? m?.meta?.buyer_user_id ?? null;
          if (metaCp !== cp && m?.user_id !== cp) return;
        } else {
          const metaCp =
            m?.meta?.counterpart_user_id ?? m?.meta?.seller_user_id ?? null;
          if (metaCp && metaCp !== cp) return;
        }
      }

      // Drop self-ack templates that belong to the OTHER party (the seller
      // must not see the buyer's "✅ Demande envoyée au vendeur").
      const tpl = m?.meta?.template;
      const isSelfAck = !!tpl && (SELF_ACK_TEMPLATES.has(tpl) || /_ack$/.test(tpl));
      const ownedByViewer =
        (sessionId && m.web_session_id === sessionId) ||
        (m.user_id && waouhIds.includes(m.user_id));
      if (isSelfAck && !ownedByViewer) return;

      // Traçabilité bout en bout : message reçu dans cette fenêtre.
      traceUi({
        correlation_id: correlationId,
        stage: "ui_message_received",
        article_id: match.article_id,
        role: match.kind,
        counterpart_user_id: match.counterpart_user_id ?? null,
        message_id: m?.id ?? null,
        intent: m?.meta?.intent ?? null,
        session_id: sessionId,
        payload: { direction: m?.direction ?? null, template: m?.meta?.template ?? null },
      });

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
  }, [match.article_id, sessionId, match.key, authUserId, waouhIds.join(",")]);

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


  const latestCommerceScope = useMemo(() => {
    const scope: Record<string, string | null> = {
      thread_id: match.thread_id ?? null,
      negotiation_id: match.negotiation_id ?? null,
      deal_id: match.deal_id ?? null,
      buyer_user_id: match.buyer_user_id ?? null,
      seller_user_id: match.seller_user_id ?? null,
    };
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message: any = messages[index] || {};
      const meta: any = message.meta || {};
      const product = Array.isArray(meta.products) ? meta.products[0] : Array.isArray(meta.results) ? meta.results[0] : null;
      for (const key of ["thread_id", "negotiation_id", "deal_id", "buyer_user_id", "seller_user_id"]) {
        if (!scope[key]) {
          const value = meta?.[key] ?? product?.[key] ?? message?.[key] ?? null;
          if (value) scope[key] = String(value);
        }
      }
    }
    return scope;
  }, [
    messages,
    match.thread_id,
    match.negotiation_id,
    match.deal_id,
    match.buyer_user_id,
    match.seller_user_id,
  ]);

  const sendMessage = async (
    overrideText?: string,
    overrideMeta: Record<string, unknown> = {}
  ) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending || closed) return;
    setSending(true);
    const tempId = `temp-in-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    setMessages((prev) => [...prev, { id: tempId, direction: "in", text, created_at: now }]);
    if (overrideText == null) setInput("");
    try {
      // Product + Deal Graph scope travels via metadata; visible text stays human-readable.
      const invokeP = supabase.functions.invoke("waouh-channel-in-secure", {
        headers: { "x-waouh-session": sessionId },
        body: {
          channel: "web",
          sessionId,
          text,
          attachments: [],
          authUserId: authUserId ?? null,
          meta: {
            article_id: match.article_id,
            buyer_profile_id: match.buyer_profile_id ?? null,
            counterpart_user_id: match.counterpart_user_id ?? null,
            buyer_user_id: latestCommerceScope.buyer_user_id ?? null,
            seller_user_id: latestCommerceScope.seller_user_id ?? null,
            thread_id: latestCommerceScope.thread_id ?? null,
            negotiation_id: latestCommerceScope.negotiation_id ?? null,
            deal_id: latestCommerceScope.deal_id ?? null,
            role: match.kind,
            product_title: match.title,
            correlation_id: correlationId,
            ...overrideMeta,
          },
        },
      });
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutP = new Promise<never>((_, reject) => { timeoutId = setTimeout(() => reject(new Error("timeout")), 45000); });
      const { data, error } = await Promise.race([invokeP, timeoutP]).finally(() => clearTimeout(timeoutId));
      assertChatResponse(data, error);
      const realId = (data as any)?.inbound_message_id;
      traceUi({
        correlation_id: correlationId,
        stage: "ui_message_sent",
        article_id: match.article_id,
        role: match.kind,
        counterpart_user_id: match.counterpart_user_id ?? null,
        message_id: realId ?? null,
        intent: (data as any)?.intent ?? null,
        session_id: sessionId,
        payload: {
          thread_id: (data as any)?.thread_id ?? latestCommerceScope.thread_id ?? null,
          deal_id: (data as any)?.deal_id ?? latestCommerceScope.deal_id ?? null,
        },
      });
      setMessages((prev) => reconcileChatResponse(prev, data, { id: tempId, direction: "in", text, created_at: now }));
      window.dispatchEvent(
        new CustomEvent("waouh:match-updated", { detail: { article_id: match.article_id } })
      );
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (overrideText == null) setInput(text);
      toast.error("Message non envoyé, réessayez");
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 30);
    }
  };

  const send = () => { void sendMessage(); };

  const Icon = match.kind === "buyer" ? Target : ShoppingBag;
  const matchLabel = formatMatchLabel({
    articleId: match.article_id,
    userKey: match.buyer_profile_id || match.counterpart_user_id || sessionId,
    role: match.kind,
  });

  // v13 — libellé de l'interlocuteur (isolation visible : 1 article × 1 contrepartie)
  const counterpartRef =
    match.counterpart_user_id || match.buyer_profile_id || null;
  const counterpartLabel = counterpartRef
    ? `${match.kind === "buyer" ? "vendeur" : "acheteur"} #${counterpartRef.slice(0, 6)}`
    : match.kind === "buyer"
      ? "le vendeur"
      : "l'acheteur";

  const dealContactLevel = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const meta = messages[index]?.meta || {};
      const level = meta.contactability_level || meta.contactability;
      if (level) return String(level);
      const result = Array.isArray(meta.results) ? meta.results[0] : Array.isArray(meta.products) ? meta.products[0] : null;
      const resultLevel = result?.contactability_level || result?.contactability;
      if (resultLevel) return String(resultLevel);
    }
    return null;
  }, [messages]);

  const latestDealIntent = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const intent = messages[index]?.meta?.intent;
      if (intent) return String(intent);
    }
    return "";
  }, [messages]);

  useEffect(() => {
    if (!active) return;
    onDealStateChange?.({
      active: true,
      title: match.title,
      role: match.kind,
      contactLevel: dealContactLevel,
      intent: latestDealIntent || null,
      closed,
      price: match.price,
      city: match.city ?? null,
    });
  }, [
    active,
    closed,
    dealContactLevel,
    latestDealIntent,
    match.city,
    match.kind,
    match.price,
    match.title,
    onDealStateChange,
  ]);

  const seedText = seedNotif?.text?.trim() || match.seed_text?.trim() || null;

  const isNewBuyerSeed =
    seedNotif?.notification_type === "new_buyer" ||
    !!seedText?.includes("Nouvel acheteur intéressé");
  // For the seller, only surface the "Nouvel acheteur intéressé" header when a
  // real buyer-interest notification exists. Right after publishing — when
  // only the seller's own "✅ Annonce publiée" ack is in the timeline — we
  // show the publication header instead of inventing a phantom buyer.
  const seedTitle =
    match.kind === "seller"
      ? isNewBuyerSeed
        ? "📩 Nouvel acheteur intéressé"
        : "✅ Annonce publiée"
      : isNewBuyerSeed
        ? "📩 Nouvel acheteur intéressé"
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
      {/* Deal Room — 1 article × 1 interlocuteur */}
      <div className="shrink-0 border-b border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-cyan-50/70 px-2.5 py-1.5">
        <div className="flex items-center gap-2.5">
          <WaouhMuseAvatar mode={match.kind === "buyer" ? "buyer" : "seller"} phase={closed ? "success" : "negotiating"} size="sm" />
          {match.photo ? (
            <img src={match.photo} alt="" className="h-8 w-8 rounded-lg border border-white object-cover shadow-sm" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-emerald-700 shadow-sm">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                <Sparkles className="h-2.5 w-2.5" /> WAOUH Deal Room
              </span>
              <span className="text-[10px] font-bold text-emerald-900">
                {match.kind === "buyer" ? "Avatar négocie côté acheteur" : "Avatar accompagne la vente"}
              </span>
              {dealContactLevel && <WaouhContactabilityBadge level={dealContactLevel} showCode />}
              {closed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Finalisée
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-sm font-black text-slate-950">{match.title}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-600">
              {match.price ? <span className="font-bold text-emerald-700">{Number(match.price).toLocaleString("fr-FR")} FCFA</span> : null}
              {match.city ? <span>📍 {match.city}</span> : null}
              <span>{match.kind === "buyer" ? "Vendeur" : "Acheteur"} : {counterpartLabel}</span>
              {latestDealIntent && <span className="hidden sm:inline">· {latestDealIntent.replace(/_/g, " ")}</span>}
            </div>
          </div>
          <div className="hidden rounded-xl border bg-white/85 px-2.5 py-1.5 text-right sm:block">
            <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-slate-500">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Canal WAOUH protégé
            </div>
            <div className="mt-0.5 text-[9px] text-slate-400">{matchLabel} · {(match.article_id || "").slice(0, 8)}</div>
          </div>
        </div>
        <div className="hidden">
          {syncedAt && !closed ? (
            <span className="inline-flex items-center gap-1 rounded-full border bg-white/70 px-2 py-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Synchronisé · {dbMsgCount} msg
            </span>
          ) : initialLoading && !syncedAt ? (
            <span className="inline-flex items-center gap-1 rounded-full border bg-white/70 px-2 py-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Synchronisation…
            </span>
          ) : null}
          {!dealContactLevel && <span>Contact Layer actif · aucune coordonnée privée exposée</span>}
        </div>
      </div>

      {/* Résumé IA disponible à la demande afin de préserver la hauteur du fil. */}
      <details className="mx-2 mt-1 shrink-0 rounded-xl border border-emerald-100 bg-white/90">
        <summary className="cursor-pointer select-none px-3 py-1.5 text-[10px] font-bold text-emerald-800">
          ✨ Résumé IA de la négociation
        </summary>
        <div className="px-2 pb-2">
          <WaouhArticleSummary
            messages={messages.map((m) => ({ direction: m.direction, text: m.text, created_at: m.created_at }))}
            title={match.title}
            price={match.price}
            role={match.kind}
            closed={closed}
          />
        </div>
      </details>

      {/* Messages area — same WAOUH doodle background */}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2 waouh-chat-bg">
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

        {seedText && (
          <div className="mr-auto max-w-[88%] rounded-2xl rounded-bl-sm border bg-card px-3 py-2 text-sm shadow-sm">
            <div className="whitespace-pre-wrap break-words leading-relaxed">{seedText}</div>
          </div>
        )}


        {hasMore && (
          <div ref={topSentinelRef} className="flex items-center justify-center py-2 text-xs text-muted-foreground">
            {loadingOlder ? <Loader2 className="w-3 h-3 animate-spin" /> : "↑ Charger plus d'historique"}
          </div>
        )}

        {messages.map((m) => {
          const rich = normalizeChatReply(m);
          return (

          <div
            key={m.id}
            className={cn(
              "flex items-start gap-2",
              m.direction === "in" ? "justify-end" : "justify-start"
            )}
          >
            {m.direction === "out" && (
              <WaouhMuseAvatar
                mode={match.kind === "buyer" ? "buyer" : "seller"}
                phase={closed ? "success" : "negotiating"}
                size="sm"
                className="mt-0.5 hidden sm:block"
              />
            )}
            <div
              className={cn(
                "min-w-0 rounded-3xl px-3 py-2 text-sm break-words shadow-sm",
                (rich.results.length > 0 || rich.blocks.length > 0) && "w-full max-w-[860px]",
                m.direction === "in"
                  ? "max-w-[90%] sm:max-w-[86%] bg-slate-950 text-white rounded-br-lg"
                  : "max-w-[92%] sm:max-w-[88%] bg-white border border-slate-200 rounded-bl-lg"
              )}
            >
              {m.direction === "out" && (
                <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">
                  <Sparkles className="h-3 w-3" /> WAOUH
                </div>
              )}
            {/* Fiches produit (article + ses photos) si le moteur en a renvoyé */}
            {rich.results.length > 0 ? (
              <WaouhProductResults results={rich.results} compact />
            ) : (
              Array.isArray(m.attachments) &&
              m.attachments.map((a: any, i: number) => (
                <ChatImage
                  key={i}
                  src={a.url}
                  alt=""
                  gallery={m.attachments.map((x: any) => ({ url: x.url, caption: x.caption || undefined }))}
                  index={i}
                  className="mb-1 max-h-[64dvh] rounded-lg bg-black/[0.03]"
                  imgClassName="max-h-[64dvh] object-contain"
                />
              ))
            )}
            {rich.text && <div className="whitespace-pre-wrap">{rich.text}</div>}
            {rich.blocks.length > 0 && <WaouhAgentBlocks blocks={rich.blocks} onAction={authUserId ? handleAgentAction : undefined} busy={!!agentAction} />}
            {m.direction === "out" && Array.isArray(m.meta?.actions) && m.meta.actions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(m.meta.actions as Array<{ id?: string; label?: string }>).slice(0, 4).map((action, index) => {
                  const actionId = String(action.id || "").trim();
                  const label = String(action.label || actionId || "Choisir").trim();
                  return (
                    <Button
                      key={`${actionId}-${index}`}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 rounded-xl text-xs"
                      disabled={sending || !actionId}
                      onClick={() => {
                        if (/contre-proposition|counter/i.test(actionId)) {
                          setInput("Je propose ");
                          setTimeout(() => textareaRef.current?.focus(), 0);
                          return;
                        }
                        const isDealAction = /^(?:payer-mobile|paiement-livraison|confirmer-disponibilite|confirmer-paiement-cash|confirmer-paiement-mobile|annuler):/i.test(actionId);
                        const visibleText = isDealAction
                          ? label
                          : /accepter|^oui/i.test(actionId)
                            ? "OUI"
                            : /refuser|^non/i.test(actionId)
                              ? "NON"
                              : actionId;
                        void sendMessage(visibleText, {
                          button_payload: actionId,
                          thread_id: m.meta?.thread_id ?? latestCommerceScope.thread_id ?? null,
                          negotiation_id: m.meta?.negotiation_id ?? latestCommerceScope.negotiation_id ?? null,
                          deal_id: m.meta?.deal_id ?? latestCommerceScope.deal_id ?? null,
                        });
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        ); })}

        {/* Empty-state hint: sync done but no message reachable for this viewer */}
        {!initialLoading && syncedAt && messages.length === 0 && !seedText && (
          <div className="mx-auto max-w-[92%] rounded-xl border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-3 text-center text-xs text-muted-foreground">
            Aucun message chargé depuis la base pour cette session.
            {closed ? " La conversation est clôturée." : " Essayez de vous reconnecter avec le compte d'origine pour retrouver l'historique."}
          </div>
        )}
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
            placeholder={match.kind === "buyer" ? "Votre réponse au vendeur…" : "Votre réponse à l’acheteur…"}
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
