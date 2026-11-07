import { supabase } from "@/integrations/supabase/client";
import { getWaouhSessionId } from "@/app-mobile/hooks/useWaouhIdentity";
import { openCommerceDiscussion } from "@/lib/waouh/discussionNavigation";
import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";

type Offer = Pick<NexusDiscoveryResult, "fabric_id" | "source_key" | "subject" | "raw_text" | "price_min" | "price_max" | "city" | "evidence">;

/**
 * Offre d'un vendeur WAOUH (article publié ou catalogue partenaire) : « Intéressé »
 * suit le parcours historique — intérêt transmis au vendeur (web, application,
 * WhatsApp), offre, contre-offres, accord, livraison, paiement, clôture.
 */
export function legacyDealCandidate(item: Pick<NexusDiscoveryResult, "fabric_id" | "source_key">): boolean {
  const source = String(item.source_key || "").toLowerCase();
  if (!["waouh_app", "partner", "whatsapp"].includes(source)) return false;
  return item.fabric_id.startsWith("article:") || item.fabric_id.startsWith("catalog:");
}

export class LegacyInterestError extends Error {}

/** Ouvre la discussion de négociation historique de l'offre et y transmet l'intérêt. */
export async function openLegacyInterest(item: Offer, navigate: (path: string) => void, opts: { offer?: number | null; source?: string } = {}) {
  const evidence = (item.evidence || {}) as Record<string, unknown>;
  const articleId = String(evidence.article_id || (item.fabric_id.startsWith("article:") ? item.fabric_id.slice(8) : "")).trim();
  const catalogId = String(evidence.catalog_id || (item.fabric_id.startsWith("catalog:") ? item.fabric_id.slice(8) : "")).trim();
  const offer = opts.offer && opts.offer > 0 ? Math.round(opts.offer) : null;
  const { data, error } = await supabase.functions.invoke("waouh-buyer-interest", {
    headers: { "x-waouh-session": getWaouhSessionId() },
    body: {
      ...(articleId ? { article_id: articleId } : { catalog_id: catalogId }),
      source: opts.source || "results_interested",
      ...(offer ? { offer_price: offer } : {}),
    },
  });
  if (error || data?.error) throw new LegacyInterestError("Cet échange n’a pas pu être ouvert. Réessayez.");
  if (data?.skipped === "self") throw new LegacyInterestError("C’est votre propre annonce : aucune négociation n’est ouverte.");
  const title = item.subject || item.raw_text || "Annonce";
  const detail = {
    article_id: String(data?.article_id || articleId || ""),
    thread_id: String(data?.thread_id || ""),
    negotiation_id: data?.negotiation_id || null,
    deal_id: null,
    kind: "buyer",
    title,
    price: item.price_min ?? item.price_max ?? null,
    city: item.city ?? null,
    seed_text: offer ? `Je propose ${offer.toLocaleString("fr-FR")} FCFA pour « ${title} ».` : `Je suis intéressé par « ${title} ».`,
    source: opts.source || "results_interested",
  };
  if (!detail.thread_id && !detail.article_id) throw new LegacyInterestError("Cet échange n’a pas pu être ouvert. Réessayez.");
  openCommerceDiscussion(detail, navigate);
  return detail;
}
