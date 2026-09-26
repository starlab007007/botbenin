import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Info, User, MessageSquareText, ArrowLeft, Plus, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import WaouhWebChat, { type WaouhWebChatHandle } from "@/components/waouh/WaouhWebChat";
import { WaouhMatchChatWindow } from "@/components/waouh/WaouhMatchChatWindow";
import { WaouhChatTabs } from "@/components/waouh/WaouhChatTabs";
import { WaouhUnifiedIntelligenceDock } from "@/components/waouh/WaouhUnifiedIntelligenceDock";
import { WaouhSmartComposerBar } from "@/components/waouh/WaouhSmartComposerBar";
import { WaouhMuseAvatar } from "@/components/waouh/WaouhMuseAvatar";
import { EMPTY_WAOUH_WORKSPACE_STATE, type WaouhWorkspaceAgentState, type WaouhWorkspaceDealState } from "@/lib/waouh/workspaceState";
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

/**
 * Native-style WAOUH chat — unified header, fullscreen messages, and a
 * WhatsApp-style composer with payload chips sitting JUST above the input.
 */
export default function WaouhChatScreen() {
  // Desktop ERP only → unified entry point is /app/chat.
  // Tablet web (768–1179px) keeps this mobile-style chat so Avatar
  // prefill/autosend deep-links are preserved exactly like Flutter.
  if (typeof window !== "undefined" && window.innerWidth >= 1180) {
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
  const [agentState, setAgentState] = useState<WaouhWorkspaceAgentState>(EMPTY_WAOUH_WORKSPACE_STATE);
  const [dealState, setDealState] = useState<WaouhWorkspaceDealState | null>(null);
  const { geo, loading: geoLoading, setCity, refresh } = useWaouhGeolocation();
  const { permission, requestPermission, notifications, unreadCount, markAllRead, markRead, clearAll } =
    useWaouhMatchNotifications(sessionId, authUserId);
  const { matches, waouhIds, activeKey, setActiveKey, close, getCached, setCached, getHasMore, setHasMoreCached } = useWaouhMatchChats(
    sessionId,
    authUserId
  );
  const activeMatch = matches.find((item) => item.key === activeKey) ?? null;
  const resolvedDeal: WaouhWorkspaceDealState | null =
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

  useEffect(() => {
    setDealState(null);
  }, [activeKey]);

  useEffect(() => {
    document.title = "WAOUH One — bot.bj";
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
        const intent = (params.get("intent") || "interest") as RadarIntent;
        const title = params.get("title") || "";
        const distance = params.get("distance") || "";
        const price = params.get("price") || "";
        const devise = params.get("devise") || "FCFA";
        const article = params.get("article") || "";
        const text = buildRadarInterestMessage({ title, intent, article, distance, price, devise });

        // Anti-spam: never re-send the exact same (article, intent) within 30s.
        // Identical to StatusCard's "intéressé" behavior — one canonical pipeline.
        const { fresh, remainingMs } = checkAndMarkRadarSend(article || `__${title}`, intent);

        if (fresh && article) {
          // Canonical buyer-interest pipeline (same edge function used by StatusCard).
          supabase.functions
            .invoke("waouh-buyer-interest", {
              body: { article_id: article, source: "radar", intent },
            })
            .catch(() => {});
          toast.success("Demande envoyée au vendeur", {
            description: `📡 Radar WAOUH · ${title || "Article"}`,
          });
          setRadarPauseReason({ kind: "autosend", title, intent, at: Date.now() });
        } else if (!fresh) {
          const secs = Math.ceil(remainingMs / 1000);
          toast.info("Anti-spam : demande déjà envoyée", {
            description: `Patientez ${secs}s avant de renvoyer "${intent}" pour cet article.`,
          });
          setRadarPauseReason({ kind: "duplicate", title, intent, at: Date.now() });
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
              body: { fcm_token: token.value, platform: "android" },
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

  const composerIntelligence = (
    <WaouhSmartComposerBar
      mode={agentState.mode}
      phase={agentState.phase}
      resultCount={agentState.resultCount}
      onPrompt={(value) => {
        chatRef.current?.prefill(value);
        chatRef.current?.focusInput();
      }}
      onSell={() => chatRef.current?.triggerQuickAction("sell")}
    />
  );

  return (
    <div className="flex flex-col bg-background overflow-hidden" style={{ height: "100dvh" }}>
      {/* Unified native header */}
      <header
        className="flex items-center justify-between gap-2 px-2 bg-[hsl(var(--wa-green,142_70%_24%))] text-white shrink-0 shadow-md z-10"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0px)", height: "calc(48px + env(safe-area-inset-top))" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button
            onClick={() => navigate("/app/chat")}
            className="p-2 rounded-lg hover:bg-white/15 active:bg-white/25 shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-white/10 active:bg-white/15"
                aria-label="Ouvrir l’activité de Muse"
              >
                <WaouhMuseAvatar
                  mode={resolvedDeal?.active ? (resolvedDeal.role === "seller" ? "seller" : "buyer") : agentState.mode}
                  phase={resolvedDeal?.active ? (resolvedDeal.closed ? "success" : "negotiating") : agentState.phase}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm leading-tight truncate">WAOUH One</span>
                    <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-100">IA</span>
                  </div>
                  <span className="text-[11px] text-white/75 truncate block">
                    {resolvedDeal?.active
                      ? resolvedDeal.closed ? "Deal conclu" : "Deal Room · Muse accompagne"
                      : agentState.phase === "searching"
                        ? "NEXUS cherche"
                        : agentState.phase === "comparing"
                          ? "Signal Fabric compare"
                          : profile?.full_name
                            ? `${profile.full_name.split(" ")[0]} · Muse prêt`
                            : "Touchez Muse pour voir son activité"}
                  </span>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[82dvh] overflow-hidden rounded-t-[28px] p-0">
              <SheetHeader className="sr-only"><SheetTitle>Activité et intelligence WAOUH</SheetTitle></SheetHeader>
              <WaouhUnifiedIntelligenceDock
                compact
                state={agentState}
                deal={resolvedDeal}
                onNewGoal={() => {
                  chatRef.current?.startNewThread();
                  setActiveKey("main");
                  setDealState(null);
                }}
              />
            </SheetContent>
          </Sheet>
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
            aria-label="Nouvel objectif WAOUH"
            title="Nouvel objectif"
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

      {/* Deal Rooms appear as contextual side chats only when they exist. */}
      {matches.length > 0 && (
        <WaouhChatTabs
          matches={matches}
          activeKey={activeKey}
          onSelect={setActiveKey}
          onClose={close}
          sessionId={sessionId}
        />
      )}

      {/* Active panel fills remaining space. Inactive panels stay mounted (hidden) to preserve state. */}
      <div className="flex-1 min-h-0 relative">
        <div className={cn("absolute inset-0 flex flex-col", activeKey === "main" ? "" : "hidden")}>
          <ErrorBoundary fallback={<MobileErrorFallback />}>
            <WaouhWebChat ref={chatRef} fullscreen variant="native" composerTopSlot={composerIntelligence} onAgentStateChange={setAgentState} hideAgentBar />
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
              onDealStateChange={setDealState}
            />

          </div>
        ))}
      </div>
    </div>
  );
}
