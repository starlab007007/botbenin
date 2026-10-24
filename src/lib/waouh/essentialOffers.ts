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
  const min = r.price_min, max = r.price_max;
  if (min == null && max == null) return 'Prix à demander';
  return min != null && max != null && min !== max ? `${money(min)} – ${money(max)}` : money((min ?? max)!);
}
export function offerKind(r: NexusDiscoveryResult) { return resultKind(r); }
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
export function journeyNextLabel(stage: string, hasThread: boolean) {
  if (hasThread) return ['agreed','executing'].includes(stage) ? 'Voir l’accord' : 'Suivre la réponse';
  if (['completed','cancelled'].includes(stage)) return 'Voir la démarche';
  return ['discovered','enriching'].includes(stage) ? 'Compléter les informations' : 'Voir la démarche';
}
