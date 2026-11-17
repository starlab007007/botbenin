import {matchVerdict,needDomain,foldText} from "./waouh-need-domain.ts";
import {type MissionKind} from "./waouh-mission-domain.ts";
import {type FabricSignal} from "./waouh-signal-fabric.ts";

/** A local plan works without an API key, model download or paid search request. */
export function freeDiscoveryPlan(query:string,options:{mode?:"find_sellers"|"find_buyers"|null;city?:string|null;budgetMax?:number|null;kind?:MissionKind}) {
  const amount=/(?:budget(?:\s+max(?:imum)?)?|moins de|maximum|jusqu.[aà])\s*(?:de\s*)?([\d .\u00a0]+)\s*(?:fcfa|xof|cfa)\b/i.exec(query)?.[1];
  const budget=amount?Number(amount.replace(/\D/g,"")):null;
  const city=options.city??/\b(Cotonou|Abomey[- ]Calavi|Porto[- ]Novo|Godomey|Parakou|Pahou|Bohicon|Ouidah)\b/i.exec(query)?.[1]??null;
  const normalized=query.replace(/(?:budget(?:\s+max(?:imum)?)?|moins de|maximum|jusqu.[aà])\s*(?:de\s*)?[\d .\u00a0]+\s*(?:fcfa|xof|cfa)\b/gi,"").trim();
  return {mode:options.mode??(options.kind==="sale"?"find_buyers":"find_sellers"),normalized_query:normalized||query,city,
    budget_max:options.budgetMax??(budget&&Number.isFinite(budget)?budget:null),
    priorities:["domain","relevance","model","price","distance","freshness","contactability"],
    source_families:["waouh","web_public","directories","social_public"],missing:[],
    next_actions:["Comparer les résultats","Préparer le contact"],confidence:1,
    rationale:"Recherche gratuite dans les sources publiques et les fiches vérifiées.",domain:needDomain(query)};
}

export type MarketReference={minimum:number;maximum:number;median:number;currency:"XOF";sample_size:number;basis:string};
/** Published asking prices are comparable only with the same model and known scope. */
export function marketReference(query:string,offers:FabricSignal[],city?:string|null):MarketReference|null {
  const unique=new Map<string,number>();
  for(const offer of offers) {
    if(String(offer.intent).toUpperCase()!=="SELL"||offer.evidence?.offer_kind==="service"||
      (offer.currency&&offer.currency!=="XOF"))continue;
    const verdict=matchVerdict(query,offer,{place:city});
    if(!verdict.exact)continue;
    const model=foldText(offer.model),request=foldText(query);
    if(model&&!model.split(" ").filter(w=>w&&!['galaxy','apple','samsung'].includes(w)).every(w=>request.includes(w)))continue;
    if(city&&offer.city&&foldText(city)!==foldText(offer.city))continue;
    const price=Number(offer.price_min??offer.price_max);
    if(!Number.isFinite(price)||price<=0)continue;
    unique.set(String(offer.source_url??offer.fabric_id),price);
  }
  const prices=[...unique.values()].sort((a,b)=>a-b);
  if(!prices.length)return null;
  const n=prices.length,median=n%2?prices[(n-1)/2]:(prices[n/2-1]+prices[n/2])/2;
  return {minimum:prices[0],maximum:prices[n-1],median,currency:"XOF",sample_size:n,basis:"Prix demandés dans les annonces comparables, hors frais et négociation"};
}

export function procurementBuyerSignal(row:Record<string,any>) {
  if(row.intent!=="ANNOUNCE"||!/(?:government_procurement|bceao_procurement|boad_procurement)$/.test(String(row.source_key)))return row;
  return {...row,intent:"RFQ",evidence:{...row.evidence,source_intent:"ANNOUNCE",procurement_notice:true}};
}
