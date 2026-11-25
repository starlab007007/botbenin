import { normalizeFabricText,redactPublicContacts } from './waouh-signal-fabric.ts';
import { publicBusinessEvidence } from './waouh-public-discovery.ts';
import { productPhotos } from './waouh-product-presentation.ts';
import { missionEntity, missionDeadline, type MissionKind } from './waouh-mission-domain.ts';
import {procurementBuyerSignal} from './waouh-free-discovery.ts';

/** Older search imports used the user's goal as title: retain the actual source title. */
export function discoveryRecordIdentity(row:Record<string,any>){
  const title=row.evidence?.title;
  return row.evidence?.discovered_via==='serpapi'&&typeof title==='string'&&title.trim().length>=3
    ?{...row,subject:redactPublicContacts(title).slice(0,240)}:row;
}

export function discoveryRecordCurrent(row: Record<string, any>, now=Date.now()) {
  if (typeof row.source_url === "string") {
    try {
      const source = new URL(row.source_url);
      const google = source.hostname === "google.com" || source.hostname === "www.google.com";
      if (google && ["/goto", "/url", "/search"].includes(source.pathname.replace(/\/$/, ""))) return false;
    } catch {
      return false;
    }
  }
  const offer={...row,fabric_id:String(row.fabric_id??'')};
  const deadline=missionDeadline(offer);
  return missionEntity(offer)!=='announcement'||deadline===null||deadline>=now;
}

/** One candidate loader for interactive search, the catalogue and background follow-up. */
export async function loadDiscoveryRecords(
  db: { from: (table: string) => any;rpc?: (name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:any}> },
  input: {query: string; mode: string; publicSources?: readonly string[]; internalOnly?: boolean;city?:string|null;budgetMax?:number|null;domain?:string|null;country?:string|null;limit?:number;offset?:number},
) {
  if(!db.rpc)throw new Error('unified_search_unavailable');
  const synonyms:Record<string,string>={plombier:'plomberie',electricien:'electricite',frigo:'refrigerateur',portable:'telephone'};
  const words=normalizeFabricText(input.query).split(/\s+/);
  const query=[...words,...words.flatMap(w=>synonyms[w]?[synonyms[w]]:[])].join(' ');
  const {data,error}=await db.rpc('waouh_search_unified',{
    p_query:query.slice(0,1000),p_mode:input.mode,p_sources:input.publicSources?[...input.publicSources]:null,
    p_internal_only:input.internalOnly??false,p_city:input.city??null,p_budget:input.budgetMax??null,
    p_domain:input.domain??null,p_country:input.country??null,p_limit:Math.min(200,Math.max(1,input.limit??200)),p_offset:input.offset??0,
  });
  if(error||!data||!Array.isArray(data.records))throw new Error('discovery_records_unavailable');
  const records=data.records.map(discoveryRecordIdentity).filter((r:Record<string,any>)=>discoveryRecordCurrent(r))
    .map((r:Record<string,any>)=>input.mode==='find_buyers'?procurementBuyerSignal(r):r)
    .filter((r:Record<string,any>)=>input.mode!=='find_buyers'||['BUY','RFQ'].includes(r.intent));
  return {records,coverage:{inspected:records.length,total:data.total,offset:data.offset,next_offset:data.next_offset,
    indexed:true,exhaustive:data.total<=data.limit}};
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

