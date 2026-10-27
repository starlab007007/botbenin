import type { NexusDiscoveryResult } from './nexus';
import { offerKind,offerUnit,offerPrice } from './essentialOffers';
import { choiceAvailable,choiceAvailabilityConfirmed,choiceCost,choicePriceConfirmed,choicePriceNeedsReview,choiceMatches,type ChoiceCriteria } from '../../../supabase/functions/_shared/waouh-offer-choice';

export type GuidedPhase='understanding'|'collecting'|'ready'|'partial'|'paused'|'error';
export function priceReviewOffers(rows:NexusDiscoveryResult[],criteria:ChoiceCriteria){
 if(criteria.mode==='sell'||(criteria.missionKind&&criteria.missionKind!=='purchase'))return [];
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

export {missionCopy,normalizeMissionKind,normalizeMissionContext,missionCriteria,missionFacts} from '../../../supabase/functions/_shared/waouh-mission-domain';
import {missionCopy,missionFacts,missionText,type MissionKind} from '../../../supabase/functions/_shared/waouh-mission-domain';
export type {MissionKind,MissionContext} from '../../../supabase/functions/_shared/waouh-mission-domain';
export function missionOfferView(item:NexusDiscoveryResult,criteria:ChoiceCriteria){
 const kind=criteria.missionKind??'purchase',f=missionFacts(item),money=(n:number)=>`${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n)} ${item.currency&&item.currency!=='XOF'?item.currency:'F CFA'}`;
 const price=offerPrice(item),deadline=f.deadline!==null?new Date(f.deadline).toLocaleDateString('fr-FR',{day:'numeric',month:'long',timeZone:'Africa/Lagos'}):null;
 if(kind==='opportunity')return {value:f.conditions?'Dossier à préparer':'Conditions à préciser',meta:[item.city||'Zone à confirmer',deadline?`Échéance annoncée : ${deadline}`:'Échéance non renseignée'].join(' · '),line:f.conditions||'Admissibilité à confirmer',tag:f.conditions?'Conditions annoncées disponibles':'Conditions à compléter',cover:f.organization||'Publication',coverType:item.category||'Opportunité'};
 if(kind==='service')return {value:f.visitTotal!==null?money(f.visitTotal):f.visit!==null?money(f.visit):price,meta:f.visitTotal!==null?'Visite + diagnostic annoncés':f.visit!==null?'Déplacement annoncé':f.unit?`Tarif annoncé · ${f.unit}`:'Tarif et périmètre à préciser',line:f.visit!==null?'Prix de l’intervention à confirmer':f.scope||'Périmètre et frais à préciser',tag:f.visitTotal!==null?'Frais de visite renseignés':f.scope?'Périmètre annoncé':'Conditions à compléter',cover:f.scope||'Intervention',coverType:item.category||'Service'};
 if(kind==='project')return {value:price,meta:[f.pages!==null?`${f.pages} pages annoncées`:'Livrables à préciser',f.duration!==null?`${f.duration} jours annoncés`:'Délai à préciser'].join(' · '),line:f.exclusions||'Frais et éléments inclus à préciser',tag:f.scope&&f.duration!==null?'Livrables et délai renseignés':'Périmètre à compléter',cover:f.scope||'Prestation',coverType:item.category||'Proposition'};
 if(kind==='sale')return {value:price==='Prix à demander'?'Budget à préciser':price,meta:[f.quantity!==null?`${f.quantity} ${f.unit||'unité(s)'} recherchée(s)`:'Quantité à préciser',item.city||'Zone à confirmer'].join(' · '),line:'Budget annoncé · offre ferme à confirmer',tag:'Demande à qualifier',cover:'Acheteur potentiel',coverType:'Demande annoncée'};
 const cost=choiceCost(item);return {value:price,meta:[item.condition||f.scope,item.city||'Zone à confirmer'].filter(Boolean).join(' · '),line:cost.total!==null?`${money(cost.total)} livré estimés`:'Frais et prix final à préciser',tag:'Prix annoncé · conditions à vérifier',cover:item.subject||'Offre',coverType:item.category||'Produit'};
}
export function domainOfferDecision(item:NexusDiscoveryResult,rows:NexusDiscoveryResult[],criteria:ChoiceCriteria){
 const base=offerDecision(item,rows,criteria),kind=criteria.missionKind??'purchase';if(kind==='purchase')return base;
 const f=missionFacts(item),first=rows[0]?.fabric_id===item.fabric_id,best=rows[0],bf=best?missionFacts(best):null;
 const advantages:string[]=[],pending:string[]=[];const concise=(s:string)=>s.length>180?s.slice(0,177).trim()+'…':s;
 let verdict=first?'La piste que je vous propose de vérifier en premier.':'Une alternative à compléter avant de décider.',reason='';
 if(item.city)advantages.push(`Zone annoncée : ${item.city}.`);
 if(kind==='opportunity'){
  reason='Je rapproche les conditions annoncées de votre besoin. Le profil requis, les pièces et la publication d’origine restent à vérifier avant toute candidature.';
  if(f.conditions)advantages.push(`Conditions annoncées : ${concise(f.conditions)}`);
  if(f.deadline!==null)advantages.push(`Échéance annoncée : ${new Date(f.deadline).toLocaleDateString('fr-FR',{timeZone:'Africa/Lagos'})}.`);
  pending.push('Admissibilité de votre profil à confirmer.','Publication et pièces du dossier à vérifier.');
 }else if(kind==='service'){
  reason=f.visitTotal!==null?'Cette offre distingue les frais de visite et de diagnostic. Ce montant ne constitue pas le prix total de l’intervention.':'Le tarif annoncé ne suffit pas à établir le coût de l’intervention. Je demande un devis sur un périmètre précis.';
  if(f.scope)advantages.push(`Périmètre annoncé : ${concise(f.scope)}.`);
  if(f.availability)advantages.push(`Disponibilité annoncée : ${f.availability}.`);
  pending.push('Créneau, déplacement et diagnostic à confirmer.','Pièces, frais et prix de l’intervention à chiffrer.');
 }else if(kind==='project'){
  reason='Je compare les livrables et le délai avant le seul montant affiché. Les frais récurrents et les conditions écrites restent à préciser.';
  if(!first&&bf&&(!f.scope||missionText(f.scope)!==missionText(bf.scope)))reason='Les périmètres annoncés sont différents ou incomplets. Je demande un devis sur les mêmes livrables pour comparer utilement.';
  if(f.scope)advantages.push(`Livrables annoncés : ${concise(f.scope)}.`);
  if(f.duration!==null)advantages.push(`Délai annoncé : ${f.duration} jours.`);
  if(f.revisions!==null)advantages.push(`Révisions annoncées : ${f.revisions}.`);
  pending.push('Périmètre, révisions et coût complet à confirmer.','Frais récurrents, acompte et échéancier à demander.');
 }else{
  verdict=first?'La demande que je propose de qualifier en premier.':'Une autre demande à qualifier.';reason='Je vérifie l’intérêt pour votre article précis et le montant réellement proposé. Un budget annoncé ne constitue pas une offre ferme.';
  const budget=choiceCost(item).price;if(criteria.priceFloor&&budget!==null&&budget>=criteria.priceFloor)advantages.push('Budget annoncé au-dessus de votre prix plancher.');
  if(f.quantity!==null)advantages.push(`Quantité annoncée : ${f.quantity} ${f.unit||'unité(s)'}.`);
  pending.push('Intérêt pour votre article à confirmer.','Offre ferme et modalités de retrait à préciser.');
 }
 return {...base,verdict,reason,advantages,pending,tag:missionOfferView(item,criteria).tag};
}
