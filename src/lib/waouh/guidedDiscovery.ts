import type { NexusDiscoveryResult } from './nexus';
import { offerKind,offerUnit } from './essentialOffers';
import { choiceAvailable,choiceAvailabilityConfirmed,choiceCost,choicePriceConfirmed,choicePriceNeedsReview,choiceMatches,type ChoiceCriteria } from '../../../supabase/functions/_shared/waouh-offer-choice';

export type GuidedPhase='understanding'|'collecting'|'ready'|'partial'|'paused'|'error';
export function priceReviewOffers(rows:NexusDiscoveryResult[],criteria:ChoiceCriteria){
 if(criteria.mode==='sell')return [];
 const eligible=rows.filter(o=>choiceMatches(o,criteria));
 return eligible.filter(o=>choicePriceNeedsReview(o,eligible));
}
export function offerFacts(item:NexusDiscoveryResult){
 const e=item.evidence??{};
 const text=(key:string)=>typeof e[key]==='string'?(e[key] as string).trim():'';
 return {condition:item.condition||text('condition'),warranty:text('warranty')||text('guarantee'),unit:offerUnit(item),description:text('description'),observed:item.observed_at,source:item.source_url};
}
export function offerDecision(item:NexusDiscoveryResult,rows:NexusDiscoveryResult[],criteria:ChoiceCriteria){
 const first=item.fabric_id===rows[0]?.fabric_id,cost=choiceCost(item),best=rows[0],kind=offerKind(item),facts=offerFacts(item);
 const known=choicePriceConfirmed(item)&&choiceAvailabilityConfirmed(item);
 const money=(v:number)=>`${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(v)} F CFA`;
 let verdict=first?'Mon premier choix, sous réserve de vérification.':'Une alternative à examiner.';
 let reason=kind==='service'?'Je rapproche cette piste de votre besoin. Le périmètre et le créneau restent à confirmer.':kind==='announcement'?'Je rapproche cette opportunité de votre besoin. Les conditions et la validité restent à confirmer.':'Cette piste correspond aux critères renseignés. Je vérifie les conditions avant tout accord.';
 if(known){verdict=first?'Mon premier choix parmi les offres comparées.':'Une alternative aux informations confirmées.';reason='Le prix et la disponibilité sont confirmés dans les informations reçues. Les autres conditions restent à vérifier.';}
 else if(cost.total!==null&&criteria.mode!=='sell')reason='Le coût livré est renseigné. Je vérifie le stock, l’état réel et les conditions annoncées.';
 if(!first&&best){const base=choiceCost(best);if(base.total!==null&&cost.total!==null&&cost.total>base.total)reason=`Le coût livré annoncé est supérieur de ${money(cost.total-base.total)} à mon premier choix. Je vérifie ce qui peut justifier cet écart.`;else if(base.price!==null&&cost.price!==null&&cost.price<base.price&&cost.delivery===null)reason='Le prix affiché est inférieur à mon premier choix, mais les frais manquants empêchent de conclure sur le coût final.';}
 if(criteria.mode==='sell'){verdict=first?'Une demande à qualifier en priorité.':'Une autre demande à qualifier.';reason='Cette demande se rapproche de votre article. Le budget annoncé ne constitue pas encore une offre ferme.';}
 const advantages=[criteria.city&&item.city?`Localisation annoncée : ${item.city}.`:null,cost.total!==null&&criteria.budget&&cost.total<=criteria.budget?`${money(criteria.budget-cost.total)} sous votre plafond, selon les montants annoncés.`:null,facts.warranty?`Garantie annoncée : ${facts.warranty}.`:null].filter(Boolean) as string[];
 const pending=criteria.mode==='sell'?['Quantité, budget et modalités à confirmer.','Intérêt pour votre article à vérifier avant tout accord.']:[!choiceAvailabilityConfirmed(item)?choiceAvailable(item)?'Disponibilité annoncée, à confirmer.':'Disponibilité à confirmer.':null,!choicePriceConfirmed(item)?'Prix final et unité à confirmer.':null,kind==='service'?'Périmètre, créneau et conditions à préciser.':kind==='announcement'?'Validité et conditions de participation à vérifier.':'État réel et garantie écrite à vérifier.'].filter(Boolean) as string[];
 const tag=criteria.mode==='sell'?'Demande à qualifier':known?'Prix et disponibilité confirmés':cost.total!==null?'Coût livré renseigné':cost.price!==null?'Prix annoncé · conditions à vérifier':'Conditions à préciser';
 return {verdict,reason,advantages,pending,tag,cost,facts};
}
