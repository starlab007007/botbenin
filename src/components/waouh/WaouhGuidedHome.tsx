import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileProfile } from "@/app-mobile/hooks/useMobileProfile";
import { WaouhPremiumAvatar } from "./WaouhPremiumAvatar";
import { WaouhQuickAsk, type QuickAskKind } from "./WaouhQuickAsk";
import { openGuidedChat, type GuidedAskInput } from "@/lib/waouh/guidedAsk";

/**
 * Recherche guidée : l'accueil de l'Avatar (Acheter, Vendre, Trouver, Opportunité, Service,
 * Prestation + champ libre). Toute demande s'exécute dans le Chat, la référence : recherche en
 * direct, fiches, « Confier à Bot », puis fenêtre d'échange jusqu'à l'accord.
 */
export function WaouhGuidedHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile } = useMobileProfile();
  const [quickAsk, setQuickAsk] = useState<QuickAskKind | null>(null);
  const [initialQuery, setInitialQuery] = useState("");

  const launch = (ask: GuidedAskInput) => openGuidedChat(navigate, ask, !!user);

  return (
    <main className="h-full overflow-y-auto bg-[#f5f7fc] px-3 py-4 pb-28" data-waouh-ui="guided-search-home">
      <WaouhPremiumAvatar
        firstName={user ? profile?.full_name ?? null : null}
        onDelegateAsk={(value) => { setInitialQuery(value); setQuickAsk("demander"); }}
        onAction={(kind) => { setInitialQuery(""); if (kind === "vendre" && !user) launch({ kind }); else setQuickAsk(kind); }}
        // Une demande écrite ici est toujours une recherche : elle ouvre la fenêtre de résultats en direct.
        onAsk={(value) => launch({ kind: "trouver", q: value, free: true })}
        onSettings={() => navigate("/app/avatar")}
        onMissions={() => navigate("/app/missions")}
      />
      <WaouhQuickAsk
        kind={quickAsk}
        initialQuery={initialQuery}
        onClose={() => setQuickAsk(null)}
        onSubmit={(path) => { setQuickAsk(null); navigate(path); }}
        onAsk={(ask) => { setQuickAsk(null); launch(ask); }}
      />
    </main>
  );
}

export default WaouhGuidedHome;
