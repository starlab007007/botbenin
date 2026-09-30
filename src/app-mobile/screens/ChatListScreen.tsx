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
import { Search, Plus, ShoppingBag, Menu, Radar as RadarIcon, Sparkles, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
import { WaouhMuseAvatar } from "@/components/waouh/WaouhMuseAvatar";
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
                <div className="text-[11px] text-slate-500 leading-tight">Centre des conversations · Mode invité</div>
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
                <div className="text-[11px] text-slate-500 leading-tight truncate max-w-[210px]">Centre des conversations · WAOUH actif</div>
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
      <main className="px-3 pb-4">
        {/* Bot — point d'entrée principal : guide la conversation sans modifier le moteur. */}
        <section className="mb-3 overflow-hidden rounded-[26px] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 shadow-[0_16px_40px_rgba(59,130,246,.08)]">
          <div className="flex items-center gap-3">
            <WaouhMuseAvatar phase="idle" size="lg" className="scale-110" />
            <button type="button" onClick={() => navigate("/app/avatar")} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="truncate text-2xl font-black tracking-tight text-slate-950">Bot</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.85)]" />
                <Badge variant="outline" className="h-5 rounded-full border-cyan-200 bg-white/80 px-2 text-[9px] font-black text-cyan-700">Avatar IA</Badge>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500 sm:text-sm">Je vous aide à trouver, négocier et conclure.</p>
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" onClick={openWaouh} className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 px-2 py-2.5 text-[11px] font-black text-white shadow-sm sm:text-xs">
              Démarrer
            </button>
            <button type="button" onClick={openWaouh} className="rounded-2xl border border-blue-100 bg-white/90 px-2 py-2.5 text-[11px] font-black text-blue-700 shadow-sm sm:text-xs">
              Chercher
            </button>
            <button type="button" onClick={openWaouh} className="rounded-2xl border border-violet-100 bg-white/90 px-2 py-2.5 text-[11px] font-black text-violet-700 shadow-sm sm:text-xs">
              Négocier
            </button>
          </div>
        </section>

        {/* WAOUH One reste le moteur commerce, désormais en second niveau. */}
        <button
          onClick={openWaouh}
          className="mb-3 flex w-full items-center gap-3 rounded-[22px] border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-4 py-3 text-left shadow-sm transition active:scale-[.99]"
        >
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 shadow-md">
            <ShoppingBag className="h-6 w-6 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-base font-black text-slate-950">WAOUH One</span>
              <Badge className="h-4 border-0 bg-emerald-500 px-1.5 py-0 text-[9px] text-white">IA</Badge>
            </div>
            <p className="truncate text-xs font-semibold text-slate-500 sm:text-sm">Achetez, vendez, cherchez, comparez et négociez.</p>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-lg font-black text-emerald-700 shadow-sm">›</span>
        </button>

        {/* Per-product chat windows (buyer-found & interested-buyer) appear directly under WAOUH */}
        <WaouhMatchChatList sessionId={sessionId} authUserId={profile?.id ?? null} query={q} />


        {isGuest && (
          <div className="pt-5 pb-2 flex flex-col items-center text-center">
            <Button
              onClick={openNewWaouh}
              size="lg"
              className="w-full max-w-sm bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)] shadow-md"
            >
              <Plus className="h-5 w-5 mr-1" /> Nouvel objectif WAOUH
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Envoyez un message à WAOUH et le Monde achète. ☝️
            </p>
          </div>
        )}

        {isGuest && <WaouhDemoMockup />}

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