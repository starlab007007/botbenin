import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Handshake,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import WaouhWebChat, { type WaouhWebChatHandle } from "@/components/waouh/WaouhWebChat";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWaouhMatchNotifications } from "@/hooks/useWaouhMatchNotifications";
import { WaouhNotificationsBell } from "@/components/waouh/WaouhNotificationsBell";
import { WaouhChatSidebar } from "@/components/waouh/WaouhChatSidebar";
import { WaouhChatTabs } from "@/components/waouh/WaouhChatTabs";
import { WaouhMatchChatWindow, type MatchChatMeta } from "@/components/waouh/WaouhMatchChatWindow";
import { useWaouhMatchChats } from "@/components/waouh/useWaouhMatchChats";
import { openNotificationTarget } from "@/components/waouh/notificationActions";
import { WaouhDealPaymentDialog } from "@/components/waouh/WaouhDealPaymentDialog";
import { WaouhMuseAvatar } from "@/components/waouh/WaouhMuseAvatar";
import { WaouhUnifiedIntelligenceDock } from "@/components/waouh/WaouhUnifiedIntelligenceDock";
import {
  EMPTY_WAOUH_WORKSPACE_STATE,
  type WaouhWorkspaceAgentState,
  type WaouhWorkspaceDealState,
} from "@/lib/waouh/workspaceState";
import { cn } from "@/lib/utils";

const SESSION_KEY = "waouh_web_session_id";

function getSessionId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const QUICK_ACTIONS = [
  { icon: ShoppingBag, title: "Vendre", desc: "Décrivez l’offre, votre Avatar cherche des acheteurs." },
  { icon: Search, title: "Acheter", desc: "Décrivez le besoin, NEXUS cherche les vendeurs." },
  { icon: Handshake, title: "Négocier", desc: "La Deal Room garde un seul fil par opportunité." },
  { icon: BrainCircuit, title: "Avatar", desc: "Un seul assistant pilote tout le parcours." },
];

const EXAMPLES = [
  '"Je vends mon iPhone 14 Pro 256Go à Cotonou — 650 000 FCFA"',
  '"Je cherche un frigo d’occasion à Calavi, max 150 000 FCFA"',
  '"Trouve des acheteurs sérieux pour mes 10 tonnes de soja à Parakou"',
];

const HelpContent = () => (
  <div className="space-y-4">
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-cyan-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-black text-emerald-950">
        <Sparkles className="h-4 w-4" /> Un seul WAOUH
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Vous parlez à WAOUH. Votre Avatar comprend, NEXUS découvre, Signal Fabric classe, le Contact Layer protège et la Deal Room poursuit la négociation dans le même espace.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {QUICK_ACTIONS.map((action) => (
        <div key={action.title} className="rounded-2xl border border-slate-200 bg-white p-3">
          <action.icon className="mb-2 h-4 w-4 text-emerald-700" />
          <h3 className="text-xs font-black text-slate-900">{action.title}</h3>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{action.desc}</p>
        </div>
      ))}
    </div>
    <div>
      <div className="mb-2 text-xs font-black text-slate-800">Exemples</div>
      <div className="space-y-1.5">
        {EXAMPLES.map((example) => (
          <div key={example} className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">{example}</div>
        ))}
      </div>
    </div>
    <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-950 p-3 text-white">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <div className="text-[11px] leading-relaxed">
        Le Contact Layer C0–C4 s’applique avant toute révélation de coordonnées ou action de contact. Les actions sensibles restent sous votre contrôle.
      </div>
    </div>
  </div>
);

function computeRailWidth(): number {
  if (typeof window === "undefined") return 300;
  return window.innerWidth >= 1440 ? 320 : 292;
}

const PRESENCE_PHASE_LABEL: Record<WaouhWorkspaceAgentState["phase"], string> = {
  idle: "Prêt à chercher",
  listening: "Objectif compris",
  searching: "NEXUS cherche",
  comparing: "Signal Fabric compare",
  contacting: "Contact sécurisé",
  negotiating: "Deal Room active",
  success: "Objectif atteint",
};

export default function WaouhChatPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const sessionId = getSessionId();
  const chatRef = useRef<WaouhWebChatHandle>(null);

  const [railOpen, setRailOpen] = useState(false);
  const [railWidth, setRailWidth] = useState(computeRailWidth);
  const [agentState, setAgentState] = useState<WaouhWorkspaceAgentState>(EMPTY_WAOUH_WORKSPACE_STATE);
  const [dealState, setDealState] = useState<WaouhWorkspaceDealState | null>(null);
  const [payDialog, setPayDialog] = useState<{ dealId: string; amount?: number } | null>(null);

  const { permission, requestPermission, notifications, unreadCount, markAllRead, markRead, clearAll } =
    useWaouhMatchNotifications(sessionId, user?.id ?? null);

  const {
    matches,
    waouhIds,
    activeKey,
    setActiveKey,
    close,
    getCached,
    setCached,
    getHasMore,
    setHasMoreCached,
  } = useWaouhMatchChats(sessionId ?? "", user?.id ?? null);

  const activeMatch = matches.find((item) => item.key === activeKey) ?? null;

  useEffect(() => {
    const onResize = () => setRailWidth(computeRailWidth());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setDealState(null);
  }, [activeKey]);

  useEffect(() => {
    document.title = "WAOUH One — Agent commercial IA | bot.bj";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      const timer = setTimeout(() => {
        setActiveKey("main");
        chatRef.current?.startNewThread();
        navigate(location.pathname, { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, navigate, setActiveKey]);

  const handleNewGoal = () => {
    setActiveKey("main");
    setDealState(null);
    chatRef.current?.startNewThread();
    setTimeout(() => chatRef.current?.focusInput(), 0);
  };

  const handleOpenNotification = (notification: typeof notifications[number]) => {
    openNotificationTarget(notification, {
      beforeOpen: () => markRead(notification.id),
      onPayDialog: (args) => setPayDialog(args),
    });
  };

  const NotifButton = (
    <WaouhNotificationsBell
      permission={permission}
      notifications={notifications}
      unreadCount={unreadCount}
      onRequestPermission={requestPermission}
      onMarkAllRead={markAllRead}
      onMarkRead={markRead}
      onClearAll={clearAll}
    />
  );

  const resolvedDealState: WaouhWorkspaceDealState | null =
    activeKey !== "main" && activeMatch
      ? dealState ?? {
          active: true,
          title: activeMatch.title,
          role: activeMatch.kind,
          closed: activeMatch.closed,
          price: activeMatch.price,
          city: activeMatch.city ?? null,
        }
      : null;

  const renderSurface = (match: MatchChatMeta | null) => {
    if (!match || activeKey === "main") {
      return (
        <WaouhWebChat
          ref={chatRef}
          fullscreen
          onAgentStateChange={setAgentState}
          hideAgentBar
        />
      );
    }
    return (
      <WaouhMatchChatWindow
        match={match}
        sessionId={sessionId ?? ""}
        authUserId={user?.id ?? null}
        waouhIds={waouhIds}
        active
        getCached={getCached}
        setCached={setCached}
        getHasMore={getHasMore}
        setHasMoreCached={setHasMoreCached}
        onDealStateChange={setDealState}
      />
    );
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f6f8f7]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/95 px-2.5 backdrop-blur-xl">
          <button onClick={() => navigate("/")} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Fermer WAOUH">
            <X className="h-5 w-5 text-slate-700" />
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-1 py-1 text-left transition hover:bg-slate-50"
                aria-label="Ouvrir l’activité de l’Avatar"
              >
                <WaouhMuseAvatar
                  mode={resolvedDealState?.active ? (resolvedDealState.role === "seller" ? "seller" : "buyer") : agentState.mode}
                  phase={resolvedDealState?.active ? (resolvedDealState.closed ? "success" : "negotiating") : agentState.phase}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="truncate text-sm font-black text-slate-950">WAOUH One</div>
                    {(agentState.phase === "searching" || agentState.phase === "comparing" || resolvedDealState?.active) && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,.8)]" />
                    )}
                  </div>
                  <div className="truncate text-[10px] font-semibold text-slate-500">
                    {resolvedDealState?.active
                      ? resolvedDealState.closed ? "Deal conclu" : "Deal Room · Avatar accompagne"
                      : PRESENCE_PHASE_LABEL[agentState.phase]}
                  </div>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[82dvh] overflow-hidden rounded-t-[28px] p-0">
              <SheetHeader className="sr-only"><SheetTitle>Activité et intelligence WAOUH</SheetTitle></SheetHeader>
              <WaouhUnifiedIntelligenceDock
                compact
                state={agentState}
                deal={resolvedDealState}
                onNewGoal={handleNewGoal}
              />
            </SheetContent>
          </Sheet>

          {NotifButton}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Aide">
                <Info className="h-4.5 w-4.5 text-slate-600" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-[28px]">
              <SheetHeader><SheetTitle>WAOUH One</SheetTitle></SheetHeader>
              <div className="mt-3"><HelpContent /></div>
            </SheetContent>
          </Sheet>
        </header>

        {matches.length > 0 && (
          <WaouhChatTabs
            matches={matches}
            activeKey={activeKey}
            onSelect={setActiveKey}
            onClose={close}
            sessionId={sessionId ?? ""}
          />
        )}

        <main className="min-h-0 flex-1 overflow-hidden bg-white">
          {renderSurface(activeMatch)}
        </main>

        {payDialog && (
          <WaouhDealPaymentDialog
            open
            onOpenChange={(value) => { if (!value) setPayDialog(null); }}
            dealId={payDialog.dealId}
            amount={payDialog.amount}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col overflow-hidden bg-[#f4f7f6]",
      embedded ? "h-full" : "h-[100dvh]"
    )}>
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-200/80 bg-white/90 px-3.5 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => setRailOpen((value) => !value)}
          aria-label={railOpen ? "Masquer les conversations" : "Afficher les conversations"}
        >
          {railOpen ? <PanelLeftClose className="h-4.5 w-4.5" /> : <PanelLeftOpen className="h-4.5 w-4.5" />}
        </Button>

        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <WaouhMuseAvatar
            mode={resolvedDealState?.active ? (resolvedDealState.role === "seller" ? "seller" : "buyer") : agentState.mode}
            phase={resolvedDealState?.active ? (resolvedDealState.closed ? "success" : "negotiating") : agentState.phase}
            size="sm"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-slate-950">WAOUH One</span>
              <Badge variant="outline" className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[9px] font-black text-emerald-800">
                IA
              </Badge>
            </div>
            <div className="truncate text-[10px] font-semibold text-slate-500">
              Un chat · un agent · tout le marché
            </div>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="group flex min-w-0 max-w-[620px] items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-2.5 py-1.5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/45"
                aria-label="Ouvrir l’activité de l’Avatar et l’intelligence WAOUH"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  {resolvedDealState?.active ? <Handshake className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {(agentState.phase === "searching" || agentState.phase === "comparing" || resolvedDealState?.active) && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,.8)]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[11px] font-black text-slate-900">
                      {resolvedDealState?.active
                        ? resolvedDealState.closed ? "Deal conclu" : "Avatar accompagne la négociation"
                        : PRESENCE_PHASE_LABEL[agentState.phase]}
                    </span>
                    {agentState.resultCount > 0 && !resolvedDealState?.active && (
                      <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[9px]">
                        {agentState.resultCount} résultat{agentState.resultCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </span>
                  <span className="block truncate text-[10px] font-semibold text-slate-500">
                    {resolvedDealState?.active
                      ? resolvedDealState.title || "Deal Room WAOUH"
                      : agentState.goal?.trim() || "Dites ce que vous voulez acheter ou vendre"}
                  </span>
                </span>
                <span className="shrink-0 text-[9px] font-bold text-emerald-700 opacity-0 transition group-hover:opacity-100">
                  Voir l’activité
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[390px] overflow-hidden p-0 sm:max-w-[390px]">
              <SheetHeader className="sr-only"><SheetTitle>Activité et intelligence WAOUH</SheetTitle></SheetHeader>
              <WaouhUnifiedIntelligenceDock
                state={agentState}
                deal={resolvedDealState}
                onNewGoal={handleNewGoal}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {NotifButton}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Aide">
                <Info className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[390px] overflow-y-auto">
              <SheetHeader><SheetTitle>WAOUH One</SheetTitle></SheetHeader>
              <div className="mt-4"><HelpContent /></div>
            </SheetContent>
          </Sheet>
          {!embedded && (
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/")} aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          )}
          {!user && (
            <Button asChild size="sm" className="ml-1 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
              <Link to="/auth">Connexion</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden p-1.5">
        {railOpen && (
          <div
            className="mr-2 flex h-full shrink-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm"
            style={{ width: railWidth }}
          >
            <WaouhChatSidebar
              sessionId={sessionId ?? ""}
              authUserId={user?.id ?? null}
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={markAllRead}
              onMarkRead={markRead}
              onClearAll={clearAll}
              onOpenNotification={handleOpenNotification}
              onNewConversation={handleNewGoal}
            />
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
          <WaouhChatTabs
            matches={matches}
            activeKey={activeKey}
            onSelect={setActiveKey}
            onClose={close}
            sessionId={sessionId ?? ""}
          />
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className={cn("absolute inset-0 flex flex-col", activeKey === "main" ? "" : "hidden")}>
              <WaouhWebChat
                ref={chatRef}
                fullscreen
                onAgentStateChange={setAgentState}
                hideAgentBar
              />
            </div>
            {matches.map((match) => (
              <div key={match.key} className={cn("absolute inset-0", activeKey === match.key ? "" : "hidden")}>
                <WaouhMatchChatWindow
                  match={match}
                  sessionId={sessionId ?? ""}
                  authUserId={user?.id ?? null}
                  waouhIds={waouhIds}
                  active={activeKey === match.key}
                  getCached={getCached}
                  setCached={setCached}
                  getHasMore={getHasMore}
                  setHasMoreCached={setHasMoreCached}
                  onDealStateChange={setDealState}
                />
              </div>
            ))}
          </div>
        </main>

      </div>

      {payDialog && (
        <WaouhDealPaymentDialog
          open
          onOpenChange={(value) => { if (!value) setPayDialog(null); }}
          dealId={payDialog.dealId}
          amount={payDialog.amount}
        />
      )}
    </div>
  );
}
