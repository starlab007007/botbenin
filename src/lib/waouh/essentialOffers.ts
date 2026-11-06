import type { NexusDiscoveryResult } from './nexus';
import { resultKind, marketReferences } from '../../../supabase/functions/_shared/waouh-convergence-contract';

const text = (v: unknown) => typeof v === 'string' ? v.trim() : '';
export const normalizeOfferText = (v: unknown) => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const offerEvidence = (r: NexusDiscoveryResult) => r.evidence || {};
export function offerUnit(r: NexusDiscoveryResult) {
  const e = offerEvidence(r);
  return text(e.unit) || text(e.price_unit) || text(e.unite);
}
export function offerIdentity(r: NexusDiscoveryResult) {
  const e = offerEvidence(r);
  // Never merge people/offers on title, city or a masked phone suffix.
  const article = text(e.article_id) || (/^article:/.test(r.fabric_id) ? r.fabric_id.slice(8) : '');
  const catalog = text(e.catalog_id) || (/^catalog:/.test(r.fabric_id) ? r.fabric_id.slice(8) : '');
  return article ? `article:${article}` : catalog ? `catalog:${catalog}` : r.fabric_id;
}
export function uniqueOffers(results: NexusDiscoveryResult[]) {
  const seen = new Set<string>();
  return results.filter(r => { const key = offerIdentity(r); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}
export function knownPeopleCount(results: NexusDiscoveryResult[]) {
  const ids = new Set(results.map(r => { const e = offerEvidence(r); return text(e.seller_user_id) || text(e.buyer_user_id) || text(e.owner_user_id); }).filter(Boolean));
  return ids.size;
}
export function offerPrice(r: NexusDiscoveryResult) {
  const money = (n: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} ${!r.currency || r.currency === 'XOF' ? 'F CFA' : r.currency}`;
  const min = r.price_min != null && r.price_min > 0 ? r.price_min : null, max = r.price_max != null && r.price_max > 0 ? r.price_max : null;
  if (min == null && max == null) return 'Prix à demander';
  return min != null && max != null && min !== max ? `${money(min)} – ${money(max)}` : money((min ?? max)!);
}
export function offerKind(r: NexusDiscoveryResult) { return resultKind(r); }
export function offerPrimaryNeedsPrice(r: NexusDiscoveryResult) { return offerKind(r) === 'product'; }
export function offerHint(r: NexusDiscoveryResult) {
  if (offerKind(r) === 'announcement') return 'Conditions à confirmer';
  return offerUnit(r) || (offerKind(r) === 'service' ? 'Périmètre à confirmer' : 'Unité à confirmer');
}
export function offerAdvice(r: NexusDiscoveryResult) {
  const e = offerEvidence(r);
  if (r.price_min == null && r.price_max == null) return 'À préciser : prix et conditions.';
  if (!offerUnit(r) && offerKind(r) === 'product') return 'À confirmer : prix à l’unité ou au lot.';
  const supplied = text(e.recommendation) || text(e.advice);
  if (supplied && !/ENRICH|NEXUS|C[0-5]|score|Opportunity OS|\d+%/i.test(supplied)) return supplied.length > 110 ? `${supplied.slice(0, 107).trim()}…` : supplied;
  return offerKind(r) === 'service' ? 'À confirmer : périmètre et créneau.' : offerKind(r) === 'announcement' ? 'À vérifier : conditions et validité.' : 'À confirmer : disponibilité et livraison.';
}
export function offerMarket(r: NexusDiscoveryResult) {
  // An absent unit must never silently become a comparable flat rate.
  const refs = marketReferences({ ...r, unit: offerUnit(r) }).map(ref => ({ ...ref, comparable: ref.comparable && !!offerUnit(r) }));
  const prices = refs.filter(ref => ref.comparable).map(ref => ref.amount).sort((a,b) => a-b);
  const median = prices.length < 2 ? null : prices.length % 2 ? prices[(prices.length - 1)/2] : (prices[prices.length/2 - 1] + prices[prices.length/2])/2;
  return { refs, median, label: median === null ? 'Données insuffisantes' : `${prices.length} références comparables` };
}
export function contactPossible(r: NexusDiscoveryResult) { return ['C2','C3','C4','C5'].includes(r.contact_policy?.level); }
/**
 * Statut d'action en clair pour cette piste, dérivé en direct de ce que Nexus a calculé
 * (next_best_action, à défaut readiness_level) — jamais de code brut affiché à l'utilisateur.
 */
export type OfferReadiness = { label: string; tone: 'ready' | 'progress' | 'review' | 'wait' };
export function offerReadiness(r: NexusDiscoveryResult): OfferReadiness | null {
  const pack = (r.contact_pack ?? {}) as { next_best_action?: string; readiness_level?: string };
  const action = text(r.next_best_action) || text(pack.next_best_action);
  switch (action) {
    case 'CONTACT_NOW': return { label: 'Contact direct possible', tone: 'ready' };
    case 'OPEN_DEAL_ROOM': return { label: 'Prêt pour le Deal Room', tone: 'ready' };
    case 'EXECUTE': return { label: 'Prêt à conclure', tone: 'ready' };
    case 'COMPLETE': return { label: 'Échange conclu', tone: 'ready' };
    case 'NEGOTIATE': return { label: 'Prêt à négocier', tone: 'progress' };
    case 'REQUEST_APPROVAL': return { label: 'Validation à donner avant contact', tone: 'review' };
    case 'FOLLOW_UP': return { label: 'Relance à prévoir', tone: 'review' };
    case 'WAIT_REPLY': return { label: 'En attente de réponse', tone: 'wait' };
    case 'ENRICH': return { label: 'Informations à compléter', tone: 'wait' };
    case 'DROP_LOW_QUALITY': return null;
  }
  // Repli : aucun next_best_action fourni, on se base sur le niveau de préparation annoncé.
  const readiness = text(r.readiness_level) || text(pack.readiness_level);
  if (readiness === 'R4' || readiness === 'R5') return { label: 'Contact direct possible', tone: 'ready' };
  if (readiness === 'R2' || readiness === 'R3') return { label: 'Informations à compléter', tone: 'wait' };
  return null;
}
/** Rang pour un tri d'affichage « contact le plus rapide d'abord », dérivé du même next_best_action. */
const NEXT_ACTION_RANK: Record<string, number> = {
  CONTACT_NOW: 0, OPEN_DEAL_ROOM: 1, NEGOTIATE: 2, EXECUTE: 3,
  REQUEST_APPROVAL: 4, FOLLOW_UP: 5, WAIT_REPLY: 6, ENRICH: 7,
  COMPLETE: 8, DROP_LOW_QUALITY: 9,
};
export function offerActionRank(r: NexusDiscoveryResult): number {
  const pack = (r.contact_pack ?? {}) as { next_best_action?: string };
  const action = text(r.next_best_action) || text(pack.next_best_action);
  return action in NEXT_ACTION_RANK ? NEXT_ACTION_RANK[action] : 10;
}
export function journeyNextLabel(stage: string, hasThread: boolean) {
  if (hasThread) return ['agreed','executing'].includes(stage) ? 'Voir l’accord' : 'Suivre la réponse';
  if (['completed','cancelled'].includes(stage)) return 'Voir la démarche';
  return ['discovered','enriching'].includes(stage) ? 'Compléter les informations' : 'Voir la démarche';
}
