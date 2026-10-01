import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChatRightPane, ChatRightPaneEmpty } from "../components/ChatRightPane";
import { useWaouhMatchChats } from "@/components/waouh/useWaouhMatchChats";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useMobileProfile } from "../hooks/useMobileProfile";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { useWaouhIdentity } from "../hooks/useWaouhIdentity";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, ShoppingBag, Menu, Radar as RadarIcon, Sparkles, PanelLeftClose, PanelLeftOpen, ArrowUp, Tag, Handshake, MessageCircle, ChevronRight, ShoppingCart, ArrowLeftRight, MessagesSquare } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { chatSpaceMode, readDrawerPinned, unreadBadge, writeDrawerPinned } from "../utils/chatSpaceLayout";
import { useNotifications } from "../hooks/useNotifications";

import { WaouhNotificationsBell } from "@/components/waouh/WaouhNotificationsBell";
import { useWaouhMatchNotifications } from "@/hooks/useWaouhMatchNotifications";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatConvLabel,
  convInitials,
  channelBadge,
  type WaouhUserLike,
} from "../utils/chatLabel";
import WaouhDemoMockup from "../components/WaouhDemoMockup";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { BotGreeting, botActivityLine } from "@/components/waouh/bot/BotGreeting";
import type { BotExpression } from "@/components/waouh/bot/BotCharacter";
import { BotWorkingStrip } from "@/components/waouh/bot/BotWorkingStrip";
import { WaouhMatchChatList } from "@/components/waouh/WaouhMatchChatList";
import { StatusesPanel } from "@/components/waouh/statuses/StatusesPanel";
import { RadarPanel } from "../components/radar/RadarPanel";

type Conv = {
  id: string;
  phone_number: string | null;
  channel: string | null;
  last_message: string | null;
  updated_at: string;
  user_id: string | null;
};

type ChatTab = "chats" | "statuses" | "radar";

function formatStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Aujourd'hui · ${time}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Hier · ${time}`;
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return `${d.toLocaleDateString("fr-FR", { weekday: "short" })} · ${time}`;
  const datePart = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: d.getFullYear() === now.getFullYear() ? undefined : "2-digit",
  });
  return `${datePart} · ${time}`;
}

export default function ChatListScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const isMobile = useIsMobile();

  // Force re-render on viewport changes so the 2-col layout toggles smoothly
  const [, setVw] = useState<number>(() => (typeof window !== "undefined" ? window.innerWidth : 0));
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  // Espace de chat : conversation au premier plan, Échanges / Statuts / Radar dans un tiroir (épinglable sur grand écran).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPinned, setDrawerPinned] = useState<boolean>(() => readDrawerPinned());
  const spaceMode = chatSpaceMode(typeof window !== "undefined" ? window.innerWidth : 0, drawerPinned);
  const togglePinned = () => {
    const next = !drawerPinned;
    setDrawerPinned(next);
    writeDrawerPinned(next);
    if (next) setDrawerOpen(false);
  };

  const { user } = useMobileAuth();
  const { profile } = useMobileProfile();
  const { waouhUserIds, sessionId, ready } = useWaouhIdentity();

  // Snapshot hydration: render instantly from localStorage while the network
  // refetch happens in background. Eliminates blank screen on slow connections.
  const snapshotKey = `waouh_chatlist_snapshot_v1:${user?.id ?? sessionId ?? "anon"}`;
  const [convs, setConvs] = useState<Conv[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(snapshotKey) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.convs) ? parsed.convs : [];
    } catch { return []; }
  });
  const [users, setUsers] = useState<Record<string, WaouhUserLike>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(snapshotKey) : null;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed?.users && typeof parsed.users === "object") ? parsed.users : {};
    } catch { return {}; }
  });
  const [loading, setLoading] = useState(convs.length === 0);
  const [q, setQ] = useState("");
  const [botExpression, setBotExpression] = useState<BotExpression>("idle");
  const [botLeaving, setBotLeaving] = useState(false);
  /** Bot glisse vers la conversation, puis l'action s'ouvre. */
  const glideThen = (action: () => void) => {
    setBotExpression("think");
    setBotLeaving(true);
    window.setTimeout(() => {
      action();
      window.setTimeout(() => setBotLeaving(false), 400);
    }, 420);
  };
  const askBot = (prompt: string) => {
    const target = `/app/chat/waouh?prefill=${encodeURIComponent(prompt)}`;
    if (!requireAuth(target)) return;
    navigate(target);
  };

  const tabFromUrl = (): ChatTab => {
    const value = params.get("tab");
    return value === "statuses" || value === "radar" ? value : "chats";
  };
  const [tab, setTab] = useState<ChatTab>(() => tabFromUrl());

  useEffect(() => {
    const next = tabFromUrl();
    setTab((current) => (current === next ? current : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setChatTab = (next: ChatTab) => {
    setTab(next);
    const updated = new URLSearchParams(params);
    if (next === "chats") updated.delete("tab");
    else updated.set("tab", next);
    setParams(updated, { replace: true });
  };

  // Desktop right-pane state
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [newWaouhCounter, setNewWaouhCounter] = useState(0);

  // Lift the WAOUH match chats hook so we can set the active key from the list.
  const matchChats = useWaouhMatchChats(sessionId ?? "", user?.id ?? null);

  // When a match-chat open intent is dispatched/buffered, clear conv selection
  // so the WaouhMatchChatWindow takes over the right pane.
  useEffect(() => {
    if (!isDesktop) return;
    const onMatch = () => { setActiveConvId(null); setDrawerOpen(false); };
    window.addEventListener("waouh:open-match-chat", onMatch);
    return () => window.removeEventListener("waouh:open-match-chat", onMatch);
  }, [isDesktop]);

  const isGuest = !user;

  useEffect(() => {
    if (!ready) return;
    if (isGuest) { setConvs([]); setUsers({}); setLoading(false); return; }
    let mounted = true;
    const load = async () => {
      const fields = "id,phone_number,channel,last_message,updated_at,user_id";
      const all: Record<string, Conv> = {};
      if (waouhUserIds.length) {
        const { data } = await supabase
          .from("waouh_conversations")
          .select(fields)
          .in("user_id", waouhUserIds)
          .order("updated_at", { ascending: false })
          .limit(200);
        (data ?? []).forEach((c: any) => { all[c.id] = c; });
      }
      // Also surface conversations reachable from this device's session messages
      if (sessionId) {
        const { data: msgs } = await supabase
          .from("waouh_messages")
          .select("conversation_id")
          .eq("web_session_id", sessionId)
          .not("conversation_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(500);
        const ids = Array.from(new Set((msgs ?? []).map((m: any) => m.conversation_id).filter(Boolean)));
        const missing = ids.filter((id) => !all[id]);
        if (missing.length) {
          const { data: extra } = await supabase
            .from("waouh_conversations")
            .select(fields)
            .in("id", missing)
            .limit(200);
          (extra ?? []).forEach((c: any) => { all[c.id] = c; });
        }
      }
      const list = Object.values(all).sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // Fetch user metadata for friendly labels
      const userIds = Array.from(new Set(list.map((c) => c.user_id).filter(Boolean))) as string[];
      const userMap: Record<string, WaouhUserLike> = {};
      if (userIds.length) {
        const { data: us } = await supabase
          .from("waouh_users")
          .select("id,display_name,phone_number,channel,auth_user_id")
          .in("id", userIds);
        (us ?? []).forEach((u: any) => { userMap[u.id] = u; });
      }

      if (mounted) {
        setConvs(list);
        setUsers(userMap);
        setLoading(false);
        // Persist snapshot for instant hydration on next visit / offline.
        try {
          const slim = list.slice(0, 50);
          localStorage.setItem(snapshotKey, JSON.stringify({ convs: slim, users: userMap, ts: Date.now() }));
        } catch {}
      }
    };
    load();
    const channels: any[] = [];
    for (const uid of waouhUserIds) {
      channels.push(
        supabase.channel(`mobile-conv-list-${uid}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "waouh_conversations", filter: `user_id=eq.${uid}` }, load)
          .subscribe()
      );
    }
    return () => { mounted = false; channels.forEach((c) => supabase.removeChannel(c)); };
  }, [ready, waouhUserIds.join("|"), sessionId, isGuest, snapshotKey]);

  const enriched = useMemo(
    () => convs.map((c) => {
      const u = c.user_id ? users[c.user_id] : null;
      const label = formatConvLabel(c, u);
      return { ...c, _label: label, _user: u, _badge: channelBadge(c.channel ?? u?.channel) };
    }),
    [convs, users]
  );

  const filtered = useMemo(
    () => enriched.filter((c) => {
      if (!q) return true;
      const needle = q.toLowerCase();
      return (
        c._label.toLowerCase().includes(needle) ||
        (c.last_message ?? "").toLowerCase().includes(needle) ||
        (c.phone_number ?? "").toLowerCase().includes(needle)
      );
    }),
    [enriched, q]
  );

  const convIds = useMemo(() => convs.map((c) => c.id), [convs]);
  const unread = useUnreadCounts(convIds, user?.id);

  const initials = (profile?.full_name ?? profile?.phone ?? "U").slice(0, 2).toUpperCase();

  const goToAuth = (target: string) => {
    try { sessionStorage.setItem("waouh_post_auth_redirect", target); } catch {}
    navigate("/app/auth/email?tab=login", { state: { from: target } });
  };

  const requireAuth = (target: string): boolean => {
    if (!isGuest) return true;
    goToAuth(target);
    return false;
  };
  const openWaouh = () => {
    if (!requireAuth("/app/chat/waouh")) return;
    if (isDesktop) {
      setDrawerOpen(false);
      setActiveConvId(null);
      matchChats.setActiveKey("main");
    } else {
      navigate("/app/chat/waouh");
    }
  };
  const openNewWaouh = () => {
    if (!requireAuth("/app/chat/waouh?new=1")) return;
    if (isDesktop) {
      setDrawerOpen(false);
      setActiveConvId(null);
      matchChats.setActiveKey("main");
      setNewWaouhCounter((n) => n + 1);
    } else {
      navigate("/app/chat/waouh?new=1");
    }
  };
  const openConv = (id: string) => {
    if (isDesktop) {
      setDrawerOpen(false);
      setActiveConvId(id);
    } else {
      navigate(`/app/chat/${id}`);
    }
  };
  const { unread: notifUnread } = useNotifications();
  const { permission, requestPermission, notifications: waouhNotifs, unreadCount: waouhUnread, markAllRead: waouhMarkAllRead, markRead: waouhMarkRead, clearAll: waouhClearAll } =
    useWaouhMatchNotifications(sessionId ?? "", user?.id ?? null);

  const listContent = (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-gradient-to-br from-white via-sky-50/70 to-emerald-50/70 text-slate-950 backdrop-blur">

        <div className="px-4 py-3 flex items-center justify-between">
          {isGuest ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-sm">W</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-sm font-black leading-tight">Bonjour, WaouhApp</div>
                <div className="text-[11px] text-slate-500 leading-tight">Mode invité</div>
              </div>
            </div>
          ) : (
            <button onClick={() => navigate("/app/profile")} className="flex items-center gap-2 active:opacity-70">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-sm font-black leading-tight">Bonjour, {profile?.full_name ?? "WaouhApp"}</div>
                <div className="text-[11px] text-slate-500 leading-tight truncate max-w-[210px]">WAOUH actif</div>
              </div>
            </button>
          )}
          <div className="flex items-center gap-1">
            {isGuest ? (
              <Button size="sm" className="h-8 bg-teal-600 text-white hover:bg-teal-700" onClick={() => goToAuth("/app/chat")}>
                Se connecter
              </Button>
            ) : (
              <>
                <div className="[&_button]:text-slate-700 [&_button:hover]:bg-white/80">
                  <WaouhNotificationsBell
                    permission={permission}
                    notifications={waouhNotifs}
                    unreadCount={waouhUnread}
                    onRequestPermission={requestPermission}
                    onMarkAllRead={waouhMarkAllRead}
                    onMarkRead={waouhMarkRead}
                    onClearAll={waouhClearAll}
                  />
                </div>
                <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-white/80" onClick={openNewWaouh} aria-label="Nouvel objectif WAOUH">
                  <Plus className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
        {!isGuest && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un échange, un produit, un contact…" className="h-10 rounded-2xl border-slate-200 bg-white/90 pl-9 text-slate-900 shadow-sm placeholder:text-slate-400" />
            </div>
          </div>
        )}
      </header>

      {!isGuest && (
        <div className="sticky top-[var(--waouh-tabs-top,0)] z-[9] bg-white/90 px-3 py-2 backdrop-blur">
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm">
            {[
              { k: "chats", label: "Échanges" },
              { k: "statuses", label: "Statuts" },
              { k: "radar", label: "Radar" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setChatTab(t.k as ChatTab)}
                className={
                  "min-w-0 rounded-xl px-2 py-2 text-xs font-extrabold transition-all sm:text-sm " +
                  (tab === t.k
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white/80")
                }
              >
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "statuses" && !isGuest ? (
        <StatusesPanel variant="mobile" query={q} />
      ) : tab === "radar" && !isGuest ? (
        <RadarPanel query={q} />
      ) : (
      <main className="px-[clamp(12px,3.5vw,24px)] pb-6 pt-3">
        {/* UI V3 — Bot est le cœur de WAOUH : il accueille, explique ce qu'il fait et mène les échanges. */}
        <section
          data-waouh-ui="bot-avatar-v3"
          className="relative mx-auto mb-4 w-full max-w-[760px] overflow-hidden rounded-[30px] border border-cyan-100/80 bg-[radial-gradient(circle_at_18%_22%,rgba(34,211,238,.24),transparent_40%),radial-gradient(circle_at_95%_0%,rgba(139,92,246,.14),transparent_34%),linear-gradient(140deg,#e9fbfb_0%,#ffffff_48%,#f3f1ff_100%)] p-[clamp(14px,4vw,26px)] shadow-[0_28px_70px_-42px_rgba(14,116,144,.6)]"
        >
          <Sparkles className="pointer-events-none absolute right-5 top-5 h-6 w-6 text-cyan-400/80 motion-safe:animate-pulse" aria-hidden />
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[clamp(12px,3.5vw,24px)]">
            <button
              type="button"
              onClick={() => navigate("/app/avatar")}
              className="rounded-full transition active:scale-[.97]"
              aria-label="Ouvrir Bot, mon Avatar IA"
            >
              <span className="botc-glide inline-flex" data-leaving={botLeaving}>
                <BotLiveAvatar size="clamp(104px, 30vw, 176px)" expression={botExpression} />
              </span>
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[clamp(30px,8.5vw,46px)] font-black leading-none tracking-[-.05em] text-slate-950">Bot</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white/85 px-2.5 py-1 text-[clamp(10.5px,2.8vw,12px)] font-bold text-emerald-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> En ligne
                </span>
              </div>
              <p className="mt-1 text-[clamp(12px,3.2vw,14px)] font-bold text-slate-500">Votre Avatar IA</p>
              <BotGreeting
                firstName={isGuest ? null : profile?.full_name}
                thirdLine={botActivityLine(matchChats.matches?.length ?? 0, "Deal Room")}
                onExpressionChange={setBotExpression}
                choices={[
                  { label: "Acheter", onSelect: () => glideThen(() => askBot("Je veux acheter ")) },
                  { label: "Vendre", onSelect: () => glideThen(() => askBot("Je veux vendre ")) },
                  { label: "Trouver une opportunité", onSelect: () => glideThen(() => navigate("/app/nexus")) },
                ]}
                className="mt-[clamp(8px,2.4vw,14px)]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => glideThen(openNewWaouh)}
            onPointerEnter={() => setBotExpression("listen")}
            onPointerLeave={() => setBotExpression("idle")}
            className="mt-[clamp(12px,3.5vw,18px)] flex h-[clamp(48px,12vw,56px)] w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white pl-4 pr-1.5 text-left shadow-sm transition hover:border-cyan-200 active:scale-[.99]"
            aria-label="Demander à Bot"
          >
            <Sparkles className="h-[clamp(16px,4vw,20px)] w-[clamp(16px,4vw,20px)] shrink-0 text-teal-600" />
            <span className="min-w-0 flex-1 truncate text-[clamp(14px,3.6vw,16px)] font-medium text-slate-400">Demandez à Bot…</span>
            <span className="grid h-[clamp(38px,10vw,44px)] w-[clamp(38px,10vw,44px)] shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
              <ArrowUp className="h-5 w-5" />
            </span>
          </button>

          <div className="mt-[clamp(10px,2.6vw,14px)] grid grid-cols-3 gap-[clamp(6px,1.8vw,10px)]">
            {[
              { label: "Démarrer", sub: "avec Bot", Icon: MessageCircle, onClick: openNewWaouh, primary: true },
              { label: "Trouver", sub: "une opportunité", Icon: Search, onClick: () => navigate("/app/nexus"), primary: false },
              { label: "Négocier", sub: "avec Bot", Icon: Handshake, onClick: openNewWaouh, primary: false },
            ].map(({ label, sub, Icon, onClick, primary }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={
                  "flex min-h-[clamp(60px,16vw,64px)] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 text-center shadow-sm transition active:scale-[.97] min-[480px]:flex-row min-[480px]:gap-2 min-[480px]:text-left " +
                  (primary
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white"
                    : "border border-slate-200/80 bg-white/90 text-slate-800 hover:bg-white")
                }
              >
                <Icon className={"h-[clamp(18px,4.8vw,22px)] w-[clamp(18px,4.8vw,22px)] shrink-0 " + (primary ? "text-white" : "text-blue-600")} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[clamp(12px,3.2vw,14px)] font-black">{label}</span>
                  <span className={"block truncate text-[clamp(10.5px,2.8vw,12px)] font-semibold " + (primary ? "text-white/80" : "text-slate-400")}>{sub}</span>
                </span>
              </button>
            ))}
          </div>

          <BotWorkingStrip activeDeals={matchChats.matches?.length ?? 0} className="mt-[clamp(10px,2.6vw,14px)]" />
        </section>

        {/* WAOUH One — le moteur commerce, en accès direct sous Bot. */}
        <section className="mx-auto mb-4 w-full max-w-[760px] rounded-[26px] border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-cyan-50/80 p-[clamp(12px,3.5vw,18px)] shadow-sm">
          <button type="button" onClick={openWaouh} className="flex w-full items-center gap-3 text-left">
            <span className="grid h-[clamp(40px,11vw,48px)] w-[clamp(40px,11vw,48px)] shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-md">
              <ShoppingBag className="h-[55%] w-[55%]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[clamp(16px,4.4vw,20px)] font-black tracking-tight text-slate-950">
                WAOUH One <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="block truncate text-[clamp(11.5px,3vw,13px)] font-semibold text-slate-500">Achetez, vendez, comparez et négociez en confiance.</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </button>
          <div className="mt-3 grid grid-cols-4 gap-[clamp(6px,1.8vw,10px)]">
            {[
              { label: "Acheter", Icon: ShoppingCart, tint: "text-emerald-600 bg-emerald-50" },
              { label: "Vendre", Icon: Tag, tint: "text-blue-600 bg-blue-50" },
              { label: "Chercher", Icon: Search, tint: "text-violet-600 bg-violet-50" },
              { label: "Comparer", Icon: ArrowLeftRight, tint: "text-amber-600 bg-amber-50" },
            ].map(({ label, Icon, tint }) => (
              <button
                key={label}
                type="button"
                onClick={openNewWaouh}
                className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-white bg-white/90 px-1 py-[clamp(8px,2.4vw,12px)] shadow-sm transition hover:bg-white active:scale-[.97]"
              >
                <span className={"grid h-[clamp(30px,8vw,38px)] w-[clamp(30px,8vw,38px)] place-items-center rounded-xl " + tint}>
                  <Icon className="h-[60%] w-[60%]" />
                </span>
                <span className="max-w-full truncate text-[clamp(11px,2.9vw,13px)] font-bold text-slate-800">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {!isGuest && (
          <div className="mx-auto mb-2 flex w-full max-w-[760px] items-center gap-2 px-1">
            <MessagesSquare className="h-5 w-5 text-blue-600" />
            <h3 className="text-[clamp(15px,4vw,17px)] font-black text-slate-950">Conversations & Deals</h3>
          </div>
        )}

        {/* Per-product chat windows (buyer-found & interested-buyer) appear directly under WAOUH */}
        <WaouhMatchChatList sessionId={sessionId} authUserId={profile?.id ?? null} query={q} />


        {isGuest && (
          <details className="group mx-auto mt-2 w-full max-w-[760px] rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm shadow-sm">
            <summary className="cursor-pointer list-none text-center font-bold text-teal-700 marker:hidden">
              Voir WAOUH en action
            </summary>
            <WaouhDemoMockup />
          </details>
        )}

        {loading && <div className="p-8 text-center text-muted-foreground">Chargement…</div>}

        {!loading && !isGuest && filtered.length === 0 && (
          <div className="rounded-2xl bg-white/70 p-8 text-center text-muted-foreground">
            <p className="font-medium mb-1">Aucune autre conversation</p>
            <p className="text-sm mb-4">Envoyez un message à WAOUH et le Monde achète. ☝️</p>
            <Button onClick={openNewWaouh} className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]">
              <Plus className="h-4 w-4 mr-1" /> Nouveau chat WAOUH
            </Button>
          </div>
        )}

        <ul className="divide-y">
          {filtered.map((c) => {
            const n = unread[c.id] ?? 0;
            const isActive = isDesktop && activeConvId === c.id;
            return (
              <li
                key={c.id}
                onClick={() => openConv(c.id)}
                className={
                  "flex items-center gap-3 px-4 py-3 active:bg-muted cursor-pointer backdrop-blur-sm " +
                  (isActive ? "bg-[hsl(165_91%_25%)]/10" : "bg-background/70")
                }
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-[hsl(165_91%_25%)] text-white">{convInitials(c._label)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className={"truncate flex items-center gap-1.5 " + (n > 0 ? "font-bold" : "font-semibold")}>
                      {c._label}
                      <Badge className={`${c._badge.tint} border-0 text-[9px] py-0 px-1.5 h-4`}>{c._badge.label}</Badge>
                    </span>
                    <span className={"text-xs shrink-0 ml-2 " + (n > 0 ? "text-[hsl(165_91%_30%)] font-semibold" : "text-muted-foreground")}>
                      {formatStamp(c.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={"text-sm truncate flex-1 " + (n > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {c.last_message ?? `Canal: ${c.channel ?? "—"}`}
                    </p>
                    {n > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[hsl(165_91%_35%)] text-white text-[11px] font-bold shrink-0">
                        {n > 99 ? "99+" : n}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
      )}
    </>
  );

  // Lien direct (?tab=radar / ?tab=statuses) : le tiroir s'ouvre sur le bon onglet.
  const deepLinkedTab = params.get("tab");
  useEffect(() => {
    if (spaceMode === "drawer" && (deepLinkedTab === "radar" || deepLinkedTab === "statuses")) setDrawerOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkedTab]);

  if (spaceMode !== "stack" && !isGuest) {
    const totalUnread = Object.values(unread).reduce((sum, n) => sum + (n || 0), 0);
    const unreadLabel = unreadBadge(totalUnread);
    const openDrawerOn = (next: ChatTab) => { setChatTab(next); setDrawerOpen(true); };
    const chip = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-emerald-50 active:scale-95 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:px-3";
    const headerLeading = spaceMode === "pinned" ? (
      <button type="button" onClick={togglePinned} className={chip} aria-label="Masquer les échanges" title="Masquer le panneau (il reste accessible en un clic)">
        <PanelLeftClose className="h-4 w-4" />
      </button>
    ) : (
      <div className="flex shrink-0 items-center gap-1.5" data-testid="chat-space-toolbar">
        <button type="button" onClick={() => openDrawerOn("chats")} className={chip} aria-label="Ouvrir mes échanges" data-testid="chat-space-open">
          <Menu className="h-4 w-4" />
          <span className="hidden lg:inline">Échanges</span>
          {unreadLabel && <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-black leading-4 text-white">{unreadLabel}</span>}
        </button>
        <button type="button" onClick={() => openDrawerOn("radar")} className={chip} aria-label="Ouvrir le radar">
          <RadarIcon className="h-4 w-4" /><span className="hidden lg:inline">Radar</span>
        </button>
        <button type="button" onClick={() => openDrawerOn("statuses")} className={chip} aria-label="Ouvrir les statuts">
          <Sparkles className="h-4 w-4" /><span className="hidden lg:inline">Statuts</span>
        </button>
      </div>
    );
    const headerTrailing = window.innerWidth >= 1280 && spaceMode === "drawer" ? (
      <button type="button" onClick={togglePinned} className={chip} aria-label="Épingler les échanges à côté du chat" title="Épingler le panneau à côté du chat">
        <PanelLeftOpen className="h-4 w-4" />
      </button>
    ) : null;
    return (
      <div className="flex h-[calc(100dvh-64px)] w-full bg-background">
        {spaceMode === "pinned" && (
          <aside className="w-[380px] shrink-0 overflow-y-auto border-r border-border waouh-chat-list-bg">
            {listContent}
          </aside>
        )}
        <section className="min-w-0 flex-1 overflow-hidden">
          {sessionId ? (
            <ChatRightPane
              sessionId={sessionId}
              authUserId={user?.id ?? null}
              activeConvId={activeConvId}
              newWaouhCounter={newWaouhCounter}
              matchChats={matchChats}
              headerLeading={headerLeading}
              headerTrailing={headerTrailing}
            />
          ) : (
            <ChatRightPaneEmpty />
          )}
        </section>
        {spaceMode === "drawer" && (
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent side="left" className="w-[min(400px,92vw)] overflow-y-auto p-0 waouh-chat-list-bg sm:max-w-[400px]" data-testid="chat-space-drawer">
              <SheetHeader className="sr-only">
                <SheetTitle>Échanges, statuts et radar</SheetTitle>
                <SheetDescription>Vos conversations, vos statuts de 24 h et le radar WAOUH.</SheetDescription>
              </SheetHeader>
              {listContent}
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] waouh-chat-list-bg">
      {listContent}
    </div>
  );
}