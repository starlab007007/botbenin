import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { WaouhPremiumAvatar } from "./WaouhPremiumAvatar";
import { WaouhQuickAsk, type QuickAskKind } from "./WaouhQuickAsk";
import WaouhWebChat from "./WaouhWebChat";
import { openGuidedChat, queueGuidedAsk, type GuidedAskInput } from "@/lib/waouh/guidedAsk";

/**
 * Recherche guidée : l'accueil de l'Avatar (Acheter, Vendre, Trouver, Opportunité, Service,
 * Prestation + champ libre). Une demande part par le moteur du Chat, sur la même page :
 * les résultats arrivent en continu, dans le même style que dans /app/chat, puis l'échange continue.
 */
export function WaouhGuidedHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [quickAsk, setQuickAsk] = useState<QuickAskKind | null>(null);

  const launch = (ask: GuidedAskInput) => {
    if (!user) { openGuidedChat(navigate, ask, false); return; }
    if (queueGuidedAsk(ask)) setStarted(true);
  };

  if (started) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white" data-waouh-ui="guided-search-chat">
        <div className="shrink-0 border-b border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" /> Recherche guidée
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <WaouhWebChat fullscreen hideAgentBar />
        </div>
      </div>
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-[#f5f7fc] px-3 py-4 pb-28" data-waouh-ui="guided-search-home">
      <WaouhPremiumAvatar
        firstName={null}
        onAction={(kind) => (kind === "vendre" ? launch({ kind }) : setQuickAsk(kind))}
        onAsk={(value) => launch({ kind: "trouver", q: value, free: true })}
        onSettings={() => navigate("/app/avatar")}
        onMissions={() => navigate("/app/missions")}
      />
      <WaouhQuickAsk
        kind={quickAsk}
        onClose={() => setQuickAsk(null)}
        onSubmit={() => setQuickAsk(null)}
        onAsk={(ask) => { setQuickAsk(null); launch(ask); }}
      />
    </main>
  );
}

export default WaouhGuidedHome;
