import copy from './waouh-mission-kinds.json' with {type:'json'};
import {resultKind} from './waouh-convergence-contract.ts';

export const MISSION_KINDS=['purchase','opportunity','service','project','sale'] as const;
export type MissionKind=typeof MISSION_KINDS[number];
export type MissionContext={kind:MissionKind;brief:string;max_days:number|null;required_pages:number|null;quantity:number|null;unit:string;price_floor:number|null};
export type MissionCriteria={missionKind?:MissionKind;brief?:string;maxDays?:number|null;requiredPages?:number|null;quantity?:number|null;unit?:string;priceFloor?:number|null;now?:number};
export type MissionOffer={fabric_id:string;subject?:string|null;category?:string|null;intent?:string|null;condition?:string|null;offer_kind?:string;kind?:string;price_min?:number|null;price_max?:number|null;currency?:string|null;expires_at?:string|null;evidence?:Record<string,unknown>|null};
export const missionCopy=copy;
export const missionText=(v:unknown)=>typeof v==='string'?v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim():'';
const str=(v:unknown)=>typeof v==='string'?v.trim():'';
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const positive=(v:unknown)=>number(v)!==null&&Number(v)>0?Number(v):null;
export function normalizeMissionKind(value:unknown,query='',mode=''):MissionKind{
 const s=missionText(value),aliases:Record<string,MissionKind>={acheter:'purchase',buy:'purchase',purchase:'purchase',vendre:'sale',sell:'sale',sale:'sale',opportunity:'opportunity',opportunite:'opportunity',opportunites:'opportunity',service:'service',services:'service',prestation:'project',prestations:'project',project:'project'};
 if(aliases[s])return aliases[s];
 if(mode==='sell'||mode==='find_buyers')return 'sale';
 const q=missionText(query);
 if(/\bvendre\b|\bje vends\b/.test(q))return 'sale';
 if(/\b(emploi|recrutement|stage|bourse|subvention|formation|opportunite)|appel.{0,12}projet/.test(q))return 'opportunity';
 if(/site (vitrine|web)|creation.{0,20}site|creer.{0,20}site|developpement|application mobile|livrable|prestation/.test(q))return 'project';
 if(/plombier|plomberie|fuite|reparat|reparer|nettoyage|coiff|electricien|climatisation|depannage|traiteur/.test(q))return 'service';
 return 'purchase';
}
export function normalizeMissionContext(value:unknown,kind:MissionKind,query='',floor?:number|null):MissionContext{
 const raw=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const q=missionText(query),days=q.match(/\b(\d{1,3})\s*(jours?|semaines?)\b/),pages=q.match(/\b(\d{1,3})\s*pages?\b/);
 const day=positive(raw.max_days)??(days?Number(days[1])*(days[2].startsWith('semaine')?7:1):null);
 return {kind,brief:str(raw.brief).slice(0,1500),max_days:day!==null?Math.max(1,Math.min(365,Math.floor(day))):null,required_pages:positive(raw.required_pages)??(pages?Number(pages[1]):null),quantity:positive(raw.quantity)!==null?Math.min(100000,Number(raw.quantity)):null,unit:str(raw.unit).slice(0,40),price_floor:Math.max(positive(raw.price_floor)??0,positive(floor)??0)||null};
}
export function missionCriteria(context:MissionContext):MissionCriteria{return {missionKind:context.kind,brief:context.brief,maxDays:context.max_days,requiredPages:context.required_pages,quantity:context.quantity,unit:context.unit,priceFloor:context.price_floor};}
export function missionDate(raw:unknown):number|null{
 if(typeof raw!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(raw))return null;
 const day=raw.slice(0,10),calendar=Date.parse(day+'T00:00:00Z');
 if(!Number.isFinite(calendar)||new Date(calendar).toISOString().slice(0,10)!==day)return null;
 const parsed=Date.parse(raw.length===10?raw+'T23:59:59+01:00':raw);return Number.isFinite(parsed)?parsed:null;
}
export function missionDeadline(o:MissionOffer):number|null{
 const e=o.evidence??{};for(const raw of [e.deadline,e.closing_date,e.expires_at,o.expires_at]){const value=missionDate(raw);if(value!==null)return value;}return null;
}
export function missionFacts(o:MissionOffer){
 const e=o.evidence??{},text=(...keys:string[])=>keys.map(k=>Array.isArray(e[k])?(e[k] as unknown[]).filter(v=>typeof v==='string').join(' · '):str(e[k])).find(Boolean)||'',num=(...keys:string[])=>keys.map(k=>number(e[k])).find(v=>v!==null)??null;
 const scope=text('scope','deliverables','perimetre','service_scope');
 const duration=num('delivery_days','duration_days','delai_jours');
 const pages=num('pages','page_count')??(Number(missionText(scope).match(/\b(\d{1,3})\s*pages?\b/)?.[1]||0)||null);
 const basis=missionText(text('price_basis','unit','price_unit','unite'));
 const visit=num('visit_fee','callout_fee','deplacement_fee')??(/visite|deplacement/.test(basis)?positive(o.price_max)??positive(o.price_min):null);
 const diagnostic=e.diagnostic_included===true?0:num('diagnostic_fee');
 return {scope,pages,duration,conditions:text('conditions','eligibility','eligibility_conditions'),deadline:missionDeadline(o),deadlineText:text('deadline','closing_date','expires_at'),exclusions:text('exclusions','extra_fees'),basis,visit,diagnostic,visitTotal:visit!==null&&diagnostic!==null?visit+diagnostic:null,warranty:text('warranty','guarantee'),revisions:num('revisions','revision_count'),minimumQuantity:num('minimum_quantity','min_quantity'),quantity:num('quantity','requested_quantity'),unit:text('unit','price_unit','unite'),organization:text('organization','organizer','provider_name','seller_name'),availability:text('availability','available_at','time_slot')};
}
export function missionEntity(o:MissionOffer){
 const e=o.evidence??{},explicit=missionText(o.offer_kind??o.kind??e.offer_kind??e.kind),known=resultKind(o),hay=missionText([o.subject,o.category,e.scope,e.description].filter(v=>typeof v==='string').join(' '));
 if(['product','article','catalog'].includes(explicit))return 'product';
 if(known==='announcement'||['announcement','annonce','opportunity','job','event','formation'].includes(explicit)||/emploi|recrutement|appel.{0,12}projet|bourse|subvention|formation|opportunit/.test(hay))return 'announcement';
 if(known==='service'||['service','prestation','project'].includes(explicit)||/plombier|plomberie|fuite|reparat|nettoyage|coiff|electricien|depannage|traiteur|site vitrine|creation web|developp|agence web|graphiste|photograph|coutur|mecanicien/.test(hay))return 'service';
 return 'product';
}
export function missionMatches(o:MissionOffer,c:MissionCriteria){
 const kind=c.missionKind;if(!kind||kind==='purchase')return true;
 const entity=missionEntity(o),e=o.evidence??{},f=missionFacts(o);
 if(kind==='opportunity')return entity==='announcement'&&e.eligible!==false&&e.eligibility_status!=='ineligible'&&(f.deadline===null||f.deadline>=(c.now??Date.now()));
 if(kind==='service'||kind==='project'){
  if(entity!=='service')return false;
  if(kind==='project'&&c.maxDays&&f.duration!==null&&f.duration>c.maxDays)return false;
  if(kind==='project'&&c.requiredPages&&f.pages!==null&&f.pages<c.requiredPages)return false;
  return true;
 }
 const intent=String(o.intent??'').toUpperCase();
 if(intent&&!['BUY','RFQ','UNKNOWN'].includes(intent))return false;
 const budget=positive(o.price_max)??positive(o.price_min);
 if(c.priceFloor&&budget!==null&&budget<c.priceFloor)return false;
 if(c.quantity&&f.minimumQuantity!==null&&missionText(c.unit)&&missionText(c.unit)===missionText(f.unit)&&f.minimumQuantity>c.quantity)return false;
 return true;
}
/** Compare service prices only for the same declared scope and pricing basis. */
export function compareMissionOffers(a:MissionOffer,b:MissionOffer,c:MissionCriteria):number|null{
 const kind=c.missionKind;if(!kind||kind==='purchase'||kind==='sale')return null;
 const af=missionFacts(a),bf=missionFacts(b);
 if(kind==='opportunity'){
  const completeness=Number(!!bf.conditions)+Number(bf.deadline!==null)-Number(!!af.conditions)-Number(af.deadline!==null);
  if(completeness)return completeness;
  if(af.deadline!==null&&bf.deadline!==null&&af.deadline!==bf.deadline)return af.deadline-bf.deadline;
  return (a.fabric_id<b.fabric_id?-1:a.fabric_id>b.fabric_id?1:0);
 }
 const known=(f:ReturnType<typeof missionFacts>)=>Number(!!f.scope)+Number(!!f.basis)+Number(kind==='project'?f.duration!==null:!!f.availability)+Number(kind==='project'?f.pages!==null:f.visitTotal!==null);
 const completeness=known(bf)-known(af);if(completeness)return completeness;
 const ap=positive(a.price_max)??positive(a.price_min),bp=positive(b.price_max)??positive(b.price_min);
 if(af.basis&&af.basis===bf.basis&&af.scope&&missionText(af.scope)===missionText(bf.scope)&&ap!==null&&bp!==null&&ap!==bp)return ap-bp;
 return (a.fabric_id<b.fabric_id?-1:a.fabric_id>b.fabric_id?1:0);
}
export function opportunityWatchOnly(value:unknown){const m=value&&typeof value==='object'?value as Record<string,unknown>:{};return m.discovery_kind==='opportunity';}
export function opportunityWatchPlan(metadata:Record<string,unknown>,rows:MissionOffer[],intervalMinutes:number,now=Date.now()){
 const selection=rows.slice(0,4).map(r=>({fabric_id:r.fabric_id,subject:r.subject??'',deadline:missionDeadline(r)}));
 const previous=Array.isArray(metadata.latest_selection)?metadata.latest_selection as Array<{fabric_id?:string;deadline?:number|null}>:[];
 const changed=JSON.stringify(previous.map(r=>[r.fabric_id,r.deadline??null]))!==JSON.stringify(selection.map(r=>[r.fabric_id,r.deadline]));
 const imminent=selection.filter(r=>r.deadline!==null&&r.deadline>=now&&r.deadline-now<=48*3600_000).sort((a,b)=>(a.deadline??0)-(b.deadline??0))[0]??null;
 return {selection,changed,imminent,nextAt:new Date(now+Math.max(15,intervalMinutes)*60000).toISOString()};
}
export function missionContactMessage(m:{mode?:string;goal?:string;city?:string;metadata?:Record<string,any>},subject:string){
 const kind=m.metadata?.discovery_kind,context=m.metadata?.mission_context??{},brief=str(context.brief).slice(0,500);
 if(kind==='service')return `Bonjour, WAOUH accompagne une demande pour « ${m.goal??subject} ». Pouvez-vous préciser votre créneau, les frais de déplacement et de diagnostic, puis le devis de réparation ou d’intervention ?${brief?' Besoin : '+brief:''}`;
 if(kind==='project')return `Bonjour, WAOUH accompagne le projet « ${m.goal??subject} ». Pouvez-vous fournir un devis écrit précisant les livrables, le délai, les révisions et les frais récurrents ?${brief?' Brief : '+brief:''}`;
 if(kind==='sale')return `Bonjour, WAOUH accompagne un vendeur dont l’article se rapproche de votre demande « ${subject} ». Pouvez-vous confirmer le modèle, la quantité, votre budget et les modalités de retrait ? Aucun accord n’est encore conclu.`;
 return null;
}
