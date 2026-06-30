import { useEffect, useRef } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { ShoppingBag, Info, User, MessageSquareText, Search, Handshake, ArrowLeft, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import WaouhWebChat, { type WaouhWebChatHandle } from "@/components/waouh/WaouhWebChat";
import { WaouhMatchChatWindow } from "@/components/waouh/WaouhMatchChatWindow";
import { WaouhChatTabs } from "@/components/waouh/WaouhChatTabs";
import { useWaouhMatchChats } from "@/components/waouh/useWaouhMatchChats";


import { WaouhNotificationsBell } from "@/components/waouh/WaouhNotificationsBell";
import { WaouhCityBadge } from "@/components/waouh/WaouhCityBadge";
import { useWaouhMatchNotifications } from "@/hooks/useWaouhMatchNotifications";
import { useWaouhGeolocation } from "@/hooks/useWaouhGeolocation";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useMobileProfile } from "../hooks/useMobileProfile";
import { useIsNative } from "../hooks/useIsNative";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileErrorFallback } from "../components/MobileErrorFallback";
import { toast } from "sonner";
import {
  buildRadarInterestMessage,
  checkAndMarkRadarSend,
  setRadarPauseReason,
  RADAR_DEDUP_WINDOW_MS,
  type RadarIntent,
} from "../utils/radarAutosend";

const SESSION_KEY = "waouh_web_session_id";
function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto as any).randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const PAYLOADS: { key: "sell" | "buy" | "negotiate"; label: string; Icon: any; tint: string }[] = [
  { key: "sell", label: "Vendre", Icon: ShoppingBag, tint: "from-emerald-500 to-teal-600" },
  { key: "buy", label: "Acheter", Icon: Search, tint: "from-sky-500 to-blue-600" },
  { key: "negotiate", label: "Négocier", Icon: Handshake, tint: "from-amber-500 to-orange-600" },
];

/**
 * Native-style WAOUH chat — unified header, fullscreen messages, and a
 * WhatsApp-style composer with payload chips sitting JUST above the input.
 */
export default function WaouhChatScreen() {
  // Desktop/tablet → redirect to dedicated 2-column WhatsApp-style page
  // Desktop/tablet → unified entry point is /app/chat (embedded WaouhChatPage)
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    return <Navigate to="/app/chat" replace />;
  }
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useMobileAuth();
  const { profile } = useMobileProfile();
  const isNative = useIsNative();
  const sessionId = getSessionId();
  const authUserId = user?.id ?? null;
  const chatRef = useRef<WaouhWebChatHandle>(null);
  const { geo, loading: geoLoading, setCity, refresh } = useWaouhGeolocation();
  const { permission, requestPermission, notifications, unreadCount, markAllRead, markRead, clearAll } =
    useWaouhMatchNotifications(sessionId, authUserId);
  const { matches, waouhIds, activeKey, setActiveKey, close, getCached, setCached, getHasMore, setHasMoreCached } = useWaouhMatchChats(
    sessionId,
    authUserId
  );

  useEffect(() => {
    document.title = "WAOUH Chat — bot.bj";
  }, []);

  // Handle deep-links from the Radar / external triggers:
  //   ?new=1            → reset main thread
  //   ?prefill=...      → prefill composer (legacy)
  //   ?autosend=1       → reset + auto-send a one-shot message with article context
  //     extra params:   intent, article, title, distance, price, devise
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isNew = params.get("new") === "1";
    const autosend = params.get("autosend") === "1";
    const prefill = params.get("prefill");
    if (!isNew && !autosend && !prefill) return;

    const t = setTimeout(() => {
      setActiveKey("main");
      if (autosend) {
        const intent = (params.get("intent") || "interest") as "interest" | "negotiate" | "buy";
        const title = params.get("title") || "";
        const distance = params.get("distance") || "";
        const price = params.get("price") || "";
        const devise = params.get("devise") || "FCFA";
        const article = params.get("article") || "";
        const priceLabel = price ? ` (~${price} ${devise})` : "";
        // Single canonical "intéressé" message regardless of which button was tapped.
        // The intent + article_id stay in the text as tags so the WAOUH router can
        // route to the right negotiation flow.
        const text =
          `👋 Intéressé par "${title}"${distance ? ` vu sur Radar WAOUH à ${distance}` : ""}` +
          `${priceLabel}. Est-il toujours disponible ?` +
          `\n\n#radar #${intent}${article ? ` #article:${article}` : ""}`;
        // Anti-spam: never re-send the exact same (article, intent) within 30s.
        // Anti-spam: never re-send the exact same (article, intent) within 30s.
        const dedupKey = `waouh_radar_lastsend_${article}_${intent}`;
        const last = Number(sessionStorage.getItem(dedupKey) || 0);
        const fresh = Date.now() - last >= 30000;
        if (fresh) sessionStorage.setItem(dedupKey, String(Date.now()));

        // Fire the canonical buyer-interest pipeline (same one used by StatusCard)
        // so the seller receives the standard "📩 Nouvel acheteur intéressé"
        // notification + match-chat window. Only when we have a real article id.
        if (fresh && article) {
          supabase.functions
            .invoke("waouh-buyer-interest", {
              body: { article_id: article, source: "radar", intent },
            })
            .catch(() => {});
        }

        if (!fresh) {
          chatRef.current?.startNewThread();
          chatRef.current?.prefill(text);
        } else {
          chatRef.current?.prefillAndSend(text);
        }
      } else {
        if (isNew) chatRef.current?.startNewThread();
        if (prefill) chatRef.current?.prefill(prefill);
      }
      navigate("/app/chat/waouh", { replace: true });
    }, 50);
    return () => clearTimeout(t);
  }, [location.search, navigate, setActiveKey]);


  useEffect(() => {
    if (!isNative) return;
    let mounted = true;
    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.checkPermissions();
        let status = perm.receive;
        if (status === "prompt" || status === "prompt-with-rationale") {
          const req = await PushNotifications.requestPermissions();
          status = req.receive;
        }
        if (status !== "granted" || !mounted) return;
        await PushNotifications.register();
        PushNotifications.addListener("registration", async (token) => {
          try {
            await supabase.functions.invoke("register-device-token", {
              body: { token: token.value, platform: "android" },
            });
          } catch (e) {
            console.debug("[push] register failed", e);
          }
        });
        PushNotifications.addListener("registrationError", (e) => console.debug("[push] regError", e));
      } catch (e) {
        console.debug("[push] not available", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isNative]);

  const payloadChips = (
    <div className="px-2 py-2 bg-background border-t border-border/50 shrink-0">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {PAYLOADS.map(({ key, label, Icon, tint }) => (
          <button
            key={key}
            type="button"
            onClick={() => chatRef.current?.triggerQuickAction(key)}
            className={cn(
              "flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full shrink-0",
              "bg-card border border-border/60 shadow-sm",
              "active:scale-95 transition-all duration-150"
            )}
          >
            <span
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-br text-white",
                tint
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[13px] font-semibold text-foreground">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-background overflow-hidden" style={{ height: "100dvh" }}>
      {/* Unified native header */}
      <header
        className="flex items-center justify-between gap-2 px-2 bg-[hsl(var(--wa-green,142_70%_24%))] text-white shrink-0 shadow-md z-10"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0px)", height: "calc(56px + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={() => navigate("/app/chat")}
            className="p-2 rounded-lg hover:bg-white/15 active:bg-white/25 shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm leading-tight truncate">WAOUH</span>
              <Badge className="bg-emerald-400/90 text-emerald-950 border-0 text-[9px] py-0 px-1.5 h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 mr-1 animate-pulse" />
                IA
              </Badge>
            </div>
            <span className="text-[11px] text-white/75 truncate block">
              {profile?.full_name ? `Bonjour ${profile.full_name.split(" ")[0]}` : "Achetez · Vendez · Négociez"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <WaouhCityBadge geo={geo} loading={geoLoading} onSetCity={setCity} onRefresh={refresh} compact />
          <div className="[&_button]:text-white [&_button:hover]:bg-white/15">
            <WaouhNotificationsBell
              permission={permission}
              notifications={notifications}
              unreadCount={unreadCount}
              onRequestPermission={requestPermission}
              onMarkAllRead={markAllRead}
              onMarkRead={markRead}
              onClearAll={clearAll}
            />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-white/15 active:bg-white/25" aria-label="Aide">
                <Info className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Comment utiliser WAOUH</SheetTitle>
              </SheetHeader>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>Écrivez en français, Fon ou Yoruba. Exemples :</p>
                <ul className="space-y-1.5">
                  <li className="bg-muted rounded-lg p-2">"Je vends mon iPhone 14 Pro 256Go à Cotonou — 650 000 FCFA"</li>
                  <li className="bg-muted rounded-lg p-2">"Je cherche un frigo d'occasion à Calavi, max 150 000 FCFA"</li>
                  <li className="bg-muted rounded-lg p-2">"Je propose 580 000 FCFA pour l'iPhone"</li>
                  <li className="bg-muted rounded-lg p-2">"Je paye en Mobile Money MTN, mon numéro 97 12 34 56"</li>
                </ul>
                <button
                  onClick={() => navigate("/app/conversations")}
                  className="w-full mt-2 p-3 rounded-lg border bg-card text-foreground text-sm flex items-center gap-2 hover:bg-muted"
                >
                  <MessageSquareText className="w-4 h-4" /> Voir mes conversations WhatsApp
                </button>
              </div>
            </SheetContent>
          </Sheet>

          <button
            onClick={() => {
              chatRef.current?.startNewThread();
              setActiveKey("main");
            }}
            className="p-2 rounded-lg hover:bg-white/15 active:bg-white/25"
            aria-label="Nouvelle discussion WAOUH"
            title="Nouvelle discussion"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate("/app/profile")}
            className="p-2 rounded-lg hover:bg-white/15 active:bg-white/25"
            aria-label="Profil"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tabs bar — switch between main WAOUH and product chats */}
      <WaouhChatTabs
        matches={matches}
        activeKey={activeKey}
        onSelect={setActiveKey}
        onClose={close}
        sessionId={sessionId}
      />

      {/* Active panel fills remaining space. Inactive panels stay mounted (hidden) to preserve state. */}
      <div className="flex-1 min-h-0 relative">
        <div className={cn("absolute inset-0 flex flex-col", activeKey === "main" ? "" : "hidden")}>
          <ErrorBoundary fallback={<MobileErrorFallback />}>
            <WaouhWebChat ref={chatRef} fullscreen variant="native" composerTopSlot={payloadChips} />
          </ErrorBoundary>
        </div>
        {matches.map((m) => (
          <div
            key={m.key}
            className={cn("absolute inset-0", activeKey === m.key ? "" : "hidden")}
          >
            <WaouhMatchChatWindow
              match={m}
              sessionId={sessionId}
              authUserId={authUserId}
              waouhIds={waouhIds}
              active={activeKey === m.key}
              getCached={getCached}
              setCached={setCached}
              getHasMore={getHasMore}
              setHasMoreCached={setHasMoreCached}
            />

          </div>
        ))}
      </div>
    </div>
  );
}
