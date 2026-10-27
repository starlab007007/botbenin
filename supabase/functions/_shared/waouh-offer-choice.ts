/** Deterministic shortlist shared by the browser and the autonomous worker. */
export type ChoiceOffer = {fabric_id:string;subject?:string|null;category?:string|null;city?:string|null;price_min?:number|null;price_max?:number|null;currency?:string|null;article_id?:string|null;catalog_id?:string|null;evidence?:Record<string,unknown>|null;scores?:{relevance_score?:number}};
export type ChoiceCriteria = {query?:string;city?:string|null;budget?:number|null;mode?:string;priority?:'price'|'availability'};
export const choiceText=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const positive=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
export function choicePrice(o:ChoiceOffer){return positive(o.price_max)??positive(o.price_min);}
export function choiceAvailable(o:ChoiceOffer){const e=o.evidence??{};return e.availability_confirmed===true||e.in_stock===true||e.availability==='available';}
export function choiceAvailabilityConfirmed(o:ChoiceOffer){return o.evidence?.availability_confirmed===true;}
export function choicePriceConfirmed(o:ChoiceOffer){const e=o.evidence??{};return e.price_confirmed===true&&choicePrice(o)!==null&&[e.unit,e.price_unit,e.unite].some(v=>typeof v==='string'&&v.trim().length>0);}
const stop=new Set('je j veux voudrais cherche recherche trouver acheter vendre pour un une des les le la de du d au aux a et en dans mon ma mes moi bon bonne fiable neuf occasion aujourd hui besoin max maximum budget fcfa xof service'.split(' '));
export function choiceMatches(o:ChoiceOffer,c:ChoiceCriteria){
  const q=choiceText(c.query),city=choiceText(c.city),e=o.evidence??{};
  const hay=choiceText([o.subject,o.category,e.brand,e.model,e.description].filter(Boolean).join(' '));
  const model=q.match(/\b(iphone|galaxy|samsung|pixel)\s*(s?\d{1,3})\b/);
  if(model&&!new RegExp(`\\b${model[1]}\\s*${model[2]}\\b`).test(hay))return false;
  const storage=q.match(/\b(\d{2,4})\s*(go|gb)\b/),actual=hay.match(/\b(\d{2,4})\s*(go|gb)\b/);
  if(storage&&actual&&storage[1]!==actual[1])return false;
  const terms=q.split(' ').filter(t=>t.length>2&&!stop.has(t)&&!/^\d+$/.test(t)&&!city.split(' ').includes(t));
  if(terms.length&&!terms.some(t=>hay.split(' ').includes(t))&&Number(o.scores?.relevance_score??0)<75)return false;
  if(e.availability==='unavailable'||e.in_stock===false||e.status==='sold')return false;
  if(city&&choiceText(o.city)&&choiceText(o.city)!==city)return false;
  if(o.currency&&o.currency!=='XOF')return false;
  if(c.mode!=='sell'&&c.budget&&c.budget>0){
    const low=positive(o.price_min),high=positive(o.price_max);
    if(low&&low>c.budget||high&&high>c.budget)return false;
  }
  return true;
}
export function rankOfferChoices<T extends ChoiceOffer>(offers:T[],c:ChoiceCriteria):T[]{
  const seen=new Set<string>();
  const rows=offers.filter(o=>{const e=o.evidence??{},article=o.article_id||e.article_id,catalog=o.catalog_id||e.catalog_id,key=article?`article:${article}`:catalog?`catalog:${catalog}`:o.fabric_id;if(!key||seen.has(key))return false;seen.add(key);return choiceMatches(o,c);});
  return rows.sort((a,b)=>{
    // Complete observations precede unknown prices; unknown never means zero/free.
    const ap=choicePrice(a),bp=choicePrice(b);
    const available=Number(choiceAvailable(b))-Number(choiceAvailable(a));
    if(c.priority==='availability'&&available)return available;
    const confirmed=Number(choicePriceConfirmed(b)&&choiceAvailabilityConfirmed(b))-Number(choicePriceConfirmed(a)&&choiceAvailabilityConfirmed(a));
    if(confirmed)return confirmed;
    if((ap===null)!==(bp===null))return ap===null?1:-1;
    if(ap!==null&&bp!==null&&ap!==bp)return c.mode==='sell'?bp-ap:ap-bp;
    if(available)return available;
    return a.fabric_id<b.fabric_id?-1:a.fabric_id>b.fabric_id?1:0;
  });
}
