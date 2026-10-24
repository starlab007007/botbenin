/** Pure contract shared by the Edge Function, Web and contract fixtures. */
export const CONVERGENCE_LIMIT = 5;
export type ConvergenceKind = 'product' | 'service' | 'announcement';
export type ConvergenceRow = Record<string, any>;
export function record(v: unknown): ConvergenceRow {
  return v && typeof v === 'object' && !Array.isArray(v) ? v as ConvergenceRow : {};
}
export function amount(v: unknown): number | null {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  if (typeof v === 'string' && !/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim())) return null;
  const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null;
}
export function safeReferenceUrl(v: unknown): string | null {
  try { const u = new URL(String(v)); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
}
export function resultKind(value: unknown): ConvergenceKind {
  const r = record(value), e = record(r.evidence);
  const explicit = String(r.offer_kind ?? r.kind ?? e.offer_kind ?? '').toLowerCase();
  if (['service', 'prestation'].includes(explicit)) return 'service';
  if (['announcement', 'annonce', 'job', 'event', 'formation'].includes(explicit)) return 'announcement';
  if (['product', 'article', 'catalog'].includes(explicit)) return 'product';
  const category = String(r.category ?? e.category ?? '').toLowerCase();
  if (/emploi|recrutement|formation|événement|evenement|annonce|opportunit/.test(category)) return 'announcement';
  return /service|prestation|réparation|reparation|plomberie|nettoyage|coiffure|location/.test(category) ? 'service' : 'product';
}
export type MarketReference = { title: string; seller: string; amount: number; url: string; observed_at: string | null; comparable: boolean; model: string; unit: string; currency: string };
export function marketReferences(value: unknown): MarketReference[] {
  const r = record(value), e = record(r.evidence);
  const raw = r.market_references ?? e.market_references ?? r.price_references ?? e.price_references;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const expected = String(r.model ?? e.model ?? '').trim().toLowerCase();
  const unit = String(r.unit ?? e.unit ?? 'forfait').trim().toLowerCase();
  const currency = String(r.currency ?? 'XOF').toUpperCase();
  return raw.flatMap(v => {
    const x = record(v), url = safeReferenceUrl(x.url ?? x.source_url), n = amount(x.amount ?? x.price);
    if (!url || n === null || seen.has(url)) return [];
    seen.add(url);
    const model = String(x.model ?? '').trim().toLowerCase(), otherUnit = String(x.unit ?? 'forfait').trim().toLowerCase();
    const cur = String(x.currency ?? 'XOF').toUpperCase();
    return [{ title: String(x.title ?? 'Référence publique').slice(0, 300), seller: String(x.seller ?? x.source ?? new URL(url).hostname).slice(0, 150),
      amount: n, url, observed_at: typeof x.observed_at === 'string' ? x.observed_at : null,
      comparable: x.comparable === true && !!expected && model === expected && otherUnit === unit && cur === currency,
      model, unit: otherUnit, currency: cur }];
  }).slice(0, CONVERGENCE_LIMIT);
}
/** References are observations from the returned search, never fabricated market prices. */
export function withSearchReferences<T extends ConvergenceRow>(rows: T[]): T[] {
  return rows.map(r => {
    if (marketReferences(r).length) return r;
    const e = record(r.evidence), model = String(r.model ?? e.model ?? '').trim().toLowerCase();
    const category = String(r.category ?? e.category ?? '').trim().toLowerCase();
    const condition = String(r.condition ?? '').trim().toLowerCase();
    const kind = resultKind(r);
    const refs = rows.filter(x => x !== r && resultKind(x) === kind &&
      (model ? String(x.model ?? record(x.evidence).model ?? '').trim().toLowerCase() === model : !!category && String(x.category ?? record(x.evidence).category ?? '').trim().toLowerCase() === category))
      .map(x => ({ title: x.title, seller: x.seller_label ?? x.source, price: x.price ?? x.price_min,
        source_url: x.source_url, observed_at: x.last_verified_at ?? x.observed_at ?? null,
        model: x.model ?? record(x.evidence).model, unit: x.unit ?? record(x.evidence).unit ?? 'forfait', currency: x.currency ?? 'XOF',
        comparable: kind === 'product' && !!model && !!condition && String(x.condition ?? '').trim().toLowerCase() === condition }));
    return { ...r, market_references: refs, market_reference_scope: 'search_results' };
  });
}
export function resultEssentials(value: unknown) {
  const r = record(value), e = record(r.evidence), kind = resultKind(r), refs = marketReferences(r);
  const missing: string[] = [];
  const price = amount(r.price ?? r.price_min);
  if (kind !== 'announcement' && price === null) missing.push('Prix à préciser');
  if (kind === 'product' && !r.availability && !e.availability) missing.push('Stock à confirmer');
  if (kind === 'product' && amount(r.delivery_fee ?? e.delivery_fee) === null) missing.push('Livraison à préciser');
  if (kind === 'service') {
    if (!(r.scope ?? e.scope)) missing.push('Périmètre de prestation à préciser');
    if (!(r.availability ?? e.availability)) missing.push('Créneau à confirmer');
    if (!(r.exclusions ?? e.exclusions)) missing.push('Frais et exclusions à préciser');
  }
  if (kind === 'announcement') {
    if (!(r.expires_at ?? e.expires_at)) missing.push('Validité à confirmer');
    if (!(r.conditions ?? e.conditions)) missing.push('Conditions à préciser');
  }
  const supplied = [r.recommendation, r.advice, e.recommendation, ...(Array.isArray(r.reasons) ? r.reasons : [])]
    .find(x => typeof x === 'string' && x.trim());
  const comparable = refs.filter(x => x.comparable);
  const sorted = comparable.map(x => x.amount).sort((a,b) => a-b);
  const median = sorted.length < 2 ? null : sorted.length % 2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
  return { kind, refs, missing, median, referenceScope: r.market_reference_scope === 'search_results' ? 'Offres de cette recherche' : 'Sources documentées', advice: supplied ? String(supplied).trim() : null,
    market: comparable.length >= 2 ? `${comparable.length} références comparables documentées`
      : refs.length ? `${refs.length} référence${refs.length > 1 ? 's' : ''} · comparaison à confirmer` : 'Références comparables insuffisantes',
    facts: [r.brand ?? e.brand, r.model ?? e.model, r.condition, r.unit ?? e.unit].filter(x => typeof x === 'string' && x.trim()).slice(0, 3),
    primaryLabel: kind === 'service' ? 'Demander cette prestation' : kind === 'announcement' ? 'Répondre à l’annonce' : 'Je le veux' };
}
export function planTotal(components: ConvergenceRow[]) {
  const parts = components.map(c => {
    const agreement = record(c.agreement), agreed = amount(record(agreement.terms).amount);
    return agreement.status !== 'rejected' && agreed !== null ? { base: agreed, extra: 0 } : { base: amount(c.amount), extra: amount(c.extra_cost) };
  });
  const known = parts.reduce((sum, c) => sum + (c.base ?? 0) + (c.extra ?? 0), 0);
  return { known, complete: parts.length > 0 && parts.every(c => c.base !== null && c.extra !== null), count: parts.length };
}
export function sanitizeAiPlans(input: unknown) {
  const plans = record(input).plans;
  if (!Array.isArray(plans)) return [];
  return plans.slice(0, 3).flatMap(v => {
    const p = record(v); if (typeof p.title !== 'string' || p.title.trim().length < 2) return [];
    return [{ title: p.title.trim().slice(0, 200), rationale: String(p.rationale ?? '').slice(0, 3000),
      requirements: Array.isArray(p.requirements) ? p.requirements.filter(x => typeof x === 'string').slice(0, 10).map(x => x.slice(0, 300)) : [] }];
  });
}
export const CONVERGENCE_ACTIONS = new Set(['list','get','create','cancel','mission_update','plan_add','plan_select','component_add','component_remove','invite','redeem_invite',
  'agreement_propose','agreement_accept','agreement_reject','agreement_complete','pool_list','pool_create','pool_join','pool_leave','pool_invite','pool_quote','pool_accept','metrics','suggest']);
export function validateConvergenceRequest(body: unknown) {
  const b = record(body), action = String(b.action ?? ''), p = record(b.payload);
  if (!CONVERGENCE_ACTIONS.has(action)) throw new Error('Action non reconnue.');
  if (JSON.stringify(p).length > 32000) throw new Error('La demande est trop volumineuse.');
  for (const key of ['mission_id','plan_id','component_id','pool_id']) if (p[key] != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p[key])) throw new Error('Référence invalide.');
  for (const key of ['amount','extra_cost','budget_max','shared_cost']) if (p[key] != null && p[key] !== '' && (amount(p[key]) === null || Number(p[key]) > 1e10)) throw new Error('Montant invalide.');
  if (action === 'create' && (!['product','service','announcement'].includes(p.kind) || typeof p.goal !== 'string' || p.goal.trim().length < 3 || typeof p.city !== 'string' || p.city.trim().length < 2)) throw new Error('Précisez le besoin, sa nature et la ville.');
  if (action === 'create' && (typeof p.request_key !== 'string' || p.request_key.length < 8 || p.request_key.length > 120 || p.goal.length > 2000 || p.city.length > 120 || (p.criteria != null && (!Array.isArray(p.criteria) || p.criteria.length > 10 || !p.criteria.every((x: unknown) => typeof x === 'string' && x.length <= 300))))) throw new Error('Le besoin ou ses conditions dépassent les limites autorisées.');
  if (action === 'component_add' && p.source_url && !safeReferenceUrl(p.source_url)) throw new Error('Lien source invalide.');
  if (action.startsWith('agreement_') && action !== 'agreement_propose' && (!Number.isInteger(p.version) || p.version < 1)) throw new Error('Rechargez la version actuelle de l’accord.');
  if (action === 'agreement_propose') {
    const t = record(p.terms); if (amount(t.amount) === null || Number(t.amount) > 1e10 || !['scope','exclusions','deadline','expected_result'].every(k => typeof t[k] === 'string' && t[k].trim())) throw new Error('Complétez le prix total, le périmètre, les exclusions, le délai et le résultat attendu.');
  }
  if (action === 'pool_quote' && (amount(p.shared_cost) === null || typeof p.scope !== 'string' || p.scope.trim().length < 3 || !p.expires_at || !Number.isFinite(Date.parse(p.expires_at)))) throw new Error('Précisez le coût partagé, son périmètre et sa validité.');
  for (const key of ['deadline','expires_at']) if (p[key] != null && p[key] !== '' && (typeof p[key] !== 'string' || !Number.isFinite(Date.parse(p[key])))) throw new Error('Date invalide.');
  const requiredId = action.startsWith('agreement_') || ['invite','component_remove'].includes(action) ? 'component_id'
    : ['pool_join','pool_leave','pool_invite','pool_quote','pool_accept'].includes(action) ? 'pool_id'
    : ['get','cancel','mission_update','plan_add','plan_select','component_add','pool_create','suggest'].includes(action) ? 'mission_id' : null;
  if (requiredId && !p[requiredId]) throw new Error('Référence requise.');
  if (['component_add','plan_select'].includes(action) && !p.plan_id) throw new Error('Chemin requis.');
  if (action === 'pool_join' && !p.mission_id) throw new Error('Besoin requis.');
  if (['pool_create','pool_join'].includes(action) && p.consent !== true) throw new Error('Votre accord explicite est nécessaire.');
  if (action === 'pool_create' && (!p.deadline || typeof p.topic !== 'string' || p.topic.trim().length < 3)) throw new Error('Précisez le sujet public et son échéance.');
  if (action === 'pool_accept' && (!Number.isInteger(p.version) || p.version < 1)) throw new Error('Version de proposition requise.');
  if (action === 'redeem_invite' && !/^[0-9a-f]{64}$/i.test(String(p.token ?? ''))) throw new Error('Code d’invitation invalide.');
  if (['plan_add','component_add'].includes(action) && (typeof p.title !== 'string' || p.title.trim().length < 2)) throw new Error('Titre requis.');
  // Identity is derived from the verified JWT. Discard client-supplied claims.
  const { actor_id: _a, owner_id: _o, provider_id: _pr, user_id: _u, ...payload } = p;
  return { action, payload };
}
