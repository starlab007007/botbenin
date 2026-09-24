import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import WaouhWebChat, { type WaouhWebChatHandle } from "./WaouhWebChat";
import { WaouhMatchChatWindow } from "./WaouhMatchChatWindow";
import { WaouhChatTabs } from "./WaouhChatTabs";
import { WaouhUnifiedIntelligenceDock } from "./WaouhUnifiedIntelligenceDock";
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
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-gradient-to-r from-white via-emerald-50/45 to-cyan-50/35 px-3">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-slate-700">WAOUH One</span>
          <span className="truncate text-[10px] font-semibold text-slate-400">Un chat · Muse + NEXUS + Signal + Contact</span>
        </div>
        <WaouhChatTabs
          matches={matches}
          activeKey={activeKey}
          onSelect={setActiveKey}
          onClose={close}
          sessionId={sessionId}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className={cn("absolute inset-0 flex flex-col", activeKey === "main" ? "" : "hidden")}>
            <WaouhWebChat
              ref={chatRef}
              fullscreen
              onAgentStateChange={setAgentState}
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

      <div className="hidden h-full w-[288px] shrink-0 overflow-hidden border-l border-slate-200/80 xl:block">
        <WaouhUnifiedIntelligenceDock
          compact
          state={agentState}
          deal={resolvedDeal}
          onNewGoal={newGoal}
        />
      </div>
    </div>
  );
}
