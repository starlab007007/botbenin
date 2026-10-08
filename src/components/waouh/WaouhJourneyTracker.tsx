import { WaouhExternalExchange } from './WaouhExternalExchange';
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listNexusOpportunityJourneys, type NexusOpportunityJourney } from "@/lib/waouh/nexus";
import { WaouhJourneyProgress } from "./WaouhJourneyProgress";
import { journeyPresentation } from "@/lib/waouh/journeyPresentation";
export function WaouhJourneyTracker({ threadId }: { threadId?: string | null }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [expanded,setExpanded] = useState(false);
  const [journey, setJourney] = useState<NexusOpportunityJourney | null>(null);
  useEffect(() => {
    setJourney(null);
    if (!threadId || !userId) return;
    let alive = true;
    let running = false;
    const sync = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const data = await listNexusOpportunityJourneys({ thread_id: threadId, include_completed: true, limit: 1 });
        if (alive) setJourney(data.journeys[0] || null);
      } catch { /* Retain the last confirmed state. */ }
      finally { running = false; }
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 15000);
    document.addEventListener("visibilitychange", sync);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, [threadId, userId]);
  if (!journey) return null;
  return <div className="shrink-0 border-b bg-white px-3 py-2 text-xs"><p className="truncate font-semibold text-blue-700">{journeyPresentation(journey).status}</p><p className="line-clamp-2 text-slate-600">À venir : {journeyPresentation(journey).next}</p><details onToggle={event=>setExpanded(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center gap-2"><span className="font-semibold">Suivi Avatar</span><span className="truncate text-blue-700">{journeyPresentation(journey).status} · Voir les étapes</span></summary><div className="max-h-[40dvh] overflow-auto pb-3"><WaouhJourneyProgress journey={journey} />{expanded && journey.fabric_id.startsWith("external:") && <WaouhExternalExchange access={{journey_id:journey.id}} />}</div></details></div>;
}
