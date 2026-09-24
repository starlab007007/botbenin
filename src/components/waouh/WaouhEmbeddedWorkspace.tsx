import { useEffect, useMemo, useRef, useState } from "react";
import { Handshake, Sparkles } from "lucide-react";
import WaouhWebChat, { type WaouhWebChatHandle } from "./WaouhWebChat";
import { WaouhMatchChatWindow } from "./WaouhMatchChatWindow";
import { WaouhChatTabs } from "./WaouhChatTabs";
import { WaouhUnifiedIntelligenceDock } from "./WaouhUnifiedIntelligenceDock";
import { WaouhMuseAvatar } from "./WaouhMuseAvatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { useWaouhMatchChats } from "./useWaouhMatchChats";
import {
  EMPTY_WAOUH_WORKSPACE_STATE,
  type WaouhWorkspaceAgentState,
  type WaouhWorkspaceDealState,
} from "@/lib/waouh/workspaceState";
import { cn } from "@/lib/utils";

type MatchChats = ReturnType<typeof useWaouhMatchChats>;

export function WaouhEmbeddedWorkspace({
  sessionId,
  authUserId,
  matchChats,
  newWaouhCounter = 0,
}: {
  sessionId: string;
  authUserId: string | null;
  matchChats: MatchChats;
  newWaouhCounter?: number;
}) {
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
  } = matchChats;
  const chatRef = useRef<WaouhWebChatHandle>(null);
  const lastNewRef = useRef(newWaouhCounter);
  const [agentState, setAgentState] = useState<WaouhWorkspaceAgentState>(EMPTY_WAOUH_WORKSPACE_STATE);
  const [dealState, setDealState] = useState<WaouhWorkspaceDealState | null>(null);

  useEffect(() => {
    if (newWaouhCounter === lastNewRef.current) return;
    lastNewRef.current = newWaouhCounter;
    setActiveKey("main");
    setDealState(null);
    chatRef.current?.startNewThread();
  }, [newWaouhCounter, setActiveKey]);

  useEffect(() => {
    setDealState(null);
  }, [activeKey]);

  const activeMatch = useMemo(
    () => matches.find((match) => match.key === activeKey) ?? null,
    [activeKey, matches],
  );

  const resolvedDeal =
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

  const newGoal = () => {
    setActiveKey("main");
    setDealState(null);
    chatRef.current?.startNewThread();
    setTimeout(() => chatRef.current?.focusInput(), 0);
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#f4f7f6]">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/95 px-3">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-emerald-50/60"
                aria-label="Ouvrir l’activité de Muse"
              >
                <WaouhMuseAvatar
                  mode={resolvedDeal?.active ? (resolvedDeal.role === "seller" ? "seller" : "buyer") : agentState.mode}
                  phase={resolvedDeal?.active ? (resolvedDeal.closed ? "success" : "negotiating") : agentState.phase}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-slate-900">WAOUH One</span>
                    {(agentState.phase === "searching" || agentState.phase === "comparing" || resolvedDeal?.active) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,.8)]" />
                    )}
                  </span>
                  <span className="block truncate text-[10px] font-semibold text-slate-500">
                    {resolvedDeal?.active
                      ? resolvedDeal.closed ? "Deal conclu" : "Deal Room · Muse accompagne"
                      : agentState.goal?.trim() || "Un chat · tout le marché"}
                  </span>
                </span>
                {resolvedDeal?.active ? <Handshake className="h-4 w-4 shrink-0 text-emerald-700" /> : <Sparkles className="h-4 w-4 shrink-0 text-emerald-700" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[390px] overflow-hidden p-0 sm:max-w-[390px]">
              <SheetHeader className="sr-only"><SheetTitle>Activité et intelligence WAOUH</SheetTitle></SheetHeader>
              <WaouhUnifiedIntelligenceDock
                state={agentState}
                deal={resolvedDeal}
                onNewGoal={newGoal}
              />
            </SheetContent>
          </Sheet>
        </div>
        {matches.length > 0 && (
          <WaouhChatTabs
            matches={matches}
            activeKey={activeKey}
            onSelect={setActiveKey}
            onClose={close}
            sessionId={sessionId}
          />
        )}
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
                sessionId={sessionId}
                authUserId={authUserId}
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
  );
}
