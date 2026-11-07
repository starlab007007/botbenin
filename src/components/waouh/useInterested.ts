import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";
import { isDirectDealCandidate, legacyDealCandidate, LegacyInterestError, openExternalInterest, openLegacyInterest } from "@/lib/waouh/legacyInterest";
import { offerDealRoomPath } from "./WaouhOfferActions";

/** « Intéressé » sur une offre : négociation historique pour un vendeur WAOUH, sinon Deal Room avec la proposition d'offre ouverte. */
export function useInterested(kind: string | undefined, requireAuth: (next?: string) => boolean) {
  const navigate = useNavigate();
  return useCallback((item: NexusDiscoveryResult) => {
    if (kind !== "opportunity" && legacyDealCandidate(item)) {
      if (!requireAuth("/app/chat")) return;
      void openLegacyInterest(item, navigate).catch((error) => toast({ title: error instanceof LegacyInterestError ? error.message : "Cet échange n’a pas pu être ouvert. Réessayez.", variant: "destructive" }));
      return;
    }
    if (kind !== "opportunity" && isDirectDealCandidate(item.fabric_id)) {
      if (!requireAuth("/app/chat")) return;
      void openExternalInterest(item, navigate).then((where) => { if (where === "fallback") { const path = offerDealRoomPath(item, kind); navigate(path); } })
        .catch((error) => toast({ title: error instanceof LegacyInterestError ? error.message : "Cet échange n’a pas pu être ouvert. Réessayez.", variant: "destructive" }));
      return;
    }
    const path = offerDealRoomPath(item, kind);
    if (requireAuth(path)) navigate(path);
  }, [kind, requireAuth, navigate]);
}
