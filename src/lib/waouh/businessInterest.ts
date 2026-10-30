import {convergence,type ConvergenceRow} from './convergence';
/** One selected component throughout contact and the initial message; never use route state mid-flight. */
export async function openBusinessInterest(missionId:string,componentId:string,requestId:string,text:string){
 return convergence<ConvergenceRow>('business.open',{mission_id:missionId,component_id:componentId,confirmed:true});
}
export function interestMessage(kind:string){
 return kind==='service'?'Bonjour, je souhaite un devis pour cette prestation.':kind==='announcement'?'Bonjour, je souhaite connaître les modalités de cette opportunité.':'Bonjour, je suis intéressé. Cette offre est-elle disponible ?';
}
export function interestNumber(text:string,count:number):number|null{
 const match=/^int[eé]ress[eé](?:e)?\s+(\d+)\s*[.!]?$/i.exec(text.trim());
 if(!match)return null;const n=Number(match[1]);return Number.isSafeInteger(n)&&n>=1&&n<=count?n-1:null;
}
