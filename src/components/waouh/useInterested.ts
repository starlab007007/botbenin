import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";
import { offerDealRoomPath } from "./WaouhOfferActions";

/** « Intéressé » sur une offre : toujours la Deal Room, avec la proposition d'offre ouverte. */
export function useInterested(kind: string | undefined, requireAuth: (next?: string) => boolean) {
  const navigate = useNavigate();
  return useCallback((item: NexusDiscoveryResult) => {
    const path = offerDealRoomPath(item, kind);
    if (requireAuth(path)) navigate(path);
  }, [kind, requireAuth, navigate]);
}
