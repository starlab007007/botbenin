import {supabase} from '@/integrations/supabase/client';
export type DealRoom=Record<string,any>;
const ROOM_ERRORS:Record<string,string>={agreement_already_confirmed:'L’accord est déjà confirmé. En cas de souci, utilisez « Signaler un problème ».',authentication_required:'Reconnectez-vous pour retrouver cet échange.',offer_not_found:'Cette offre n’est plus accessible. Reprenez la recherche.',article_unavailable:'Cette offre n’est plus disponible.',mandate_expired:'Le mandat est arrivé à échéance. Définissez un nouveau mandat.',invalid_hours:'Vérifiez les horaires du mandat.',invalid_limits:'Choisissez une durée de 1 à 168 heures et au maximum 2 relances.',complete_quantity_and_payment:'Précisez la quantité et le paiement convenu.',module_unavailable:'Ce module est actuellement indisponible.',takeover_required:'Reprenez la main avant d’écrire ou de proposer.',offer_version_changed:'Les conditions ont changé. Relisez la nouvelle version.',mandate_revision_changed:'Le mandat a changé. Actualisez.',initial_offer_outside_budget:'L’offre de départ doit respecter votre plafond.',forbidden:'Cet échange est privé.',quote_in_xof_required:'Cette offre n’est pas dans un format compatible pour l’instant.',legacy_room_requires_reconciliation:'Un échange historique existe déjà. Sa liaison doit être vérifiée avant de continuer.'};
/** Traduit un code d’erreur interne du Deal Room en message générique, sans jamais exposer le code brut. */
export const roomErrorText=(e:unknown):string=>ROOM_ERRORS[(e as Error)?.message]||'Cette action n’a pas pu être confirmée. Actualisez puis réessayez.';
export async function roomCall(action:string,payload:Record<string,unknown>={}):Promise<DealRoom>{
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Connectez-vous pour ouvrir cet échange.');
 const body={...payload};const read=['get','events','list'].includes(action);
 const key=`waouh.room.request:${session.user.id}:${action}:${JSON.stringify(payload)}`;
 if(!read){body.request_id=localStorage.getItem(key)||crypto.randomUUID();localStorage.setItem(key,String(body.request_id));}
 const {data,error}=await supabase.functions.invoke('waouh-deal-room',{body:{action,payload:body},headers:{Authorization:`Bearer ${session.access_token}`}});
 if((await supabase.auth.getSession()).data.session?.user.id!==session.user.id)throw new Error('Votre compte a changé.');
 if(error||!data?.ok){let code=data?.error;try{code=(await error?.context?.clone().json())?.error||code;}catch{/* keep current error */}throw new Error(code||'Action non confirmée. Réessayez.');}
 if(!read)localStorage.removeItem(key);return data.data;
}
