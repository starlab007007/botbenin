import type { WaouhResultCard } from '@/components/waouh/WaouhProductCard';
import type { GuidedKind } from './guidedAsk';
import { offerJourney } from './offerJourney';
import { resultKind } from './convergence';
import { briefMatch, briefMoney, briefPrice } from './chatMarketBrief';
import { sourceDisplayName } from './sourcePresentation';
import { missionFacts } from '../../../supabase/functions/_shared/waouh-mission-domain';
export type PriorityFact = { label:string; value:string; missing:boolean };
export function priorityFacts(row:WaouhResultCard,kind?:GuidedKind,query?:string|null):PriorityFact[]{
 const raw=row as unknown as Record<string,unknown>, e=row.evidence??{};
 const txt=(...keys:string[])=>keys.map(k=>raw[k]??e[k]).map(v=>typeof v==='string'?v.trim():typeof v==='number'&&Number.isFinite(v)?String(v):Array.isArray(v)?v.filter(x=>typeof x==='string').join(' · '):'').find(Boolean)||'';
 const money=(...keys:string[])=>{const v=txt(...keys);const n=Number(v);return v&&Number.isFinite(n)&&n>0?briefMoney(n):''};
 const f=missionFacts({...row,fabric_id:row.fabric_id??''});
 const fact=(label:string,value:string|null|undefined):PriorityFact=>({label,value:value||'À confirmer',missing:!value});
 const journey=offerJourney(kind,resultKind(row));
 const price=briefPrice(row);
 const source=(()=>{try{return row.source_url?new URL(row.source_url).hostname.replace(/^www\./,''):row.source?sourceDisplayName(row.source):''}catch{return row.source?sourceDisplayName(row.source):''}})();
 const availability=txt('availability','stock_status','available_at','time_slot')||(raw.in_stock===true||e.in_stock===true?'En stock':raw.in_stock===false||e.in_stock===false?'Indisponible':'');
 if(journey==='sale')return [fact('Budget acheteur',price===null?'':briefMoney(price)),fact('Quantité',txt('quantity','requested_quantity')),fact('Prix plancher',money('price_floor')),fact('Localisation',row.city)];
 if(journey==='opportunity')return [fact('Organisme',f.organization||txt('organization','organizer')),fact('Échéance',f.deadline===null?'':new Date(f.deadline).toLocaleDateString('fr-FR',{timeZone:'Africa/Porto-Novo'})),fact('Éligibilité',f.conditions||txt('eligibility')),fact('Dossier',txt('required_documents','application_documents','application_requirements'))];
 if(journey==='service')return [fact('Périmètre',f.scope||txt('scope')),fact('Tarif',price===null?'':briefMoney(price)),fact('Qualifications',txt('qualifications','certifications','experience')),fact('Garantie',f.warranty||txt('warranty','guarantee'))];
 if(journey==='project')return [fact('Créneau',f.availability||availability),fact('Délai',f.duration===null?'':f.duration+' j'),fact('Livrables',txt('deliverables','scope')||f.scope),fact('Lieu',row.city),fact('Coût total',money('total_cost','total_price'))];
 if(kind==='trouver'||kind==='demander'){const match=briefMatch(row,query);return [fact('Correspondance',match==='exact'?'Exacte':match==='near'?'Piste proche':''),fact('Localisation',row.city),fact('Source',source),fact('Disponibilité',availability)];}
 return [fact('État',row.condition||txt('condition')),fact('Stock',availability),fact('Livraison',txt('delivery_mode','delivery','delivery_options')||money('delivery_fee')),fact('Vendeur',txt('seller_name','seller_label','provider_name')||f.organization)];
}
