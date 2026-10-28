import {choiceMatches, choiceText} from './waouh-offer-choice.ts';
import {productPhotos} from './waouh-product-presentation.ts';

export const SALE_PHOTO_LIMIT = 4;
export const SALE_CONDITIONS = [
  {value:'new', label:'Neuf'}, {value:'like_new', label:'Comme neuf'},
  {value:'good', label:'Bon état'}, {value:'fair', label:'Utilisé'}, {value:'poor', label:'À réparer'},
] as const;
export type SaleCondition = typeof SALE_CONDITIONS[number]['value'];
export type SaleDraft = {title:string;price:number|null;condition:SaleCondition|null;city:string;district:string;location_label:string;photos:string[];description:string;quantity:number|null;unit:string;latitude:number|null;longitude:number|null;article_id?:string;request_id?:string};
export type SaleSuggestions = {title?:string;condition?:SaleCondition;price?:{value:number;low:number;high:number;observations:number};quantity?:number;unit?:string;city?:string;visual_used?:boolean};
const number=(v:unknown)=>{if(v===null||v===undefined||v==='')return null;const n=Number(typeof v==='string'?( /^\d{1,3}(?:[ .]\d{3})+$/.test(v.trim())?v.replace(/[ .]/g,''):v.replace(/\s/g,'').replace(',','.')):v);return Number.isFinite(n)?n:null;};
const text=(v:unknown,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
export function salePlace(label:unknown){
  const parts=text(label,160).split(',').map(s=>s.trim()).filter(Boolean);
  return {city:parts.at(-1)??'',district:parts.length>1?parts.slice(0,-1).join(', '):''};
}
export function saleTextSuggestions(value:string):SaleSuggestions {
  const n=choiceText(value),out:SaleSuggestions={};
  if (/\b(a reparer|en panne|ne fonctionne|defectueux)\b/.test(n))out.condition='poor';
  else if(/\b(comme neu[fv]e?|quasi neu[fv]e?|excellent etat)\b/.test(n))out.condition='like_new';
  else if(/\b(neuf|neuve|scelle|emballe)\b/.test(n))out.condition='new';
  else if(/\b(bon etat|reconditionne)\b/.test(n))out.condition='good';
  else if(/\b(occasion|usage|utilise|use)\b/.test(n))out.condition='fair';
  const amount=value.match(/(?:prix\s*(?:de|:)?\s*)?(\d[\d\s.,]*?)\s*(k|millions?|mille)?\s*(?:f\s*cfa|fcfa|xof|francs?|f\b)/i);
  if(amount){const v=number(amount[1]);const factor=/million/i.test(amount[2]??'')?1e6:/k|mille/i.test(amount[2]??'')?1e3:1;if(v&&v*factor<=1e12)out.price={value:Math.round(v*factor),low:Math.round(v*factor),high:Math.round(v*factor),observations:0};}
  const quantity=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/\b(\d+(?:[.,]\d+)?)\s*(tonnes?|kg|kilos?|sacs?|pieces?|unites?|litres?)\b/);
  if(quantity){out.quantity=Number(quantity[1].replace(',','.'));out.unit=/tonne/.test(quantity[2])?'tonne':/kg|kilo/.test(quantity[2])?'kg':/sac/.test(quantity[2])?'sac':/litre/.test(quantity[2])?'litre':'pièce';}
  const city=n.match(/\b(?:a|sur)\s+(Cotonou|Porto[- ]Novo|Abomey[- ]Calavi|Parakou|Bohicon|Ouidah|Djougou|Natitingou|Lokossa|Kandi)\b/i);
  if(city)out.city=({cotonou:'Cotonou','porto novo':'Porto-Novo','abomey calavi':'Abomey-Calavi',parakou:'Parakou',bohicon:'Bohicon',ouidah:'Ouidah',djougou:'Djougou',natitingou:'Natitingou',lokossa:'Lokossa',kandi:'Kandi'} as Record<string,string>)[city[1].toLowerCase()]??city[1];
  return out;
}
export function normalizeSaleDraft(value:Record<string,any>):SaleDraft {
  const place=salePlace(value.location_label??[value.district,value.city].filter(Boolean).join(', '));
  const lat=number(value.latitude),lng=number(value.longitude),price=number(value.price),quantity=number(value.quantity);
  const coordinates=lat!==null&&lng!==null&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  return {title:text(value.title),price:price!==null&&price>0&&price<=1e12?Math.round(price):null,
    condition:SALE_CONDITIONS.some(c=>c.value===value.condition)?value.condition:null,
    city:place.city,district:place.district,location_label:text(value.location_label,160)||[place.district,place.city].filter(Boolean).join(', '),photos:productPhotos(value),description:text(value.description,2000),
    quantity:quantity!==null&&quantity>0&&quantity<=1e6?quantity:null,unit:text(value.unit,40),
    latitude:coordinates?lat:null,longitude:coordinates?lng:null,
    ...(typeof value.article_id==='string'?{article_id:value.article_id}:{}),...(typeof value.request_id==='string'?{request_id:value.request_id}:{})};
}
export function trustedSalePhotos(value:unknown,storageUrl:string,owner:string):string[]{
  if(!Array.isArray(value))return [];
  if(value.length>SALE_PHOTO_LIMIT)throw new Error('sale_too_many_photos');
  const root=new URL(storageUrl);
  const photos=value.map(v=>{
    if(typeof v!=='string')throw new Error('sale_invalid_photo');
    const u=new URL(v);
    if(u.origin!==root.origin||u.username||u.password||u.search||u.hash||!u.pathname.startsWith(`/storage/v1/object/public/waouh-uploads/nexus/${owner}/`))throw new Error('sale_invalid_photo');
    return u.href;
  });
  return [...new Set(photos)];
}
/** Prices are observations for an equivalent reference, condition and unit, never a model guess. */
export function suggestSalePrice(draft:SaleDraft,rows:any[]):SaleSuggestions['price']|undefined {
  const words=choiceText(draft.title).split(' ').filter(w=>(w.length>2||/^\d{2,4}$/.test(w))&&!['vends','vendre','telephone','mon','une','bon','etat','neuf','occasion'].includes(w));
  if(words.length<2||!draft.condition)return;
  const storage=choiceText(draft.title).match(/\b(\d{2,4})\s*(go|gb)\b/)?.[1];
  const variant=(v:string)=>[...new Set(choiceText(v).split(' ').filter(t=>['pro','max','plus','ultra','mini','fe'].includes(t)))].sort().join(':');
  const device=/iphone|galaxy|samsung|pixel|ordinateur/i.test(draft.title);
  const seen=new Set<string>();
  const comparable=rows.filter(r=>{
    const key=r.origin_signal_id||r.id;if(!key||seen.has(key))return false;
    if(r.currency!=='XOF'||r.condition!==draft.condition||r.status!=='active'||r.id===draft.article_id)return false;
    if(device&&variant(draft.title)!==variant(String(r.title)+' '+String(r.model??'')))return false;
    if(storage&&choiceText([r.title,r.model].join(' ')).match(/\b(\d{2,4})\s*(go|gb)\b/)?.[1]!==storage)return false;
    const unit=choiceText(r.ai_attributes?.unit??'');
    if(!device&&draft.unit&&unit!==choiceText(draft.unit))return false;
    if(!choiceMatches({fabric_id:r.id,subject:r.title,condition:r.condition,currency:r.currency,city:r.city,price_min:r.price,price_max:r.price,evidence:{brand:r.brand,model:r.model}},{query:draft.title,mode:'buy',missionKind:'purchase'}))return false;
    if(words.filter(w=>choiceText([r.title,r.brand,r.model].join(' ')).split(' ').includes(w)).length<Math.min(2,words.length))return false;
    seen.add(key);return true;
  }).map(r=>Number(r.price)).filter(v=>Number.isFinite(v)&&v>0&&v<=1e12).sort((a,b)=>a-b);
  if(comparable.length<3)return;
  const median=comparable[Math.floor(comparable.length/2)],clean=comparable.filter(v=>v>=median*.25&&v<=median*4);
  if(clean.length<3)return;
  return {value:clean[Math.floor(clean.length/2)],low:clean[Math.floor((clean.length-1)*.25)],high:clean[Math.ceil((clean.length-1)*.75)],observations:clean.length};
}
export function saleCategory(title:string):string {
  const t=choiceText(title);
  return /iphone|samsung|galaxy|telephone|smartphone|pixel/.test(t)?'smartphone':/ordinateur|macbook|laptop|pc portable/.test(t)?'ordinateur':/moto|voiture|toyota|honda|yamaha|vehicule/.test(t)?'vehicule':/robe|chemise|pantalon|vetement/.test(t)?'vetement':/frigo|climatiseur|television|congelateur|refrigerateur/.test(t)?'electromenager':/table|chaise|lit|canape|meuble/.test(t)?'meuble':'autre';
}
export function mergeSaleSuggestions(draft:SaleDraft,s:SaleSuggestions,dirty:Set<string>):SaleDraft {
  return {...draft,...(!dirty.has('title')&&s.title?{title:s.title}:{}),...(!dirty.has('price')&&s.price?{price:s.price.value}:{}),...(!dirty.has('condition')&&s.condition?{condition:s.condition}:{}),...(!dirty.has('city')&&!draft.city&&s.city?{city:s.city}:{}),...(!dirty.has('quantity')&&s.quantity?{quantity:s.quantity}:{}),...(!dirty.has('unit')&&s.unit?{unit:s.unit}:{})};
}
