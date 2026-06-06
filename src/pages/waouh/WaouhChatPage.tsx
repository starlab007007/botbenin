import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Search, Handshake, CreditCard, X, Sparkles, Info, PanelsTopLeft, Rows3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import WaouhWebChat, { type WaouhWebChatHandle } from "@/components/waouh/WaouhWebChat";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWaouhMatchNotifications } from "@/hooks/useWaouhMatchNotifications";
import { WaouhNotificationsBell } from "@/components/waouh/WaouhNotificationsBell";
import { StatusesPanel } from "@/components/waouh/statuses/StatusesPanel";
import { WaouhChatSidebar } from "@/components/waouh/WaouhChatSidebar";

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
  { icon: ShoppingBag, title: "Vendre", desc: "Publiez un article en 30s", gradient: "from-emerald-500 to-teal-500" },
  { icon: Search, title: "Acheter", desc: "Trouvez près de vous", gradient: "from-cyan-500 to-blue-500" },
  { icon: Handshake, title: "Négocier", desc: "Proposez votre prix", gradient: "from-amber-500 to-orange-500" },
  { icon: CreditCard, title: "Payer", desc: "Mobile Money sécurisé", gradient: "from-purple-500 to-pink-500" },
];

const EXAMPLES = [
  '"Je vends mon iPhone 14 Pro 256Go à Cotonou — 650 000 FCFA"',
  '"Je cherche un frigo d\'occasion à Calavi, max 150 000 FCFA"',
  '"Je propose 580 000 FCFA pour l\'iPhone"',
  '"Je paye en Mobile Money MTN, mon numéro 97 12 34 56"',
];

const HelpContent = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      {QUICK_ACTIONS.map((a) => (
        <div key={a.title} className="p-3 rounded-lg bg-white border border-gray-200">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center mb-1.5`}>
            <a.icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 text-xs">{a.title}</h3>
          <p className="text-[11px] text-gray-500">{a.desc}</p>
        </div>
      ))}
    </div>
    <div>
      <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-500" /> Exemples
      </h3>
      <ul className="space-y-1.5">
        {EXAMPLES.map((e) => (
          <li key={e} className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-2">{e}</li>
        ))}
      </ul>
    </div>
    <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xs leading-relaxed">
      🔒 Paiements Mobile Money via escrow. L'argent n'est libéré qu'après confirmation.
    </div>
  </div>
);

const LAYOUT_KEY = "waouh_chat_layout_mode";
type LayoutMode = "split" | "list";

function getInitialLayout(): LayoutMode {
  if (typeof window === "undefined") return "split";
  const v = localStorage.getItem(LAYOUT_KEY);
  return v === "list" ? "list" : "split";
}

function computeSidebarWidth(): number {
  if (typeof window === "undefined") return 340;
  const w = window.innerWidth;
  if (w >= 1280) return 360;
  return 320;
}

export default function WaouhChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const sessionId = getSessionId();
  const chatRef = useRef<WaouhWebChatHandle>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(getInitialLayout);
  const [sidebarWidth, setSidebarWidth] = useState<number>(computeSidebarWidth);
  const { permission, requestPermission, notifications, unreadCount, markAllRead, markRead, clearAll } = useWaouhMatchNotifications(sessionId, user?.id ?? null);

  useEffect(() => {
    const onResize = () => setSidebarWidth(computeSidebarWidth());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const updateLayout = (mode: LayoutMode) => {
    setLayoutMode(mode);
    try { localStorage.setItem(LAYOUT_KEY, mode); } catch {}
  };

  useEffect(() => {
    document.title = "WAOUH Chat — Achetez, Vendez, Négociez, Payez | bot.bj";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      const t = setTimeout(() => {
        chatRef.current?.startNewThread();
        navigate(location.pathname, { replace: true });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [location.search, location.pathname, navigate]);

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

  // === MOBILE: full-screen, no scroll, drawer for help ===
  if (isMobile) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
        <header className="flex items-center justify-between gap-2 px-3 h-12 border-b bg-white/95 backdrop-blur shrink-0">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900 truncate">WAOUH</span>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5 h-4 hidden xs:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              IA
            </Badge>
          </Link>
          <div className="flex items-center gap-1">
            {NotifButton}
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 -mr-1 rounded-lg hover:bg-gray-100 active:bg-gray-200" aria-label="Aide">
                  <Info className="w-5 h-5 text-gray-700" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Comment utiliser WAOUH</SheetTitle>
                </SheetHeader>
                <div className="mt-3"><HelpContent /></div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <div className="flex-1 min-h-0">
          <WaouhWebChat ref={chatRef} fullscreen />
        </div>
      </div>
    );
  }

  // === DESKTOP / TABLET: WhatsApp-style 2-column layout ===
  const handleNewConversation = () => {
    chatRef.current?.startNewThread();
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 h-14 border-b border-border bg-card/95 backdrop-blur flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-foreground">WAOUH</div>
            <div className="text-[11px] text-muted-foreground">Marketplace IA — bot.bj</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hidden sm:inline-flex">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            IA en ligne
          </Badge>

          {/* Layout toggle */}
          <TooltipProvider delayDuration={300}>
            <div className="hidden md:inline-flex items-center rounded-md border border-border bg-background p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={layoutMode === "split" ? "secondary" : "ghost"}
                    className="h-7 px-2"
                    onClick={() => updateLayout("split")}
                    aria-label="Vue 2 colonnes"
                    aria-pressed={layoutMode === "split"}
                  >
                    <PanelsTopLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>2 colonnes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={layoutMode === "list" ? "secondary" : "ghost"}
                    className="h-7 px-2"
                    onClick={() => updateLayout("list")}
                    aria-label="Liste uniquement"
                    aria-pressed={layoutMode === "list"}
                  >
                    <Rows3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Liste uniquement</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {NotifButton}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Aide">
                <Info className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[360px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Comment utiliser WAOUH</SheetTitle>
              </SheetHeader>
              <div className="mt-4"><HelpContent /></div>
            </SheetContent>
          </Sheet>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <X className="w-4 h-4 mr-1.5" /> Fermer
            </Button>
          </Link>
          {!user && (
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90">
                Se connecter
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar — JS-driven width to avoid media-query misdetection */}
        <div
          className="shrink-0 h-full min-h-0 flex"
          style={{ width: layoutMode === "list" ? "100%" : `${sidebarWidth}px` }}
        >
          <WaouhChatSidebar
            sessionId={sessionId ?? ""}
            authUserId={user?.id ?? null}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
            onClearAll={clearAll}
            onNewConversation={handleNewConversation}
          />
        </div>

        {/* Chat area */}
        {layoutMode === "split" && (
          <main className="flex-1 min-w-0 h-full flex flex-col bg-background">
            <div className="flex-1 min-h-0">
              <WaouhWebChat ref={chatRef} fullscreen />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
