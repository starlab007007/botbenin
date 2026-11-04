import {supabase} from '@/integrations/supabase/client';
export type DealRoom=Record<string,any>;
export async function roomCall(action:string,payload:Record<string,unknown>={}):Promise<DealRoom>{
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Connectez-vous pour ouvrir cet échange.');
 const body={...payload};const read=['get','events','list'].includes(action);
 const key=`waouh.room.request:${session.user.id}:${action}:${JSON.stringify(payload)}`;
 if(!read){body.request_id=sessionStorage.getItem(key)||crypto.randomUUID();sessionStorage.setItem(key,String(body.request_id));}
 const {data,error}=await supabase.functions.invoke('waouh-deal-room',{body:{action,payload:body},headers:{Authorization:`Bearer ${session.access_token}`}});
 if((await supabase.auth.getSession()).data.session?.user.id!==session.user.id)throw new Error('Votre compte a changé.');
 if(error||!data?.ok){let code=data?.error;try{code=(await error?.context?.clone().json())?.error||code;}catch{/* keep current error */}throw new Error(code||'Action non confirmée. Réessayez.');}
 if(!read)sessionStorage.removeItem(key);return data.data;
}
