import {missionMatches,compareMissionOffers,type MissionCriteria} from './waouh-mission-domain.ts';
/** Deterministic shortlist shared by the browser and the autonomous worker. */
export type ChoiceOffer = {fabric_id:string;subject?:string|null;category?:string|null;condition?:string|null;intent?:string|null;city?:string|null;price_min?:number|null;price_max?:number|null;currency?:string|null;article_id?:string|null;catalog_id?:string|null;evidence?:Record<string,unknown>|null;scores?:{relevance_score?:number}};
export type ChoiceCriteria = MissionCriteria & {query?:string;city?:string|null;budget?:number|null;mode?:string;priority?:'price'|'availability'};
export const choiceText=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const positive=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
export function choicePrice(o:ChoiceOffer){return positive(o.price_max)??positive(o.price_min);}
export function choiceAvailable(o:ChoiceOffer){const e=o.evidence??{};return e.availability_confirmed===true||e.in_stock===true||e.availability==='available';}
export function choiceAvailabilityConfirmed(o:ChoiceOffer){return o.evidence?.availability_confirmed===true;}
export function choicePriceConfirmed(o:ChoiceOffer){const e=o.evidence??{};return e.price_confirmed===true&&choicePrice(o)!==null&&[e.unit,e.price_unit,e.unite].some(v=>typeof v==='string'&&v.trim().length>0);}
/** Unknown shipping never becomes free shipping; ranges are not exact totals. */
export function choiceCost(o:ChoiceOffer){
  const e=o.evidence??{},price=choicePrice(o);
  const delivery=[e.delivery_fee,e.delivery_cost,e.shipping_cost].find(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
  const shipping=typeof delivery==='number'?delivery:e.delivery_included===true?0:null;
  const ranged=positive(o.price_min)!==null&&positive(o.price_max)!==null&&o.price_min!==o.price_max;
  return {price,delivery:shipping,total:price!==null&&shipping!==null&&!ranged?price+shipping:null};
}
const modelKey=(o:ChoiceOffer)=>{
 const e=o.evidence??{},hay=choiceText([o.subject,e.brand,e.model].filter(Boolean).join(' '));
 const m=hay.match(/\b(iphone|(?:samsung\s+)?galaxy|samsung|pixel)\s*(s?\d{1,3})(\s+(?:pro|max|ultra|plus|mini)){0,2}\b/);
 if(!m)return '';
 const brand=/samsung|galaxy/.test(m[1])?'galaxy':m[1];
 const capacity=hay.match(/\b(\d{2,4})\s*(go|gb)\b/)?.[1]??'';
 return [brand,m[2],choiceText(m[0]).replace(/^(?:samsung\s+)?(?:galaxy|samsung|iphone|pixel)\s*s?\d{1,3}/,''),capacity,choiceText(o.condition??e.condition),choiceText(e.unit??e.price_unit??e.unite)].join(':');
};
/** A large unexplained price gap is held for clarification, never labelled fraud. */
export function choicePriceNeedsReview(o:ChoiceOffer,peers:ChoiceOffer[]){
 if(o.evidence?.price_requires_clarification===true)return true;
 if(choicePriceConfirmed(o))return false;
 const price=choicePrice(o),key=modelKey(o);if(price===null||!key)return false;
 const values=peers.filter(p=>modelKey(p)===key).map(choicePrice).filter((p):p is number=>p!==null).sort((a,b)=>a-b);
 if(values.length<3)return false;
 const mid=Math.floor(values.length/2),median=values.length%2?values[mid]:(values[mid-1]+values[mid])/2;
 return price<median*.1;
}
const stop=new Set('je j veux voudrais cherche recherche trouver acheter vendre pour un une des les le la de du d au aux a et en dans mon ma mes moi bon bonne fiable neuf occasion aujourd hui besoin max maximum budget fcfa xof service'.split(' '));
export function choiceMatches(o:ChoiceOffer,c:ChoiceCriteria){
  if(!missionMatches(o,c))return false;
  const q=choiceText(c.query),city=choiceText(c.city),e=o.evidence??{};
  const hay=choiceText([o.subject,o.category,e.brand,e.model,e.description].filter(Boolean).join(' '));
  const model=q.match(/\b(iphone|galaxy|samsung|pixel)\s*(s?\d{1,3})\b/);
  if(model&&!new RegExp(`\\b${/samsung|galaxy/.test(model[1])?'(?:samsung\\s+(?:galaxy\\s+)?|galaxy\\s*)':model[1]+'\\s*'}${model[2]}\\b`).test(hay))return false;
  const storage=q.match(/\b(\d{2,4})\s*(go|gb)\b/),actual=hay.match(/\b(\d{2,4})\s*(go|gb)\b/);
  if(storage&&actual&&storage[1]!==actual[1])return false;
  const terms=q.split(' ').filter(t=>t.length>2&&!stop.has(t)&&!/^\d+$/.test(t)&&!city.split(' ').includes(t));
  if(terms.length&&!terms.some(t=>hay.split(' ').includes(t))&&Number(o.scores?.relevance_score??0)<75)return false;
  if(/\bneuf\b/.test(q)&&/\b(occasion|reconditionne|refurbished|used)\b/.test(choiceText([o.subject,o.condition,e.condition].join(' '))))return false;
  if(e.availability==='unavailable'||((!c.missionKind||['purchase','sale'].includes(c.missionKind))&&(e.in_stock===false||e.status==='sold')))return false;
  if(city&&choiceText(o.city)&&choiceText(o.city)!==city&&!(c.missionKind==='opportunity'&&['benin','national','en ligne'].includes(choiceText(o.city)))&&!(c.missionKind==='project'&&o.evidence?.remote===true))return false;
  if(c.missionKind!=='opportunity'&&o.currency&&o.currency!=='XOF')return false;
  if(c.missionKind!=='opportunity'&&c.mode!=='sell'&&c.budget&&c.budget>0){
    const low=positive(o.price_min),high=positive(o.price_max);
    if(low&&low>c.budget||high&&high>c.budget)return false;
    const total=choiceCost(o).total;if(total!==null&&total>c.budget)return false;
  }
  return true;
}
export function rankOfferChoices<T extends ChoiceOffer>(offers:T[],c:ChoiceCriteria):T[]{
  const seen=new Set<string>();
  const eligible=offers.filter(o=>{const e=o.evidence??{},article=o.article_id||e.article_id,catalog=o.catalog_id||e.catalog_id,key=article?`article:${article}`:catalog?`catalog:${catalog}`:o.fabric_id;if(!key||seen.has(key))return false;seen.add(key);return choiceMatches(o,c);});
  const rows=eligible.filter(o=>c.mode==='sell'||(c.missionKind&&c.missionKind!=='purchase')||!choicePriceNeedsReview(o,eligible));
  return rows.sort((a,b)=>{
    const domainOrder=compareMissionOffers(a,b,c);if(domainOrder!==null)return domainOrder;
    // Complete observations precede unknown prices; unknown never means zero/free.
    const ap=choicePrice(a),bp=choicePrice(b);
    const available=Number(choiceAvailable(b))-Number(choiceAvailable(a));
    if(c.priority==='availability'&&available)return available;
    const confirmed=Number(choicePriceConfirmed(b)&&choiceAvailabilityConfirmed(b))-Number(choicePriceConfirmed(a)&&choiceAvailabilityConfirmed(a));
    if(confirmed)return confirmed;
    const at=choiceCost(a).total,bt=choiceCost(b).total;
    if(c.mode!=='sell'&&ap!==null&&bp!==null&&(at===null)!==(bt===null))return at===null?1:-1;
    if((ap===null)!==(bp===null))return ap===null?1:-1;
    if(at!==null&&bt!==null&&at!==bt&&c.mode!=='sell')return at-bt;
    if(ap!==null&&bp!==null&&ap!==bp)return c.mode==='sell'?bp-ap:ap-bp;
    if(available)return available;
    return a.fabric_id<b.fabric_id?-1:a.fabric_id>b.fabric_id?1:0;
  });
}
