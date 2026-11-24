import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";
import { offerDealRoomPath } from "./WaouhOfferActions";
import { openInterestedDiscussion } from '@/lib/waouh/interestNavigation';
import { toast } from 'sonner';

/** « Intéressé » sur une offre : toujours la Deal Room, avec la proposition d'offre ouverte. */
export function useInterested(kind: string | undefined, requireAuth: (next?: string) => boolean, articleId?: string) {
  const navigate = useNavigate();
  return useCallback(async (item: NexusDiscoveryResult) => {
    const path = offerDealRoomPath(item, kind, articleId);
    if (!requireAuth(path)) return;
    if (kind === 'sale' || kind === 'opportunity') { navigate(path); return; }
    try { await openInterestedDiscussion(item, navigate); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Cet échange n’a pas pu être ouvert. Réessayez.'); }
  }, [kind, requireAuth, navigate, articleId]);
}
