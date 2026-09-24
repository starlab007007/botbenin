import { ShoppingBag } from "lucide-react";
import { WaouhEmbeddedWorkspace } from "@/components/waouh/WaouhEmbeddedWorkspace";
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
  if (activeConvId) {
    return (
      <div className="h-full w-full">
        <ChatScreen embedded convIdOverride={activeConvId} />
      </div>
    );
  }

  return (
    <WaouhEmbeddedWorkspace
      sessionId={sessionId}
      authUserId={authUserId}
      matchChats={matchChats}
      newWaouhCounter={newWaouhCounter}
    />
  );
}

export function ChatRightPaneEmpty() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center px-8 bg-muted/30">
      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md mb-4">
        <ShoppingBag className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-lg font-semibold mb-1">WAOUH One</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Un seul espace pour discuter, chercher, comparer, contacter et négocier avec WAOUH.
      </p>
    </div>
  );
}
