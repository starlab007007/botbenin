import { normalizeFabricText } from './waouh-signal-fabric.ts';
import { publicBusinessEvidence } from './waouh-public-discovery.ts';
import { productPhotos } from './waouh-product-presentation.ts';
import { missionEntity, missionDeadline, type MissionKind } from './waouh-mission-domain.ts';

export function discoveryRecordCurrent(row: Record<string, any>, now=Date.now()) {
  const offer={...row,fabric_id:String(row.fabric_id??'')};
  const deadline=missionDeadline(offer);
  return missionEntity(offer)!=='announcement'||deadline===null||deadline>=now;
}

/** One candidate loader for interactive search, the catalogue and background follow-up. */
export async function loadDiscoveryRecords(
  db: { from: (table: string) => any },
  input: {query: string; mode: string; publicSources?: readonly string[]; internalOnly?: boolean},
) {
  const desired = input.mode === 'find_buyers' ? ['BUY', 'RFQ'] : ['SELL', 'ANNOUNCE'];
  // Drop query operators before constructing PostgREST filters. Search the description too:
  // a provider's title may be a business name rather than the service being requested.
  const terms = [...new Set(normalizeFabricText(input.query).split(/\s+/)
    .filter(t => /^[a-z0-9]{3,30}$/.test(t)))].slice(0, 8);
  const base = () => {
    let q = db.from('waouh_signal_fabric').select('*').in('intent', desired);
    if (input.publicSources) q = q.in('source_key', input.publicSources);
    if (input.internalOnly) q = q.or('fabric_id.like.article:%,fabric_id.like.catalog:%');
    return q;
  };
  const recent = base().order('observed_at', {ascending: false}).limit(1000);
  const targeted = terms.length ? base().or(terms.flatMap(t =>
    ['subject', 'raw_text', 'category'].map(field => `${field}.ilike.%${t}%`)).join(','))
    .order('observed_at', {ascending: false}).limit(1000) : null;
  const [a, b] = await Promise.all([recent, targeted ?? Promise.resolve({data: [], error: null})]);
  if (a.error || b.error) throw new Error('discovery_records_unavailable');
  const candidates = [...new Map([...(b.data ?? []), ...(a.data ?? [])].map(r => [r.fabric_id, r])).values()] as Record<string, any>[];
  const records=candidates.filter(r=>discoveryRecordCurrent(r));
  return {records, coverage: {inspected: records.length, targeted: b.data?.length ?? 0, recent: a.data?.length ?? 0, exhaustive: false}};
}

/** Persist declared business facts in the same shape for products, services and opportunities. */
export function discoveryBusinessFacts(input: Record<string, any>): Record<string, unknown> & {offer_kind: string} {
  const evidence = input.evidence && typeof input.evidence === 'object' ? input.evidence : {};
  const facts = publicBusinessEvidence({...evidence, ...input});
  const photos = publicBusinessEvidence({photos: productPhotos(input)}).photos;
  if (photos) facts.photos = photos;
  const offerKind = missionEntity({fabric_id: '', subject: input.product_name ?? input.title,
    category: input.category, evidence: {...evidence, ...facts}});
  return {...facts, offer_kind: offerKind};
}

export function publicSearchProfiles(mode: string, query: string, city?: string | null, kind?: MissionKind) {
  const clean = query.replace(/"/g, "").trim();
  const where = [city, "Bénin"].filter(Boolean).join(" ");
  const sellIntent = '("à vendre" OR vente OR prix OR disponible OR arrivage OR boutique OR fournisseur)';
  const buyIntent = '("je cherche" OR "besoin de" OR "qui vend" OR "cherche fournisseur" OR "demande de cotation" OR RFQ OR "appel d\'offres")';
  const intent = kind === 'opportunity' ? '(bourse OR emploi OR recrutement OR formation OR subvention OR "appel à projets")'
    : kind === 'service' || kind === 'project' ? '(prestataire OR service OR devis OR professionnel OR agence)'
    : mode === "find_sellers" ? sellIntent : buyIntent;
  const socialSites = "(site:facebook.com OR site:instagram.com OR site:tiktok.com OR site:t.me)";
  const localBusinessSites = "(site:monentreprise.bj OR site:cci.bj OR site:apiex.bj OR site:.bj)";
  const commerceSites = "(site:jiji.bj OR site:afribaba.bj OR site:expat.com OR site:linkedin.com)";
  const b2bSites = "(site:marches-publics.bj OR site:armp.bj OR site:dgmp.bj OR site:linkedin.com OR site:.bj)";
  if (kind === 'opportunity') return [
    {key:'opportunities', q:`${clean} ${intent} ${where}`},
    {key:'institutions', q:`${clean} ${intent} ${where} (site:gouv.bj OR site:apiex.bj OR site:cci.bj OR site:undp.org)`},
  ];
  const profiles = [
    { key: "social", q: `"${clean}" ${intent} ${where} ${socialSites}` },
    { key: "local", q: `"${clean}" ${intent} ${where} ${localBusinessSites}` },
    {
      key: mode === "find_buyers" ? "b2b" : "commerce",
      q: `"${clean}" ${intent} ${where} ${mode === "find_buyers" ? b2bSites : commerceSites}`,
    },
  ];
  return profiles;
}

