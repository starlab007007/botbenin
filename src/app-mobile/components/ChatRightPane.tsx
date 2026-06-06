import { useEffect, useRef } from "react";
import { ShoppingBag } from "lucide-react";
import WaouhWebChat, { type WaouhWebChatHandle } from "@/components/waouh/WaouhWebChat";
import { WaouhMatchChatWindow } from "@/components/waouh/WaouhMatchChatWindow";
import type { useWaouhMatchChats } from "@/components/waouh/useWaouhMatchChats";
import ChatScreen from "@/app-mobile/screens/ChatScreen";

type MatchChats = ReturnType<typeof useWaouhMatchChats>;

type Props = {
  sessionId: string;
  authUserId: string | null;
  activeConvId: string | null;
  matchChats: MatchChats;
  /** Bumped to force WAOUH chat to start a fresh thread. */
  newWaouhCounter?: number;
};

/**
 * Right pane for the desktop/tablet 2-column /app/chat layout.
 * Reuses existing components without modifying their data flow:
 *  - WaouhWebChat for the main WAOUH assistant
 *  - WaouhMatchChatWindow for an open product match
 *  - ChatScreen (embedded) for a Supabase conversation by id
 */
export function ChatRightPane({
  sessionId,
  authUserId,
  activeConvId,
  matchChats,
  newWaouhCounter = 0,
}: Props) {
  const { matches, waouhIds, activeKey, getCached, setCached, getHasMore, setHasMoreCached } = matchChats;

  const waouhRef = useRef<WaouhWebChatHandle>(null);
  const lastNewRef = useRef<number>(newWaouhCounter);
  useEffect(() => {
    if (newWaouhCounter !== lastNewRef.current) {
      lastNewRef.current = newWaouhCounter;
      waouhRef.current?.startNewThread();
    }
  }, [newWaouhCounter]);

  // Conversation pane takes priority when set
  if (activeConvId) {
    return (
      <div className="h-full w-full">
        <ChatScreen embedded convIdOverride={activeConvId} />
      </div>
    );
  }

  // Otherwise honor the WAOUH match-chats active key
  if (activeKey && activeKey !== "main") {
    const match = matches.find((m) => m.key === activeKey);
    if (match) {
      return (
        <div className="h-full w-full">
          <WaouhMatchChatWindow
            match={match}
            sessionId={sessionId}
            authUserId={authUserId}
            waouhIds={waouhIds}
            active
            getCached={getCached}
            setCached={setCached}
            getHasMore={getHasMore}
            setHasMoreCached={setHasMoreCached}
          />
        </div>
      );
    }
  }

  // Default: main WAOUH assistant
  return (
    <div className="h-full w-full flex flex-col">
      <WaouhWebChat ref={waouhRef} fullscreen variant="native" />
    </div>
  );
}

export function ChatRightPaneEmpty() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center px-8 bg-muted/30">
      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md mb-4">
        <ShoppingBag className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-lg font-semibold mb-1">WAOUH Chat</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Sélectionnez une discussion à gauche, ouvrez WAOUH ou démarrez un nouveau chat pour commencer.
      </p>
    </div>
  );
}
